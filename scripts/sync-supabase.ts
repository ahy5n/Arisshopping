/**
 * Uploads the local catalogue (data/catalogue.db, filled by scripts/crawl.ts)
 * to Supabase, so the live site can search it.
 *
 * Only products that changed since the last upload are sent, and products the
 * shops have dropped are deleted. Re-sending everything every time left
 * hundreds of MB of dead rows in Postgres (the free plan allows 500 MB).
 *
 * Needs SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local. The secret key
 * can write to the database: it stays on this Mac and never goes to Vercel.
 *
 *   npx tsx scripts/sync-supabase.ts
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const URL_ = process.env.SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const DB = process.env.CATALOGUE_DB ?? "data/catalogue.db";
const BATCH = 1000;

type Row = {
  id: string; retailer_id: string; retailer_name: string; external_id: string | null; url: string; title: string; brand: string | null;
  category: string | null; colour_raw: string | null; colour_family: string | null; price_gbp: number; was_price_gbp: number | null;
  sizes_in_stock: string | null; images: string | null; is_resale: number; last_seen_at: string;
};

async function call(path: string, init: RequestInit) {
  const res = await fetch(`${URL_}${path}`, {
    ...init,
    // new-style sb_secret_ keys go in `apikey` only; old JWT keys also need the Bearer header
    headers: { apikey: SECRET!, ...(SECRET!.startsWith("eyJ") ? { authorization: `Bearer ${SECRET}` } : {}), "content-type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`${path} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res;
}

async function main() {
  if (!URL_ || !SECRET) {
    console.error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
    process.exit(1);
  }
  if (!existsSync(DB)) {
    console.error(`No catalogue at ${DB}. Run npm run crawl first.`);
    process.exit(1);
  }
  const db = new DatabaseSync(DB);
  // what we last sent for each product (a fingerprint of the row)
  db.exec("create table if not exists sync_state (id text primary key, hash text not null)");
  const cutoff = new Date(Date.now() - 14 * 864e5).toISOString();
  const rows = db.prepare("select * from products where last_seen_at >= ? order by rowid").all(cutoff) as Row[];

  const toRemote = (r: Row) => ({
    id: r.id,
    retailer_id: r.retailer_id,
    retailer_name: r.retailer_name,
    external_id: r.external_id,
    url: r.url,
    title: r.title,
    brand: r.brand,
    category: r.category,
    colour_raw: r.colour_raw,
    colour_family: r.colour_family,
    price_gbp: Math.round(r.price_gbp * 100) / 100,
    was_price_gbp: r.was_price_gbp == null ? null : Math.round(r.was_price_gbp * 100) / 100,
    sizes_in_stock: JSON.parse(r.sizes_in_stock ?? "[]"),
    images: (JSON.parse(r.images ?? "[]") as string[]).slice(0, 3), // 3 pictures is plenty and keeps the free tier roomy
    is_resale: r.is_resale === 1,
  });
  const hashOf = (o: object) => createHash("sha1").update(JSON.stringify(o)).digest("base64");

  const known = new Map((db.prepare("select id, hash from sync_state").all() as { id: string; hash: string }[]).map((x) => [x.id, x.hash]));
  const save = db.prepare("insert into sync_state (id, hash) values (?, ?) on conflict(id) do update set hash = excluded.hash");

  // First run with this logic, right after a full upload: just remember what's there.
  if (known.size === 0 && process.env.SYNC_FULL !== "1") {
    db.exec("begin");
    for (const r of rows) save.run(r.id, hashOf(toRemote(r)));
    db.exec("commit");
    console.log(`recorded ${rows.length.toLocaleString()} products as already uploaded (set SYNC_FULL=1 to force a full upload)`);
    return;
  }

  const t0 = Date.now();
  const changed = rows.map((r) => ({ r, remote: toRemote(r) })).map((x) => ({ ...x, hash: hashOf(x.remote) })).filter((x) => known.get(x.r.id) !== x.hash);
  console.log(`${rows.length.toLocaleString()} products · ${changed.length.toLocaleString()} new or changed to upload`);

  for (let i = 0; i < changed.length; i += BATCH) {
    const slice = changed.slice(i, i + BATCH);
    const now = new Date().toISOString();
    const body = slice.map((x) => ({ ...x.remote, last_seen_at: now }));
    for (let attempt = 1; ; attempt++) {
      try {
        await call("/rest/v1/products?on_conflict=id", {
          method: "POST",
          headers: { prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify(body),
        });
        break;
      } catch (e) {
        if (attempt >= 3) throw e;
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
    db.exec("begin");
    for (const x of slice) save.run(x.r.id, x.hash);
    db.exec("commit");
    if ((i / BATCH) % 20 === 0) console.log(`  ${(i + slice.length).toLocaleString()} / ${changed.length.toLocaleString()}`);
  }

  // products the shops no longer list (not seen for 14 days): remove them online too
  const current = new Set(rows.map((r) => r.id));
  const gone = [...known.keys()].filter((id) => !current.has(id));
  for (let i = 0; i < gone.length; i += 150) {
    const ids = gone.slice(i, i + 150);
    const list = ids.map((id) => `"${id.replace(/"/g, '\\"')}"`).join(",");
    await call(`/rest/v1/products?id=in.(${encodeURIComponent(list)})`, { method: "DELETE", headers: { prefer: "return=minimal" } });
    db.exec("begin");
    for (const id of ids) db.prepare("delete from sync_state where id = ?").run(id);
    db.exec("commit");
  }
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)}s · ${changed.length.toLocaleString()} uploaded · ${gone.length.toLocaleString()} removed`);
}

main().catch((e) => {
  console.error("sync failed:", (e as Error).message);
  process.exit(1);
});
