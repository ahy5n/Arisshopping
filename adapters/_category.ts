import type { Product, RetailerAdapter, Tier } from "../lib/types";
import { parseSearchPage } from "./_page";
import { politeFetch } from "./http";

// Shops whose search can't be used but whose category pages can be read.
// Catalogue-only ("indexed"): the refresh crawl walks every category page by
// page; searches then find these products in the catalogue.

type Opts = {
  id: string;
  name: string;
  tier: Tier;
  /** Category listing URLs */
  pages: string[];
  /** How to ask for page n of a listing */
  pageParam?: (n: number) => string;
  maxPages?: number;
};

export function categoryAdapter(o: Opts): RetailerAdapter {
  const pageOf = o.pageParam ?? ((n: number) => (n === 1 ? "" : `?page=${n}`));
  return {
    id: o.id,
    name: o.name,
    tier: o.tier,
    mode: "indexed",
    async search() {
      return [];
    },
    async *crawl() {
      for (const base of o.pages) {
        const seen = new Set<string>();
        for (let n = 1; n <= (o.maxPages ?? 30); n++) {
          const url = base + pageOf(n);
          let batch: Product[] = [];
          try {
            const res = await politeFetch(url, { headers: { accept: "text/html" } }, o.id, 20_000);
            if (!res.ok) break;
            batch = parseSearchPage(await res.text(), { id: o.id, name: o.name, tier: o.tier, searchUrl: base }, res.url || url, 500);
          } catch (e) {
            console.warn(`[${o.id}] ${url}`, (e as Error).message);
            break;
          }
          const fresh = batch.filter((p) => !seen.has(p.id));
          if (!fresh.length) break; // past the last page
          fresh.forEach((p) => seen.add(p.id));
          yield fresh;
        }
      }
    },
  };
}
