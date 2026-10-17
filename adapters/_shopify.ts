import { COLOURS } from "../lib/catalogue";
import { sortSizes, stripHtml, toCategory, toColourFamily, toSize } from "../lib/normalise";
import type { Product, RetailerAdapter, Tier } from "../lib/types";
import { cached, politeFetch } from "./http";

// Any Shopify store: the public predictive-search JSON its own search box uses.
// Caps at 10 products and has no sizes; the nightly crawl (phase 4) reads
// /products.json to fill sizes in.

type Hit = {
  id: number;
  title: string;
  handle: string;
  vendor: string;
  type: string;
  price: string;
  compare_at_price_max: string;
  image: string | null;
  available: boolean;
  tags?: string[];
  body?: string;
};

type Opts = { id: string; name: string; tier: Tier; origin: string };

const COLOUR_WORDS = new RegExp(`\\b(${[...COLOURS.map((c) => c.label.toLowerCase()), "ivory", "ecru", "sage", "khaki", "burgundy", "lilac", "camel", "chocolate", "gold", "silver", "leopard", "floral"].join("|")})\\b`, "i");

/** "Lace Maxi Dress in Black" → "Black"; otherwise a colour tag or a colour word in the title */
function colourOf(h: Hit) {
  const inX = h.title.match(/\bin ([A-Za-z][A-Za-z\s/-]{1,24})$/);
  if (inX) return inX[1].trim();
  const tag = h.tags?.find((t) => /^(colou?r)[:_-]/i.test(t));
  if (tag) return tag.replace(/^(colou?r)[:_-]\s*/i, "");
  return h.title.match(COLOUR_WORDS)?.[1] ?? "";
}

// ---- whole-catalogue crawl: /products.json, 250 at a time ----

type FullProduct = {
  id: number;
  title: string;
  handle: string;
  vendor: string;
  product_type: string;
  tags: string[] | string;
  body_html?: string;
  options: { name: string; position: number; values: string[] }[];
  variants: { price: string; compare_at_price: string | null; available: boolean; option1: string | null; option2: string | null; option3: string | null }[];
  images: { src: string }[];
};

const MENS = /\b(men'?s?|menswear|mens-|male)\b/i;
const WOMENS = /\b(women'?s?|womenswear|ladies|female)\b/i;

function fromFull(p: FullProduct, o: Opts, resale: boolean): Product | null {
  const tags = (Array.isArray(p.tags) ? p.tags : String(p.tags).split(",")).join(" ");
  // multi-brand stores (Browns, Fenwick) also sell menswear and homeware
  if (MENS.test(`${p.product_type} ${tags}`) && !WOMENS.test(`${p.product_type} ${tags}`)) return null;
  const live = p.variants.filter((v) => v.available);
  if (!live.length) return null;
  const optIdx = (re: RegExp) => p.options.findIndex((x) => re.test(x.name));
  const sizeAt = optIdx(/size/i);
  const colourAt = optIdx(/colou?r/i);
  const val = (v: FullProduct["variants"][number], i: number) => (i === 0 ? v.option1 : i === 1 ? v.option2 : v.option3);
  const price = Math.min(...live.map((v) => parseFloat(v.price)));
  const cheapestV = live.find((v) => parseFloat(v.price) === price)!;
  const was = parseFloat(cheapestV.compare_at_price ?? "");
  const colourRaw = (colourAt >= 0 ? val(live[0], colourAt) : null) ?? colourOf({ title: p.title, tags: Array.isArray(p.tags) ? p.tags : [] } as Hit);
  const category = toCategory(p.product_type, p.title);
  return {
    id: `${o.id}:${p.id}`,
    title: p.title.replace(/\s+in [A-Za-z\s/-]+$/, "").replace(/\s+-\s+[^-]+$/, (m) => (m.length < 40 ? "" : m)),
    brand: p.vendor && !/\d/.test(p.vendor) ? p.vendor : o.name,
    category,
    colourRaw: colourRaw ?? "",
    colourFamily: toColourFamily(colourRaw || p.title),
    images: p.images.slice(0, 5).map((i) => `${i.src}${i.src.includes("?") ? "&" : "?"}width=600`),
    isResale: resale,
    description: stripHtml(p.body_html).slice(0, 600) || undefined,
    offers: [
      {
        retailerId: o.id,
        retailerName: o.name,
        externalId: String(p.id),
        url: `${o.origin}/products/${p.handle}`,
        priceGbp: price,
        wasPriceGbp: was > price ? was : undefined,
        sizesInStock: sizeAt >= 0 ? sortSizes(live.map((v) => val(v, sizeAt)).filter((x): x is string => Boolean(x)).map((x) => toSize(x, category))) : [],
      },
    ],
  };
}

export function shopifyAdapter(o: Opts): RetailerAdapter {
  const resale = o.tier === "resale";
  return {
    id: o.id,
    name: o.name,
    tier: o.tier,
    mode: "live",
    async *crawl() {
      for (let page = 1; page <= 60; page++) {
        const res = await politeFetch(`${o.origin}/products.json?limit=250&page=${page}`, { headers: { accept: "application/json" } }, o.id, 20_000);
        if (!res.ok) throw new Error(`${o.id} products.json ${res.status}`);
        const { products } = (await res.json()) as { products: FullProduct[] };
        if (!products.length) return;
        yield products.map((p) => fromFull(p, o, resale)).filter((p): p is Product => p !== null);
        if (products.length < 250) return;
      }
    },
    async search({ q }) {
      if (!q.trim()) return [];
      try {
        return await cached(`${o.id}:${q.toLowerCase()}`, async () => {
          const url = `${o.origin}/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=10&resources[options][unavailable_products]=hide`;
          const res = await politeFetch(url, { headers: { accept: "application/json" } });
          if (!res.ok) throw new Error(`${o.id} ${res.status}`);
          const data = (await res.json()) as { resources: { results: { products?: Hit[] } } };
          return (data.resources.results.products ?? [])
            .filter((p) => p.available && parseFloat(p.price) > 0)
            .map((p, i): Product => {
              const price = parseFloat(p.price);
              const was = parseFloat(p.compare_at_price_max);
              const colourRaw = colourOf(p);
              return {
                id: `${o.id}:${p.id}`,
                title: p.title.replace(/\s+in [A-Za-z\s/-]+$/, ""),
                // some stores put a stock code in `vendor`; fall back to the shop name
                brand: p.vendor && !/\d/.test(p.vendor) ? p.vendor : o.name,
                category: toCategory(p.type, p.title),
                colourRaw,
                colourFamily: toColourFamily(colourRaw),
                images: p.image ? [`${p.image}${p.image.includes("?") ? "&" : "?"}width=600`] : [],
                isResale: resale,
                description: stripHtml(p.body).slice(0, 600) || undefined,
                rank: i,
                offers: [
                  {
                    retailerId: o.id,
                    retailerName: o.name,
                    externalId: String(p.id),
                    url: `${o.origin}/products/${p.handle}`,
                    priceGbp: price,
                    wasPriceGbp: was > price ? was : undefined,
                    sizesInStock: [],
                  },
                ],
              };
            });
        });
      } catch (e) {
        console.warn(`[${o.id}]`, (e as Error).message);
        return [];
      }
    },
  };
}
