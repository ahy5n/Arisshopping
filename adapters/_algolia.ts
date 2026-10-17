import { sortSizes, toCategory, toColourFamily, toSize } from "../lib/normalise";
import type { Product, RetailerAdapter, Tier } from "../lib/types";
import { cached, politeFetch } from "./http";

// Shops whose own website searches through Algolia. The app id and
// search-only key are the public ones each site sends from every visitor's
// browser. If a shop rotates them, the adapter returns nothing and the test
// fails; grab the new ones from the site's network tab.

export type Mapped = {
  id: string;
  title: string;
  brand?: string;
  price: number;
  was?: number;
  colour?: string;
  category?: string;
  url: string;
  images: string[];
  sizes?: string[];
  women?: boolean;
  resale?: boolean;
};

type Opts = {
  id: string;
  name: string;
  tier: Tier;
  appId: string;
  key: string;
  index: string;
  /** Defaults to Algolia's own host; some shops proxy it through their domain */
  host?: string;
  params?: Record<string, unknown>;
  map: (hit: Record<string, unknown>) => Mapped | null;
};

export const en = (v: unknown): string | undefined => {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return en(v[0]);
  if (v && typeof v === "object") return en((v as Record<string, unknown>)["en-GB"] ?? Object.values(v)[0]);
  return undefined;
};

export function algoliaAdapter(o: Opts): RetailerAdapter {
  const host = o.host ?? `${o.appId.toLowerCase()}-dsn.algolia.net`;
  return {
    id: o.id,
    name: o.name,
    tier: o.tier,
    mode: "live",
    async search({ q, limit = 40 }) {
      if (!q.trim()) return [];
      try {
        return await cached(`${o.id}:${limit}:${q.toLowerCase()}`, async () => {
          const res = await politeFetch(
            `https://${host}/1/indexes/${encodeURIComponent(o.index)}/query`,
            {
              method: "POST",
              headers: { "x-algolia-application-id": o.appId, "x-algolia-api-key": o.key, "content-type": "application/json" },
              body: JSON.stringify({ query: q, hitsPerPage: Math.min(1000, Math.round(limit * 1.5)), ...o.params }),
            },
            o.id,
          );
          if (!res.ok) throw new Error(`${o.id} ${res.status}`);
          const data = (await res.json()) as { hits: Record<string, unknown>[] };
          return data.hits
            .map(o.map)
            .filter((m): m is Mapped => Boolean(m && m.title && m.price > 0 && m.url && m.women !== false))
            .slice(0, limit)
            .map((m, i): Product => {
              const category = toCategory(m.category, m.title);
              return {
                id: `${o.id}:${m.id}`,
                title: m.title,
                brand: m.brand || o.name,
                category,
                colourRaw: m.colour ?? "",
                colourFamily: toColourFamily(m.colour || m.title),
                images: m.images.slice(0, 5),
                isResale: Boolean(m.resale),
                rank: i,
                offers: [
                  {
                    retailerId: o.id,
                    retailerName: o.name,
                    externalId: m.id,
                    url: m.url,
                    priceGbp: m.price,
                    wasPriceGbp: m.was && m.was > m.price ? m.was : undefined,
                    sizesInStock: sortSizes((m.sizes ?? []).map((s) => toSize(s, category))),
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
