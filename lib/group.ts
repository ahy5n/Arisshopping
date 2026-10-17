import { COLOURS } from "./catalogue";
import type { Product } from "./types";

// Brief §6.4: the same item sold by several shops becomes one card.
// Match = same normalised brand + same colour family + title trigram
// similarity above THRESHOLD. Resale is never grouped with new.
// Products are bucketed by brand+colour first, so this stays fast on a phone.

export const THRESHOLD = 0.6;

const COLOUR_WORDS = new RegExp(
  `\\b(${[...COLOURS.map((c) => c.label.toLowerCase()), "ivory", "ecru", "sage", "khaki", "burgundy", "lilac", "camel", "chocolate", "gold", "silver", "multi", "print"].join("|")})\\b`,
  "g",
);

export const normBrand = (b: string) =>
  b.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/&/g, "and").replace(/[^a-z0-9]/g, "");

/** Title without brand, colour words, sizes and punctuation: what the item *is*. */
export function normTitle(title: string, brand: string) {
  let t = title.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/['’]/g, "");
  for (const w of brand.toLowerCase().split(/\s+/)) if (w.length > 1) t = t.replace(new RegExp(`\\b${w.replace(/[^a-z0-9]/g, "")}\\b`, "g"), " ");
  return t
    .replace(COLOUR_WORDS, " ")
    .replace(/\b(womens?|ladies|petite|tall|plus|curve|maternity|uk ?\d+)\b/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function trigrams(s: string) {
  const g = new Set<string>();
  const t = `  ${s} `;
  for (let i = 0; i < t.length - 2; i++) g.add(t.slice(i, i + 3));
  return g;
}

/** Same measure as Postgres pg_trgm similarity(): shared / union. */
export function similarity(a: string, b: string) {
  const A = trigrams(a);
  const B = trigrams(b);
  let shared = 0;
  for (const x of A) if (B.has(x)) shared++;
  return shared / (A.size + B.size - shared || 1);
}

/** A title needs at least this much substance to group: "Women's Dress" alone is not an identity. */
const MIN_WORDS = 2;
/** A sale can be deep, but not this deep: £115 and £380 are different things. */
const MIN_PRICE_RATIO = 0.35;

/**
 * Department stores (John Lewis, Fenwick…) often leave the brand in the title
 * ("Hobbs Rae Crepe Shift Dress") and their own name in `brand`. Pull the real
 * brand out when the title starts with one we know.
 */
function realBrand(p: Product, known: Map<string, string>) {
  if (normBrand(p.brand) !== normBrand(p.offers[0].retailerName)) return p.brand;
  const words = p.title.split(/\s+/);
  for (let n = Math.min(3, words.length - 1); n >= 1; n--) {
    const hit = known.get(normBrand(words.slice(0, n).join(" ")));
    if (hit) return hit;
  }
  return p.brand;
}

/** Merge products that are the same item at different shops. Keeps first-seen order. */
export function groupProducts(items: Product[]): Product[] {
  const known = new Map<string, string>();
  for (const p of items) if (p.brand && normBrand(p.brand) !== normBrand(p.offers[0].retailerName)) known.set(normBrand(p.brand), p.brand);

  const buckets = new Map<string, { p: Product; t: string }[]>();
  const out: Product[] = [];
  const slot = new Map<Product, number>();

  for (const p of items) {
    const brand = p.brand ? realBrand(p, known) : "";
    const t = brand ? normTitle(p.title, brand) : "";
    if (p.isResale || !brand || t.split(" ").length < MIN_WORDS) {
      out.push(p);
      continue;
    }
    const key = `${normBrand(brand)}|${p.colourFamily}`;
    const bucket = buckets.get(key) ?? [];
    const price = p.offers[0].priceGbp;
    const hit = bucket.find(
      (b) =>
        similarity(b.t, t) >= THRESHOLD &&
        !b.p.offers.some((o) => p.offers.some((x) => x.retailerId === o.retailerId)) &&
        Math.min(price, b.p.offers[0].priceGbp) / Math.max(price, b.p.offers[0].priceGbp) >= MIN_PRICE_RATIO,
    );
    if (hit) {
      const merged: Product = {
        ...hit.p,
        brand: normBrand(hit.p.brand) === normBrand(hit.p.offers[0].retailerName) ? brand : hit.p.brand,
        images: hit.p.images.length ? hit.p.images : p.images,
        description: hit.p.description ?? p.description,
        rank: Math.min(hit.p.rank ?? 99, p.rank ?? 99),
        offers: [...hit.p.offers, ...p.offers].sort((a, b) => a.priceGbp - b.priceGbp),
      };
      out[slot.get(hit.p)!] = merged;
      slot.set(merged, slot.get(hit.p)!);
      hit.p = merged;
    } else {
      slot.set(p, out.length);
      out.push(p);
      bucket.push({ p, t });
      buckets.set(key, bucket);
    }
  }
  return out;
}
