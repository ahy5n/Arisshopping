import { toCategory, toColourFamily } from "../lib/normalise";
import type { Product, RetailerAdapter } from "../lib/types";
import { cached, politeFetch } from "./http";

// River Island renders search on the server and ships an Apollo cache in
// __NEXT_DATA__: products are "ListProduct" entries whose price, images,
// brand and categories are references to other cache entries.

const SITE = "https://www.riverisland.com";

type Ref = { type: "id"; id: string };
type Cache = Record<string, Record<string, unknown>>;

const isRef = (x: unknown): x is Ref => Boolean(x && typeof x === "object" && (x as Ref).type === "id");

export function parseRiverIsland(html: string, limit = 40): Product[] {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return [];
  const cache = (JSON.parse(m[1]) as { props?: { apolloState?: Cache } }).props?.apolloState;
  if (!cache) return [];
  const get = (x: unknown) => (isRef(x) ? cache[x.id] : (x as Record<string, unknown> | undefined));
  const json = (x: unknown) => (x && typeof x === "object" && "json" in x ? ((x as { json: unknown }).json as string[]) : undefined);

  const entries = Object.entries(cache)
    .filter(([, v]) => v.__typename === "ListProduct" && v.displayName && v.productPageUrl)
    .sort(([a], [b]) => Number(a.split(".").pop()) - Number(b.split(".").pop()));

  return entries.slice(0, limit).map(([, v], i): Product => {
    const prices = ((get(v.priceInfo)?.prices as unknown[]) ?? []).map(get).filter(Boolean) as { name: string; value: number }[];
    const values = prices.map((p) => p.value).filter((n) => n > 0);
    const now = Math.min(...values);
    const list = prices.find((p) => /list|was|original/i.test(p.name))?.value;
    const images = ((v.images as unknown[]) ?? []).map(get).map((img) => (img as { url?: string })?.url).filter(Boolean) as string[];
    const cats = json(get(v.trackingCategoriesInfo)?.categories) ?? [];
    const brand = json(get(v.attributes)?.brands)?.[0] ?? "River Island";
    const title = String(v.displayName);
    const colour = title.match(/^(\w+(?:\s(?:pink|blue|green|grey|brown|red))?)\s/)?.[1] ?? "";
    const id = String(v.productId);
    return {
      id: `riverisland:${id}`,
      title,
      brand,
      category: toCategory(cats.slice(1).join(" "), title),
      colourRaw: colour,
      colourFamily: toColourFamily(colour || title),
      images: images.slice(0, 4).map((u) => `${u}?$ProductImagePortraitLarge$&wid=600`),
      isResale: false,
      rank: i,
      offers: [
        {
          retailerId: "riverisland",
          retailerName: "River Island",
          externalId: id,
          url: `${SITE}${v.productPageUrl}`,
          priceGbp: now,
          wasPriceGbp: list && list > now ? list : undefined,
          sizesInStock: [],
        },
      ],
    };
  });
}

const adapter: RetailerAdapter = {
  id: "riverisland",
  name: "River Island",
  tier: "high-street",
  mode: "live",
  async search({ q, limit = 40 }) {
    if (!q.trim()) return [];
    try {
      return await cached(`riverisland:${limit}:${q.toLowerCase()}`, async () => {
        const res = await politeFetch(`${SITE}/search?keyword=${encodeURIComponent(q)}&f-division=women`, { headers: { accept: "text/html" } });
        if (!res.ok) throw new Error(`riverisland ${res.status}`);
        return parseRiverIsland(await res.text(), limit);
      });
    } catch (e) {
      console.warn("[riverisland]", (e as Error).message);
      return [];
    }
  },
};

export default adapter;
