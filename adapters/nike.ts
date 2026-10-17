import { toCategory, toColourFamily } from "../lib/normalise";
import type { Product, RetailerAdapter } from "../lib/types";
import { cached, politeFetch } from "./http";

// Nike's public product-wall API, the same one nike.com/gb uses for search.
const CHANNEL = "d9a5bc42-4b9c-4976-858a-f159cf99c647"; // nike.com web

type NikeProduct = {
  productCode: string;
  productType: string;
  copy: { title: string; subTitle?: string };
  displayColors?: { simpleColor?: { label?: string }; colorDescription?: string };
  prices: { currency: string; currentPrice: number; initialPrice?: number };
  colorwayImages?: { portraitURL?: string; squarishURL?: string };
  pdpUrl?: { url?: string };
};

const adapter: RetailerAdapter = {
  id: "nike",
  name: "Nike",
  tier: "high-street",
  mode: "live",
  async search({ q, limit = 40 }) {
    if (!q.trim()) return [];
    try {
      return await cached(`nike:${limit}:${q.toLowerCase()}`, async () => {
        const terms = /\bwom[ae]n'?s?\b/i.test(q) ? q : `womens ${q}`;
        const url =
          `https://api.nike.com/discover/product_wall/v1/marketplace/GB/language/en-GB/consumerChannelId/${CHANNEL}` +
          `?path=/gb/w&queryType=SEARCH&searchTerms=${encodeURIComponent(terms)}&anchor=0&count=${limit > 50 ? 100 : 50}`;
        const res = await politeFetch(url, { headers: { accept: "application/json", "nike-api-caller-id": "com.nike.commerce.nikedotcom.web" } });
        if (!res.ok) throw new Error(`nike ${res.status}`);
        const data = (await res.json()) as { productGroupings?: { products?: NikeProduct[] }[] };
        const out: Product[] = [];
        for (const g of data.productGroupings ?? []) {
          const p = g.products?.[0];
          if (!p || p.prices?.currency !== "GBP" || !p.pdpUrl?.url) continue;
          // women's and unisex only
          if (/\bmen'?s\b/i.test(p.copy.subTitle ?? "") && !/wom[ae]n/i.test(p.copy.subTitle ?? "")) continue;
          if (/\b(kids|younger|older|baby|toddler)\b/i.test(p.copy.subTitle ?? "")) continue;
          const colour = p.displayColors?.simpleColor?.label ?? "";
          const title = `${p.copy.title}${p.copy.subTitle ? ` ${p.copy.subTitle.replace(/^Women's\s+/i, "")}` : ""}`;
          const now = p.prices.currentPrice;
          out.push({
            id: `nike:${p.productCode}`,
            title,
            brand: "Nike",
            category: toCategory(p.productType === "FOOTWEAR" ? "shoes" : undefined, title),
            colourRaw: p.displayColors?.colorDescription?.split("/")[0] ?? colour,
            colourFamily: toColourFamily(colour || title),
            images: [p.colorwayImages?.portraitURL ?? p.colorwayImages?.squarishURL].filter(Boolean) as string[],
            isResale: false,
            rank: out.length,
            offers: [
              {
                retailerId: "nike",
                retailerName: "Nike",
                externalId: p.productCode,
                url: p.pdpUrl.url,
                priceGbp: now,
                wasPriceGbp: p.prices.initialPrice && p.prices.initialPrice > now ? p.prices.initialPrice : undefined,
                sizesInStock: [],
              },
            ],
          });
          if (out.length >= limit) break;
        }
        return out;
      });
    } catch (e) {
      console.warn("[nike]", (e as Error).message);
      return [];
    }
  },
};

export default adapter;
