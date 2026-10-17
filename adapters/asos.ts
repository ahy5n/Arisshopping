import { toCategory, toColourFamily } from "../lib/normalise";
import type { Product, RetailerAdapter } from "../lib/types";
import { cached, politeFetch } from "./http";

// ASOS renders its search results into the page as a product list. It isn't
// strict JSON (JS escapes), so each product object is read field by field.
// ASOS also stocks Bershka, Mango, Monki, New Look and hundreds of other brands.

const SITE = "https://www.asos.com";

const field = (obj: string, key: string) => {
  const m = obj.match(new RegExp(`"${key}":("(?:[^"\\\\]|\\\\.)*"|-?[\\d.]+|null|true|false)`));
  if (!m) return undefined;
  const raw = m[1];
  if (raw.startsWith('"')) return raw.slice(1, -1).replace(/\\u002F/gi, "/").replace(/\\(["\\/])/g, "$1");
  return raw === "null" ? undefined : raw;
};

export function parseAsos(html: string, limit = 72): Product[] {
  const start = html.indexOf('"products":[{"id"');
  if (start < 0) return [];
  // each product object starts with {"id":<n>,"productCode"
  const chunks = html.slice(start).split(/(?=\{"id":\d+,"productCode")/).slice(1);
  const out: Product[] = [];
  for (const c of chunks) {
    const obj = c.slice(0, 3000);
    const id = field(obj, "id");
    const url = field(obj, "url");
    const title = field(obj, "description");
    const price = Number(field(obj, "price"));
    if (!id || !url || !title || !price) continue;
    const reduced = Number(field(obj, "reducedPrice") ?? NaN);
    const now = reduced > 0 && reduced < price ? reduced : price;
    const brand = field(obj, "brandName") ?? "ASOS";
    const colour = field(obj, "colour") ?? "";
    const image = field(obj, "image");
    const category = toCategory(undefined, title);
    out.push({
      id: `asos:${id}`,
      title: title.startsWith(brand) ? title.slice(brand.length).trim().replace(/^./, (s) => s.toUpperCase()) : title,
      brand,
      category,
      colourRaw: colour,
      colourFamily: toColourFamily(colour || title),
      images: image ? [`https://${image}?$n_640w$&wid=600&fit=constrain`] : [],
      isResale: false,
      rank: out.length,
      offers: [
        {
          retailerId: "asos",
          retailerName: "ASOS",
          externalId: id,
          url: `${SITE}/${url}`,
          priceGbp: now,
          wasPriceGbp: now < price ? price : undefined,
          sizesInStock: [],
        },
      ],
    });
    if (out.length >= limit) break;
  }
  return out;
}

const adapter: RetailerAdapter = {
  id: "asos",
  name: "ASOS",
  tier: "high-street",
  mode: "live",
  async search({ q, limit = 40 }) {
    if (!q.trim()) return [];
    try {
      return await cached(`asos:${limit}:${q.toLowerCase()}`, async () => {
        const res = await politeFetch(`${SITE}/search/?q=${encodeURIComponent(q).replace(/%20/g, "+")}`, { headers: { accept: "text/html" } });
        if (!res.ok) throw new Error(`asos ${res.status}`);
        return parseAsos(await res.text(), limit);
      });
    } catch (e) {
      console.warn("[asos]", (e as Error).message);
      return [];
    }
  },
};

export default adapter;
