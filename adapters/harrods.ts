import { sortSizes, toCategory, toColourFamily, toSize } from "../lib/normalise";
import type { Product, RetailerAdapter } from "../lib/types";
import { cached, politeFetch } from "./http";

// Harrods searches Algolia through its own /api/search proxy (the proxy adds
// the key). Index name comes from the site's runtime config.
const INDEX = "prod_harrods.com";

type Hit = {
  objectID: string;
  name: string;
  brand?: string;
  gender?: string;
  url: string;
  price?: Record<string, number>; // pence, per currency
  salePrice?: Record<string, number>;
  images?: Record<string, string>;
  size?: string[];
  specs?: { harrodsColour?: string; vendorColour?: string };
  trackingCategories?: { lvl0?: string[]; lvl1?: string[] };
};

const adapter: RetailerAdapter = {
  id: "harrods",
  name: "Harrods",
  tier: "premium",
  mode: "live",
  async search({ q, limit = 40 }) {
    if (!q.trim()) return [];
    try {
      return await cached(`harrods:${limit}:${q.toLowerCase()}`, async () => {
        const params = new URLSearchParams({ query: q, hitsPerPage: String(Math.min(1000, Math.round(limit * 1.6))) });
        const res = await politeFetch("https://www.harrods.com/api/search/1/indexes/*/queries", {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ requests: [{ indexName: INDEX, params: params.toString() }] }),
        });
        if (!res.ok) throw new Error(`harrods ${res.status}`);
        const data = (await res.json()) as { results: { hits: Hit[] }[] };
        const out: Product[] = [];
        for (const h of data.results?.[0]?.hits ?? []) {
          if (!/^(female|unisex)$/i.test(h.gender ?? "")) continue;
          const full = (h.price?.GBP ?? 0) / 100;
          const sale = (h.salePrice?.GBP ?? 0) / 100;
          const now = sale > 0 && sale < full ? sale : full;
          if (!now || !h.url || !h.name) continue;
          const colour = h.specs?.harrodsColour && !/no colour/i.test(h.specs.harrodsColour) ? h.specs.harrodsColour : "";
          const category = toCategory(h.trackingCategories?.lvl1?.join(" "), h.name);
          out.push({
            id: `harrods:${h.objectID}`,
            title: h.name,
            brand: h.brand ?? "Harrods",
            category,
            colourRaw: colour,
            colourFamily: toColourFamily(colour || h.name),
            images: Object.values(h.images ?? {}).slice(0, 4).map((u) => `${u.replace("//images//", "/images/")}?width=600`),
            isResale: false,
            rank: out.length,
            offers: [
              {
                retailerId: "harrods",
                retailerName: "Harrods",
                externalId: h.objectID,
                url: h.url.replace("https://harrods.com", "https://www.harrods.com"),
                priceGbp: now,
                wasPriceGbp: now < full ? full : undefined,
                sizesInStock: sortSizes((h.size ?? []).filter((s) => s !== "OS").map((s) => toSize(s, category))),
              },
            ],
          });
          if (out.length >= limit) break;
        }
        return out;
      });
    } catch (e) {
      console.warn("[harrods]", (e as Error).message);
      return [];
    }
  },
};

export default adapter;
