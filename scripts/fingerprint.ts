/**
 * Which e-commerce platform and search provider does each shop use?
 * One home-page request per shop. Helps decide which shared adapter fits.
 *   npx tsx scripts/fingerprint.ts [ids...]
 */
import { USER_AGENT } from "../adapters/http";
import probe from "../config/probe-results.json";
import { RETAILERS } from "../config/retailers";

const MARKERS: [string, RegExp][] = [
  ["sfcc", /demandware|\/on\/demandware\.static|dwvar_|sfcc/i],
  ["inditex", /itxrest|inditex/i],
  ["frasers", /frasers|flannels|houseoffraser.*api\/productlist|sportsdirect/i],
  ["algolia", /algolia(net|search)?|x-algolia/i],
  ["klevu", /klevu/i],
  ["searchspring", /searchspring/i],
  ["bloomreach", /bloomreach|brsearch|br_data|\bbrtrk/i],
  ["constructor", /constructor\.io|cnstrc/i],
  ["empathy", /empathy\.co/i],
  ["unbxd", /unbxd/i],
  ["fredhopper", /fredhopper/i],
  ["attraqt", /attraqt|xo\.attraqt/i],
  ["doofinder", /doofinder/i],
  ["coveo", /coveo/i],
  ["magento", /Magento|mage\/cookies|requirejs-config/],
  ["next.js", /__NEXT_DATA__|\/_next\/static/],
  ["nuxt", /__NUXT__|\/_nuxt\//],
  ["remix", /__remixContext/],
  ["hybris", /hybris|\/_ui\/responsive/i],
  ["vtex", /vtex/i],
  ["jsonld-product", /"@type"\s*:\s*"Product"/],
];

async function main() {
  const p = probe as Record<string, { state: string; origin?: string }>;
  const ids = process.argv.slice(2);
  const shops = RETAILERS.filter((r) => (ids.length ? ids.includes(r.id) : p[r.id]?.state === "reachable"));
  const q = [...shops];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let r = q.shift(); r; r = q.shift()) {
        try {
          const res = await fetch(r.site, { headers: { "User-Agent": USER_AGENT, "Accept-Language": "en-GB" }, signal: AbortSignal.timeout(12_000) });
          const html = await res.text();
          const hits = MARKERS.filter(([, re]) => re.test(html)).map(([n]) => n);
          console.log(`${r.id.padEnd(14)} ${String(res.status).padEnd(4)} ${(html.length / 1000).toFixed(0).padStart(5)}k  ${hits.join(" ")}`);
        } catch (e) {
          console.log(`${r.id.padEnd(14)} ERR  ${(e as Error).message.slice(0, 60)}`);
        }
      }
    }),
  );
}

main();
