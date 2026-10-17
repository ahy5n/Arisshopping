import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import type { Product } from "./types";

// The product index: everything the nightly crawl has seen, searchable
// instantly. Local SQLite file for now; brief §9 maps 1:1 onto Supabase
// (products, price_history, retailers) when it's time to deploy.

const PATH = resolve(process.env.CATALOGUE_DB ?? "data/catalogue.db");
const KEEP_DAYS = 14;

let db: DatabaseSync | null = null;

// Loaded lazily: node:sqlite only exists on Node 22+, and the site must still work without the index.
const sqlite = (process as unknown as { getBuiltinModule?: (id: string) => typeof import("node:sqlite") | undefined }).getBuiltinModule?.("node:sqlite");

/** The crawl creates the file; the website only ever reads one that exists (none on a fresh deploy). */
export const indexAvailable = () => Boolean(sqlite) && (Boolean(db) || existsSync(PATH));

function open() {
  if (db) return db;
  mkdirSync(dirname(PATH), { recursive: true });
  if (!sqlite) throw new Error("node:sqlite needs Node 22 or newer");
  db = new sqlite.DatabaseSync(PATH);
  db.exec(`
    pragma journal_mode = wal;
    pragma synchronous = normal;
    create table if not exists products (
      id text primary key,
      retailer_id text not null,
      retailer_name text not null,
      external_id text,
      url text not null,
      title text not null,
      brand text,
      category text,
      colour_raw text,
      colour_family text,
      price_gbp real not null,
      was_price_gbp real,
      sizes_in_stock text,     -- JSON array
      images text,             -- JSON array
      is_resale integer not null default 0,
      description text,
      first_seen_at text not null,
      last_seen_at text not null
    );
    create index if not exists products_retailer on products(retailer_id);
    create index if not exists products_seen on products(last_seen_at);
    create virtual table if not exists products_fts using fts5(
      title, brand, colour_raw, category, content='products', content_rowid='rowid', tokenize='porter unicode61'
    );
    create trigger if not exists products_ai after insert on products begin
      insert into products_fts(rowid, title, brand, colour_raw, category) values (new.rowid, new.title, new.brand, new.colour_raw, new.category);
    end;
    create trigger if not exists products_ad after delete on products begin
      insert into products_fts(products_fts, rowid, title, brand, colour_raw, category) values ('delete', old.rowid, old.title, old.brand, old.colour_raw, old.category);
    end;
    create trigger if not exists products_au after update of title, brand, colour_raw, category on products begin
      insert into products_fts(products_fts, rowid, title, brand, colour_raw, category) values ('delete', old.rowid, old.title, old.brand, old.colour_raw, old.category);
      insert into products_fts(rowid, title, brand, colour_raw, category) values (new.rowid, new.title, new.brand, new.colour_raw, new.category);
    end;
    create table if not exists price_history (
      product_id text not null,
      price_gbp real not null,
      seen_at text not null
    );
    create index if not exists price_history_product on price_history(product_id, seen_at);
    create table if not exists crawl_runs (
      retailer_id text not null,
      started_at text not null,
      finished_at text,
      products integer,
      error text
    );
  `);
  return db;
}

/** Insert or refresh products; logs a price_history row whenever the price changes. */
export function upsertProducts(items: Product[]) {
  const d = open();
  const now = new Date().toISOString();
  const prev = d.prepare("select price_gbp from products where id = ?");
  const up = d.prepare(`
    insert into products (id, retailer_id, retailer_name, external_id, url, title, brand, category, colour_raw, colour_family,
      price_gbp, was_price_gbp, sizes_in_stock, images, is_resale, description, first_seen_at, last_seen_at)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    on conflict(id) do update set
      url = excluded.url, title = excluded.title, brand = excluded.brand, category = excluded.category,
      colour_raw = excluded.colour_raw, colour_family = excluded.colour_family, price_gbp = excluded.price_gbp,
      was_price_gbp = excluded.was_price_gbp,
      sizes_in_stock = case when excluded.sizes_in_stock = '[]' then products.sizes_in_stock else excluded.sizes_in_stock end,
      images = case when excluded.images = '[]' then products.images else excluded.images end,
      is_resale = excluded.is_resale, description = coalesce(excluded.description, products.description),
      last_seen_at = excluded.last_seen_at
  `);
  const hist = d.prepare("insert into price_history (product_id, price_gbp, seen_at) values (?, ?, ?)");
  d.exec("begin");
  try {
    for (const p of items) {
      const o = p.offers[0];
      const before = prev.get(p.id) as { price_gbp: number } | undefined;
      up.run(
        p.id, o.retailerId, o.retailerName, o.externalId ?? null, o.url, p.title, p.brand, p.category, p.colourRaw, p.colourFamily,
        o.priceGbp, o.wasPriceGbp ?? null, JSON.stringify(o.sizesInStock), JSON.stringify(p.images), p.isResale ? 1 : 0,
        p.description ?? null, now, now,
      );
      if (!before || before.price_gbp !== o.priceGbp) hist.run(p.id, o.priceGbp, now);
    }
    d.exec("commit");
  } catch (e) {
    d.exec("rollback");
    throw e;
  }
}

type Row = {
  id: string; retailer_id: string; retailer_name: string; external_id: string | null; url: string; title: string; brand: string;
  category: Product["category"]; colour_raw: string; colour_family: Product["colourFamily"]; price_gbp: number; was_price_gbp: number | null;
  sizes_in_stock: string; images: string; is_resale: number; description: string | null;
};

function toProduct(r: Row, rank: number): Product {
  return {
    id: r.id,
    title: r.title,
    brand: r.brand,
    category: r.category,
    colourRaw: r.colour_raw ?? "",
    colourFamily: r.colour_family,
    images: JSON.parse(r.images ?? "[]"),
    isResale: r.is_resale === 1,
    description: r.description ?? undefined,
    rank,
    offers: [
      {
        retailerId: r.retailer_id,
        retailerName: r.retailer_name,
        externalId: r.external_id ?? undefined,
        url: r.url,
        priceGbp: r.price_gbp,
        wasPriceGbp: r.was_price_gbp ?? undefined,
        sizesInStock: JSON.parse(r.sizes_in_stock ?? "[]"),
      },
    ],
  };
}

/** Full-text search over the index. Every word must match (prefixes allowed); best matches first. */
export function searchIndex(q: string, limit = 400): Product[] {
  if (!indexAvailable()) return [];
  const words = q.toLowerCase().match(/[\p{L}\p{N}]+/gu)?.filter((w) => w.length > 1) ?? [];
  if (!words.length) return [];
  const d = open();
  const match = words.map((w) => `"${w}"*`).join(" ");
  try {
    const rows = d
      .prepare(
        `select p.* from products_fts f join products p on p.rowid = f.rowid
         where products_fts match ? order by bm25(products_fts, 10.0, 4.0, 2.0, 1.0) limit ?`,
      )
      .all(match, limit) as Row[];
    // rank within each shop, so "best match" can interleave shops fairly
    const perShop = new Map<string, number>();
    return rows.map((r) => {
      const n = perShop.get(r.retailer_id) ?? 0;
      perShop.set(r.retailer_id, n + 1);
      return toProduct(r, n);
    });
  } catch {
    return [];
  }
}

export function recordCrawl(retailerId: string, startedAt: string, products: number, error?: string) {
  open()
    .prepare("insert into crawl_runs (retailer_id, started_at, finished_at, products, error) values (?, ?, ?, ?, ?)")
    .run(retailerId, startedAt, new Date().toISOString(), products, error ?? null);
}

/** Brief §9: drop indexed products not seen for 14 days. */
export function pruneStale() {
  const cutoff = new Date(Date.now() - KEEP_DAYS * 864e5).toISOString();
  return Number(open().prepare("delete from products where last_seen_at < ?").run(cutoff).changes);
}

export function indexStats() {
  const d = open();
  const total = (d.prepare("select count(*) n from products").get() as { n: number }).n;
  const byShop = d.prepare("select retailer_id id, count(*) n from products group by retailer_id order by n desc").all() as { id: string; n: number }[];
  return { total, byShop };
}

export function getProduct(id: string): Product | null {
  if (!indexAvailable()) return null;
  const r = open().prepare("select * from products where id = ?").get(id) as Row | undefined;
  return r ? toProduct(r, 0) : null;
}

/** Brief §6.5: same category and colour family, similar price band, ranked by title similarity. */
export function similarTo(p: Product, limit = 12): Product[] {
  if (!indexAvailable()) return [];
  const d = open();
  const price = p.offers[0].priceGbp;
  const seen = new Set([p.id, ...p.offers.map((o) => `${o.retailerId}:${o.externalId}`)]);
  const words = (p.title.toLowerCase().match(/[a-z]{3,}/g) ?? []).filter((w) => !["women", "womens", "with", "and", "the"].includes(w));
  const params = [p.category, p.colourFamily, price * 0.6, price * 1.6];
  let rows: Row[] = [];
  if (words.length) {
    try {
      rows = d
        .prepare(
          `select p.* from products_fts f join products p on p.rowid = f.rowid
           where products_fts match ? and p.category = ? and p.colour_family = ? and p.price_gbp between ? and ?
           order by bm25(products_fts, 10.0, 1.0, 1.0, 1.0) limit ?`,
        )
        .all(words.map((w) => `"${w}"`).join(" OR "), ...params, limit * 3) as Row[];
    } catch {}
  }
  if (rows.length < limit) {
    rows = rows.concat(
      d
        .prepare(`select * from products where category = ? and colour_family = ? and price_gbp between ? and ? order by abs(price_gbp - ?) limit ?`)
        .all(...params, price, limit * 3) as Row[],
    );
  }
  const out: Product[] = [];
  const titles = new Set([p.title.toLowerCase()]);
  for (const r of rows) {
    if (seen.has(r.id) || titles.has(r.title.toLowerCase())) continue;
    seen.add(r.id);
    titles.add(r.title.toLowerCase());
    out.push(toProduct(r, out.length));
    if (out.length >= limit) break;
  }
  return out;
}
