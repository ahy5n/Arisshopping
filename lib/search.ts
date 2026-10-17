import { brandQuery } from "./brands";
import { PRICE_CAP, SHADE_MAP } from "./catalogue";
import type { Filters, Product, SortKey } from "./types";

export const cheapest = (p: Product) => p.offers[0];
export const onSale = (p: Product) => p.offers.some((o) => o.wasPriceGbp && o.wasPriceGbp > o.priceGbp);

export function allSizes(p: Product) {
  return [...new Set(p.offers.flatMap((o) => o.sizesInStock))];
}

export function formatGbp(n: number) {
  return n % 1 === 0 ? `£${n}` : `£${n.toFixed(2)}`;
}

/** Share of the search words that appear in the title or brand: shops' own matching is loose. */
function wordScore(p: Product, q: string) {
  const bq = brandQuery(q);
  if (bq) {
    const isBrand = bq.brands.some((b) => b.toLowerCase() === p.brand.toLowerCase());
    if (!isBrand) return 0;
    if (!bq.rest.length) return 1;
    const t = p.title.toLowerCase();
    return 0.5 + (0.5 * bq.rest.filter((w) => t.includes(w)).length) / bq.rest.length;
  }
  const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return 1;
  const hay = `${p.title} ${p.brand} ${p.colourRaw}`.toLowerCase();
  return words.filter((w) => hay.includes(w) || hay.includes(w.replace(/s$/, ""))).length / words.length;
}

export function applyFilters(items: Product[], f: Filters, sort: SortKey, q = "") {
  const shadeFamily = f.shade ? SHADE_MAP[f.shade.trim().toLowerCase()] : undefined;
  const out = items.filter((p) => {
    const price = cheapest(p).priceGbp;
    if (f.colours.length && !f.colours.includes(p.colourFamily)) return false;
    if (f.shade && !p.colourRaw.toLowerCase().includes(f.shade.toLowerCase()) && p.colourFamily !== shadeFamily) return false;
    if (f.brands.length && !f.brands.includes(p.brand)) return false;
    if (price < f.minPrice) return false;
    if (f.maxPrice < PRICE_CAP && price > f.maxPrice) return false;
    if (f.sizes.length && !allSizes(p).some((s) => f.sizes.includes(s) || s === "One size")) return false;
    if (f.categories.length && !f.categories.includes(p.category)) return false;
    if (f.saleOnly && !onSale(p)) return false;
    if (f.condition === "new" && p.isResale) return false;
    if (f.condition === "resale" && !p.isResale) return false;
    return true;
  });
  // best match: full word matches first; within those, each shop's #1, then each shop's #2, …
  if (sort === "relevance") {
    const score = new Map(out.map((p) => [p.id, Math.round(wordScore(p, q) * 2) / 2]));
    out.sort((a, b) => score.get(b.id)! - score.get(a.id)! || (a.rank ?? 99) - (b.rank ?? 99));
  }
  if (sort === "price-asc") out.sort((a, b) => cheapest(a).priceGbp - cheapest(b).priceGbp);
  if (sort === "price-desc") out.sort((a, b) => cheapest(b).priceGbp - cheapest(a).priceGbp);
  return out;
}

export function activeFilterCount(f: Filters) {
  return (
    f.colours.length +
    (f.shade ? 1 : 0) +
    f.brands.length +
    (f.minPrice > 0 || f.maxPrice < PRICE_CAP ? 1 : 0) +
    f.sizes.length +
    f.categories.length +
    (f.saleOnly ? 1 : 0) +
    (f.condition !== "all" ? 1 : 0)
  );
}
