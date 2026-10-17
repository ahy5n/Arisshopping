import * as local from "./catalogue-db";
import type { Product } from "./types";

// Where the website reads the product index from:
//   - Supabase, when SUPABASE_URL + SUPABASE_ANON_KEY are set (the live site)
//   - otherwise the local SQLite file the crawl writes (development)
// Both return the same Product shape, so callers don't care which.

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_ANON_KEY;
export const usingSupabase = Boolean(URL_ && KEY);
// new-style sb_publishable_ keys go in `apikey` only; old JWT anon keys also need the Bearer header
const AUTH: Record<string, string> = KEY ? { apikey: KEY, ...(KEY.startsWith("eyJ") ? { authorization: `Bearer ${KEY}` } : {}) } : {};

type Row = {
  id: string; retailer_id: string; retailer_name: string; external_id: string | null; url: string; title: string; brand: string | null;
  category: Product["category"]; colour_raw: string | null; colour_family: Product["colourFamily"]; price_gbp: number | string;
  was_price_gbp: number | string | null; sizes_in_stock: string[] | null; images: string[] | null; is_resale: boolean;
};

function toProduct(r: Row, rank: number): Product {
  return {
    id: r.id,
    title: r.title,
    brand: r.brand ?? r.retailer_name,
    category: r.category,
    colourRaw: r.colour_raw ?? "",
    colourFamily: r.colour_family,
    images: r.images ?? [],
    isResale: r.is_resale,
    rank,
    offers: [
      {
        retailerId: r.retailer_id,
        retailerName: r.retailer_name,
        externalId: r.external_id ?? undefined,
        url: r.url,
        priceGbp: Number(r.price_gbp),
        wasPriceGbp: r.was_price_gbp == null ? undefined : Number(r.was_price_gbp),
        sizesInStock: r.sizes_in_stock ?? [],
      },
    ],
  };
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${URL_}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { ...AUTH, "content-type": "application/json" },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(6000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`supabase ${fn} ${res.status}: ${(await res.text()).slice(0, 120)}`);
  return res.json() as Promise<T>;
}

/** Rank within each shop, so "best match" can interleave shops fairly. */
function perShopRank(rows: Row[]) {
  const n = new Map<string, number>();
  return rows.map((r) => {
    const i = n.get(r.retailer_id) ?? 0;
    n.set(r.retailer_id, i + 1);
    return toProduct(r, i);
  });
}

export async function searchIndex(q: string, limit = 400): Promise<Product[]> {
  if (!usingSupabase) return local.searchIndex(q, limit);
  if (!q.trim()) return [];
  return perShopRank(await rpc<Row[]>("search_products", { q, lim: limit }));
}

export async function getProduct(id: string): Promise<Product | null> {
  if (!usingSupabase) return local.getProduct(id);
  const res = await fetch(`${URL_}/rest/v1/products?id=eq.${encodeURIComponent(id)}&limit=1`, {
    headers: AUTH,
    signal: AbortSignal.timeout(6000),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as Row[];
  return rows[0] ? toProduct(rows[0], 0) : null;
}

export async function similarTo(p: Product, limit = 12): Promise<Product[]> {
  if (!usingSupabase) return local.similarTo(p, limit);
  const rows = await rpc<Row[]>("similar_products", {
    p_id: p.id,
    p_title: p.title,
    p_category: p.category,
    p_colour: p.colourFamily,
    p_price: p.offers[0].priceGbp,
    lim: limit * 2,
  });
  const ids = new Set(p.offers.map((o) => `${o.retailerId}:${o.externalId}`));
  const titles = new Set([p.title.toLowerCase()]);
  const out: Product[] = [];
  for (const r of rows) {
    if (ids.has(r.id) || titles.has(r.title.toLowerCase())) continue;
    titles.add(r.title.toLowerCase());
    out.push(toProduct(r, out.length));
    if (out.length >= limit) break;
  }
  return out;
}
