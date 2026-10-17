/**
 * Nightly catalogue crawl (brief §4.3, "indexed" path). Fills the product index
 * that searches read from first.
 *   - shops with a real catalogue feed (Shopify /products.json) are read in full
 *   - everyone else is swept with one search per women's category word
 * Shops run in parallel; each shop still gets one request at a time with a
 * 1.5s gap (adapters/http.ts). A shop that errors is logged and skipped.
 *
 *   npx tsx scripts/crawl.ts               every live shop
 *   npx tsx scripts/crawl.ts rixo zara     just these
 */
import { crawlableAdapters } from "../adapters";
import { EMPTY_FILTERS } from "../lib/catalogue";
import { indexStats, pruneStale, recordCrawl, upsertProducts } from "../lib/catalogue-db";
import type { RetailerAdapter } from "../lib/types";

/** What a women's wardrobe is made of, in the words shops use. */
export const CRAWL_WORDS = [
  // dresses
  "dress", "maxi dress", "midi dress", "mini dress", "slip dress", "wrap dress", "shirt dress", "bodycon dress",
  "knitted dress", "satin dress", "lace dress", "sequin dress", "floral dress", "party dress", "wedding guest dress",
  "summer dress", "jumper dress", "smock dress", "corset dress",
  // tops
  "top", "blouse", "shirt", "t-shirt", "tank top", "vest top", "cami", "corset", "bodysuit", "crop top", "halter top",
  "bardot top", "polo shirt", "long sleeve top", "going out top", "tunic",
  // knitwear & sweats
  "knit", "jumper", "cardigan", "roll neck", "knitted vest", "hoodie", "sweatshirt", "fleece",
  // outerwear
  "coat", "jacket", "blazer", "trench coat", "puffer jacket", "denim jacket", "leather jacket", "wool coat",
  "gilet", "bomber jacket", "parka", "cape",
  // bottoms
  "jeans", "wide leg jeans", "straight leg jeans", "skinny jeans", "barrel jeans", "flared jeans", "trousers",
  "wide leg trousers", "tailored trousers", "cargo trousers", "joggers", "leggings", "shorts", "denim shorts",
  "skirt", "midi skirt", "mini skirt", "maxi skirt", "denim skirt", "satin skirt", "pleated skirt", "skort",
  // sets
  "co-ord", "matching set", "jumpsuit", "playsuit", "suit",
  // active, swim, lingerie, night
  "sports bra", "gym leggings", "running", "yoga", "swimsuit", "bikini", "kaftan", "bra", "lingerie", "knickers",
  "slip", "pyjamas", "nightdress", "robe", "loungewear",
  // shoes
  "boots", "ankle boots", "knee high boots", "heels", "mules", "sandals", "flats", "ballet flats", "loafers",
  "trainers", "mary janes", "slippers", "wedges", "slingbacks",
  // bags & accessories
  "bag", "shoulder bag", "tote bag", "crossbody bag", "clutch", "backpack", "purse", "jewellery", "necklace",
  "earrings", "bracelet", "ring", "scarf", "belt", "sunglasses", "hat", "beanie", "gloves", "hair clip", "socks", "tights",
];

const PER_SHOP_MS = 18 * 60 * 1000; // keep the whole run inside ~20 minutes

async function crawlShop(a: RetailerAdapter) {
  const startedAt = new Date().toISOString();
  const deadline = Date.now() + PER_SHOP_MS;
  const seen = new Set<string>();
  let how = "";
  try {
    if (a.crawl) {
      how = "full catalogue";
      for await (const batch of a.crawl()) {
        upsertProducts(batch);
        batch.forEach((p) => seen.add(p.id));
        if (Date.now() > deadline) break;
      }
    }
    // no feed, or a thin one (some shops mark stock unavailable in their feed): sweep by category words too
    if (seen.size < 100) {
      how = how ? `${how} + category searches` : `${CRAWL_WORDS.length} category searches`;
      for (const word of CRAWL_WORDS) {
        if (Date.now() > deadline) break;
        const batch = (await a.search({ q: word, filters: EMPTY_FILTERS, sort: "relevance", limit: 1000 })).filter((p) => !seen.has(p.id));
        upsertProducts(batch);
        batch.forEach((p) => seen.add(p.id));
      }
    }
    recordCrawl(a.id, startedAt, seen.size);
    console.log(`  ✓ ${a.name.padEnd(22)} ${String(seen.size).padStart(6)} products  (${how})`);
  } catch (e) {
    const msg = (e as Error).message;
    recordCrawl(a.id, startedAt, seen.size, msg);
    console.log(`  ✗ ${a.name.padEnd(22)} ${String(seen.size).padStart(6)} products  ${msg.slice(0, 70)}`);
  }
}

async function main() {
  const only = process.argv.slice(2);
  const shops = crawlableAdapters().filter((a) => !only.length || only.includes(a.id));
  const t0 = Date.now();
  console.log(`crawling ${shops.length} shops…`);
  await Promise.all(shops.map(crawlShop));
  const pruned = pruneStale();
  const { total } = indexStats();
  console.log(`\nindex now holds ${total.toLocaleString()} products (${pruned} stale removed) · ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}

main();
