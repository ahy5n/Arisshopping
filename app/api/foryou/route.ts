import { CATEGORIES } from "@/lib/catalogue";
import { searchIndex, similarTo } from "@/lib/index-store";
import { learnTaste, realBrandOf, tasteScore, topKeys, type Signal } from "@/lib/taste";
import type { Product } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Pick = Product & { because?: string };

/**
 * POST { liked: Product[], viewed: Product[] }  →  { picks: Product[] }
 * Liked items are her hearts (newest first); viewed are things she opened.
 * Candidates: items similar to each heart, plus more from her favourite
 * brands in her favourite categories. Ranked by how well they fit her taste,
 * with a cap per shop and per brand so the feed stays varied.
 */
export async function POST(req: Request) {
  const { liked = [], viewed = [] } = (await req.json().catch(() => ({}))) as { liked?: Product[]; viewed?: Product[] };
  const ok = (p: Product) => p?.offers?.length && p.category && p.title;
  const hearts = liked.filter(ok).slice(0, 12);
  const looks = viewed.filter(ok).slice(0, 12);
  if (!hearts.length && !looks.length) return Response.json({ picks: [] });

  const signals: Signal[] = [...hearts.map((p) => ({ p, weight: 3 })), ...looks.map((p) => ({ p, weight: 1 }))];
  const taste = learnTaste(signals);
  const exclude = new Set([...hearts, ...looks].flatMap((p) => [p.id, ...p.offers.map((o) => `${o.retailerId}:${o.externalId}`)]));
  const titles = new Set([...hearts, ...looks].map((p) => p.title.toLowerCase()));

  const pool = new Map<string, { p: Pick; hits: number }>();
  const offer = (p: Product, because?: string) => {
    if (exclude.has(p.id) || titles.has(p.title.toLowerCase())) return;
    const have = pool.get(p.id);
    if (have) have.hits++;
    else pool.set(p.id, { p: { ...p, because }, hits: 1 });
  };

  // 1. things like each heart (and, more lightly, the most recent things she opened)
  const seeds = [...hearts.slice(0, 8), ...looks.slice(0, 3)];
  const similar = await Promise.all(seeds.map((s) => similarTo(s, 10).catch(() => [] as Product[])));
  similar.forEach((list, i) => list.forEach((p) => offer(p, seeds[i].title)));

  // 2. more from her favourite brands, in the categories she actually buys
  const favCats = new Set(topKeys(taste.categories, 3));
  const brandNames = new Map(signals.map(({ p }) => [realBrandOf(p), p.brand]));
  for (const b of topKeys(taste.brands, 3).filter(Boolean)) {
    const name = brandNames.get(b);
    if (!name) continue;
    for (const cat of favCats) {
      const label = CATEGORIES.find((c) => c.id === cat)?.label.split(" ")[0] ?? cat;
      const found = await searchIndex(`${name} ${label}`, 30).catch(() => [] as Product[]);
      found.filter((p) => p.category === cat).forEach((p) => offer(p, `you like ${name}`));
    }
  }

  // rank: taste fit, a bonus for matching several of her hearts, then keep it varied
  const ranked = [...pool.values()]
    .map(({ p, hits }) => ({ p, score: tasteScore(p, taste) + Math.min(hits - 1, 3) * 0.8 }))
    .sort((a, b) => b.score - a.score);
  const perShop = new Map<string, number>();
  const perBrand = new Map<string, number>();
  const picks: Pick[] = [];
  for (const { p } of ranked) {
    const shop = p.offers[0].retailerId;
    const brand = realBrandOf(p) || `shop:${shop}`;
    if ((perShop.get(shop) ?? 0) >= 5 || (perBrand.get(brand) ?? 0) >= 4) continue;
    perShop.set(shop, (perShop.get(shop) ?? 0) + 1);
    perBrand.set(brand, (perBrand.get(brand) ?? 0) + 1);
    picks.push(p);
    if (picks.length >= 36) break;
  }
  // best first, but never the same shop twice in a row when there's another choice
  const mixed: Pick[] = [];
  const left = [...picks];
  while (left.length) {
    const last = mixed.at(-1)?.offers[0].retailerId;
    const i = left.findIndex((p) => p.offers[0].retailerId !== last);
    mixed.push(...left.splice(i < 0 ? 0 : i, 1));
  }
  return Response.json({ picks: mixed.map((p, i) => ({ ...p, rank: i })) });
}
