/**
 * Tries each shop's search page (config/search-pages.ts) with the generic page
 * reader and records which ones yield real products. At most one request per
 * candidate URL, stopping at the first that works. Updates probe-results.json:
 * a shop that works gets state "page" plus the URL that worked.
 *
 *   npx tsx scripts/probe-pages.ts            every shop in search-pages.ts not already live
 *   npx tsx scripts/probe-pages.ts zara asos  just these
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseSearchPage } from "../adapters/_page";
import { USER_AGENT } from "../adapters/http";
import { RETAILERS } from "../config/retailers";
import { PAGE_OPTIONS, SEARCH_PAGES } from "../config/search-pages";

const OUT = new URL("../config/probe-results.json", import.meta.url);
const SAVE = "/tmp/aris_pages";
mkdirSync(SAVE, { recursive: true });

type Res = { state: string; origin?: string; currency?: string; detail?: string; searchUrl?: string; at: string };

async function tryShop(id: string): Promise<Res | null> {
  const r = RETAILERS.find((x) => x.id === id)!;
  let last = "";
  for (const tpl of SEARCH_PAGES[id]) {
    const url = tpl.replace("{q}", process.env.Q ?? "black");
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, "Accept-Language": "en-GB", accept: "text/html" }, signal: AbortSignal.timeout(12_000) });
      const html = await res.text();
      writeFileSync(`${SAVE}/${id}.html`, html);
      if (!res.ok) {
        last = `HTTP ${res.status}`;
      } else {
        const items = parseSearchPage(html, { id, name: r.name, tier: r.tier, searchUrl: tpl, ...PAGE_OPTIONS[id] }, res.url);
        const withImg = items.filter((p) => p.images.length).length;
        if (items.length >= 3) {
          return { state: "page", searchUrl: tpl, detail: `${items.length} products (${withImg} with pictures), e.g. ${items[0].title} £${items[0].offers[0].priceGbp}`, at: new Date().toISOString() };
        }
        last = `page loads (${(html.length / 1000).toFixed(0)}k) but no readable products`;
      }
    } catch (e) {
      last = (e as Error).message.slice(0, 60);
    }
    await new Promise((res) => setTimeout(res, 1500));
  }
  console.log(`  ✗ ${r.name}: ${last}`);
  return null;
}

async function main() {
  const results = JSON.parse(readFileSync(OUT, "utf8")) as Record<string, Res>;
  const ids = process.argv.slice(2).length
    ? process.argv.slice(2)
    : Object.keys(SEARCH_PAGES).filter((id) => !["shopify", "page"].includes(results[id]?.state));
  const q = [...ids];
  let ok = 0;
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      for (let id = q.shift(); id; id = q.shift()) {
        const res = await tryShop(id);
        if (res) {
          ok++;
          results[id] = { ...results[id], ...res };
          console.log(`  ✓ ${id.padEnd(14)} ${res.detail}`);
        } else if (results[id]?.state === "page") {
          results[id] = { ...results[id], state: "reachable" };
        }
      }
    }),
  );
  writeFileSync(OUT, JSON.stringify(results, null, 2) + "\n");
  console.log(`\n${ok} of ${ids.length} shops readable from their search page`);
}

main();
