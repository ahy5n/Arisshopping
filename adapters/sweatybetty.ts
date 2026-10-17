import { toCategory, toColourFamily } from "../lib/normalise";
import type { Product, RetailerAdapter } from "../lib/types";
import { cached, politeFetch } from "./http";

// Sweaty Betty (Salesforce PWA Kit) puts its search results in a mobify-data
// JSON block: names and prices per product id. Links and photos follow fixed
// patterns from that id, and the tiles in the same page give the exact link.

const SITE = "https://www.sweatybetty.com";

type Hit = { productId: string; productName: string; price: number; currency: string };

export function parseSweatyBetty(html: string, limit = 40): Product[] {
  const m = html.match(/<script id="mobify-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) return [];
  const store = (JSON.parse(m[1]) as {
    __PRELOADED_STATE__?: { __STATE_MANAGEMENT_LIBRARY?: { store?: { productStore?: { searchResultsByKey?: Record<string, { hits?: Hit[] }> } } } };
  }).__PRELOADED_STATE__?.__STATE_MANAGEMENT_LIBRARY?.store?.productStore;
  const hits = Object.values(store?.searchResultsByKey ?? {}).flatMap((r) => r.hits ?? []);

  const out: Product[] = [];
  const seen = new Set<string>();
  for (const h of hits) {
    if (!h.productId || !h.productName || !h.price || h.currency !== "GBP" || seen.has(h.productId)) continue;
    seen.add(h.productId);
    const href = html.match(new RegExp(`href="(/[^"]*-${h.productId.replace(/[^\w-]/g, "")}\\.html)"`))?.[1];
    const colour = h.productId.split("_")[1]?.replace(/([a-z])([A-Z])/g, "$1 $2") ?? "";
    out.push({
      id: `sweatybetty:${h.productId}`,
      title: h.productName,
      brand: "Sweaty Betty",
      category: toCategory(undefined, h.productName),
      colourRaw: colour,
      colourFamily: toColourFamily(colour || h.productName),
      images: [`https://cdn.media.amplience.net/i/SweatyBetty/${h.productId.toLowerCase()}.jpg?$plp-pwa$&fmt=auto`],
      isResale: false,
      rank: out.length,
      offers: [
        {
          retailerId: "sweatybetty",
          retailerName: "Sweaty Betty",
          externalId: h.productId,
          url: href ? `${SITE}${href}` : `${SITE}/search?q=${encodeURIComponent(h.productName)}`,
          priceGbp: h.price,
          sizesInStock: [],
        },
      ],
    });
    if (out.length >= limit) break;
  }
  return out;
}

const adapter: RetailerAdapter = {
  id: "sweatybetty",
  name: "Sweaty Betty",
  tier: "high-street",
  mode: "live",
  async search({ q, limit = 40 }) {
    if (!q.trim()) return [];
    try {
      return await cached(`sweatybetty:${limit}:${q.toLowerCase()}`, async () => {
        const res = await politeFetch(`${SITE}/search?q=${encodeURIComponent(q)}`, { headers: { accept: "text/html" } });
        // no matches comes back as a 404 page
        if (res.status === 404) return [];
        if (!res.ok) throw new Error(`sweatybetty ${res.status}`);
        return parseSweatyBetty(await res.text(), limit);
      });
    } catch (e) {
      console.warn("[sweatybetty]", (e as Error).message);
      return [];
    }
  },
};

export default adapter;
