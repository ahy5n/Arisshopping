import { normBrand } from "./group";
import type { Product } from "./types";

// What Ari likes, learned from her hearts (strong signal) and the things she
// opens (weak signal). Used to pick "for you" items from the catalogue.

export type Signal = { p: Product; weight: number };

export type Taste = {
  categories: Map<string, number>;
  colours: Map<string, number>;
  brands: Map<string, number>;
  shops: Map<string, number>;
  /** The range she spends across, from her cheapest to dearest liked item */
  priceLo: number;
  priceHi: number;
};

/** A brand that's just the shop's own name ("John Lewis" at John Lewis) isn't a taste signal. */
export const realBrandOf = (p: Product) => (normBrand(p.brand) === normBrand(p.offers[0].retailerName) ? "" : normBrand(p.brand));

const add = (m: Map<string, number>, k: string | undefined, w: number) => k && m.set(k, (m.get(k) ?? 0) + w);

export function learnTaste(signals: Signal[]): Taste {
  const t: Taste = { categories: new Map(), colours: new Map(), brands: new Map(), shops: new Map(), priceLo: 0, priceHi: 0 };
  const prices: number[] = [];
  for (const { p, weight } of signals) {
    add(t.categories, p.category, weight);
    add(t.colours, p.colourFamily, weight);
    add(t.brands, realBrandOf(p), weight);
    add(t.shops, p.offers[0].retailerId, weight);
    prices.push(p.offers[0].priceGbp);
  }
  t.priceLo = prices.length ? Math.min(...prices) * 0.6 : 0;
  t.priceHi = prices.length ? Math.max(...prices) * 1.3 : 0;
  return t;
}

const share = (m: Map<string, number>, k: string) => {
  const total = [...m.values()].reduce((a, b) => a + b, 0) || 1;
  return (m.get(k) ?? 0) / total;
};

/** How well a product fits her taste, roughly 0–10. */
export function tasteScore(p: Product, t: Taste) {
  const price = p.offers[0].priceGbp;
  // full marks anywhere in her range, fading the further outside it
  const fit = price < t.priceLo ? price / t.priceLo : price > t.priceHi ? t.priceHi / price : 1;
  const brand = realBrandOf(p);
  return (
    4 * share(t.categories, p.category) +
    2.5 * share(t.colours, p.colourFamily) +
    (brand ? 2 * share(t.brands, brand) : 0) +
    0.5 * share(t.shops, p.offers[0].retailerId) +
    2 * fit
  );
}

export function topKeys(m: Map<string, number>, n: number) {
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
}
