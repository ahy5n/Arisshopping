import type { Product } from "./types";

// Phase 2 only merges exact matches: the Boohoo group shops share product
// codes, so the same Coast dress at Coast and at PrettyLittleThing becomes
// one card. Fuzzy cross-shop grouping comes in phase 3.

export function mergeBatch(existing: Product[], incoming: Product[]): Product[] {
  const byCode = new Map<string, Product>();
  for (const p of existing) for (const o of p.offers) if (o.externalId) byCode.set(o.externalId, p);

  const out = [...existing];
  const byId = new Map(out.map((p, i) => [p.id, i]));
  for (const p of incoming) {
    // the same listing again (index first, then live): take the fresher copy, keep its place
    const same = byId.get(p.id);
    if (same !== undefined) {
      out[same] = { ...p, rank: Math.min(p.rank ?? 99, out[same].rank ?? 99), offers: out[same].offers.length > 1 ? out[same].offers.map((o) => (o.retailerId === p.offers[0].retailerId ? p.offers[0] : o)) : p.offers };
      continue;
    }
    const code = p.offers[0].externalId;
    const match = code ? byCode.get(code) : undefined;
    if (match && !match.isResale && !p.isResale) {
      const merged: Product = {
        ...match,
        images: match.images.length ? match.images : p.images,
        rank: Math.min(match.rank ?? 99, p.rank ?? 99),
        offers: [...match.offers, ...p.offers.filter((o) => !match.offers.some((m) => m.retailerId === o.retailerId))].sort(
          (a, b) => a.priceGbp - b.priceGbp,
        ),
      };
      out[out.indexOf(match)] = merged;
      for (const o of merged.offers) if (o.externalId) byCode.set(o.externalId, merged);
    } else {
      byId.set(p.id, out.length);
      out.push(p);
      if (code) byCode.set(code, p);
    }
  }
  return out;
}
