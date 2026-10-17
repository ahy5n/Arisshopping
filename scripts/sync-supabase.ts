/**
 * Uploads the local catalogue (data/catalogue.db, filled by scripts/crawl.ts)
 * to Supabase, so the live site can search it.
 *
 * Needs SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local. The secret key
 * can write to the database: it stays on this Mac and never goes to Vercel.
 *
 *   npx tsx scripts/sync-supabase.ts
 */
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
  const db = new DatabaseSync(DB, { readOnly: true });
  const cutoff = new Date(Date.now() - 14 * 864e5).toISOString();
  const rows = db.prepare("select * from products where last_seen_at >= ? order by rowid").all(cutoff) as Row[];
  console.log(`uploading ${rows.length.toLocaleString()} products…`);

  const t0 = Date.now();
  for (let i = 0; i < rows.length; i += BATCH) {
    const body = rows.slice(i, i + BATCH).map((r) => ({
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
      last_seen_at: r.last_seen_at,
    }));
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
    if ((i / BATCH) % 20 === 0) console.log(`  ${(i + body.length).toLocaleString()} / ${rows.length.toLocaleString()}`);
  }

  const pruned = await (await call("/rest/v1/rpc/prune_stale", { method: "POST", body: "{}" })).json();
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)}s · ${pruned} stale products removed from Supabase`);
}

main().catch((e) => {
  console.error("sync failed:", (e as Error).message);
  process.exit(1);
});
