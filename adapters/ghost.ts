import { toCategory, toColourFamily } from "../lib/normalise";
import type { Product, RetailerAdapter } from "../lib/types";
import { cached, politeFetch } from "./http";

// Ghost's search page asks its own /site/AjaxProductsFromCategories for results.
const SITE = "https://www.ghost.co.uk";

type GhostProduct = {
  ProductId: number;
  Code: string;
  Name: string;
  RetailPrice: number;
  SalePrice: number;
  Colour?: string;
  ProductUrl: string;
  Description?: string;
  Images?: { ImageSizes: { CdnFullUrl: string }[] }[];
};

const adapter: RetailerAdapter = {
  id: "ghost",
  name: "Ghost",
  tier: "mid",
  mode: "live",
  async search({ q, limit = 40 }) {
    if (!q.trim()) return [];
    try {
      return await cached(`ghost:${limit}:${q.toLowerCase()}`, async () => {
        const res = await politeFetch(`${SITE}/site/AjaxProductsFromCategories`, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ Query: q, SearchParams: `q=${q}`, PageNumber: 1, PageSize: 48, ViewAll: true }),
        });
        if (!res.ok) throw new Error(`ghost ${res.status}`);
        const data = (await res.json()) as { Products?: { Product: GhostProduct }[] };
        const seen = new Set<string>();
        const out: Product[] = [];
        for (const { Product: p } of data.Products ?? []) {
          if (!p?.Name || seen.has(p.Code)) continue;
          seen.add(p.Code);
          const now = p.SalePrice > 0 ? p.SalePrice : p.RetailPrice;
          const colour = (p.Colour ?? "").trim();
          out.push({
            id: `ghost:${p.Code}`,
            title: p.Name,
            brand: "Ghost",
            category: toCategory(undefined, p.Name),
            colourRaw: colour,
            colourFamily: toColourFamily(colour || p.Name),
            images: (p.Images ?? []).slice(0, 4).map((i) => i.ImageSizes?.[0]?.CdnFullUrl).filter(Boolean) as string[],
            isResale: false,
            description: p.Description?.replace(/\r/g, "").trim() || undefined,
            rank: out.length,
            offers: [
              {
                retailerId: "ghost",
                retailerName: "Ghost",
                externalId: p.Code,
                url: `${SITE}${p.ProductUrl}`,
                priceGbp: now,
                wasPriceGbp: p.RetailPrice > now ? p.RetailPrice : undefined,
                sizesInStock: [],
              },
            ],
          });
          if (out.length >= limit) break;
        }
        return out;
      });
    } catch (e) {
      console.warn("[ghost]", (e as Error).message);
      return [];
    }
  },
};

export default adapter;
