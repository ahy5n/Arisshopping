import { toCategory, toColourFamily } from "../lib/normalise";
import type { Product, RetailerAdapter } from "../lib/types";
import { cached, politeFetch } from "./http";

// eBay blocks scraping, but its official Browse API is free for personal use.
// Needs EBAY_CLIENT_ID and EBAY_CLIENT_SECRET (see README). Without them this
// adapter is switched off and Settings says so.

const WOMENS_CLOTHING = "15724";
const WOMENS_SHOES = "3034";
const WOMENS_BAGS = "169291";

let token: { value: string; expires: number } | null = null;

export const ebayConfigured = () => Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);

async function getToken() {
  if (token && token.expires > Date.now() + 60_000) return token.value;
  const basic = Buffer.from(`${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`).toString("base64");
  const res = await politeFetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: { authorization: `Basic ${basic}`, "content-type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
  });
  if (!res.ok) throw new Error(`ebay token ${res.status}`);
  const t = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: t.access_token, expires: Date.now() + t.expires_in * 1000 };
  return token.value;
}

type Item = {
  itemId: string;
  title: string;
  price?: { value: string; currency: string };
  marketingPrice?: { originalPrice?: { value: string } };
  image?: { imageUrl: string };
  additionalImages?: { imageUrl: string }[];
  itemWebUrl: string;
  condition?: string;
  categories?: { categoryName: string }[];
};

const adapter: RetailerAdapter = {
  id: "ebay",
  name: "eBay UK",
  tier: "resale",
  mode: "live",
  async search({ q }) {
    if (!ebayConfigured() || !q.trim()) return [];
    try {
      return await cached(`ebay:${q.toLowerCase()}`, async () => {
        const params = new URLSearchParams({
          q,
          category_ids: [WOMENS_CLOTHING, WOMENS_SHOES, WOMENS_BAGS].join(","),
          limit: "40",
          filter: "buyingOptions:{FIXED_PRICE},itemLocationCountry:GB,priceCurrency:GBP",
        });
        const res = await politeFetch(`https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`, {
          headers: { authorization: `Bearer ${await getToken()}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_GB" },
        });
        if (!res.ok) throw new Error(`ebay ${res.status}`);
        const data = (await res.json()) as { itemSummaries?: Item[] };
        return (data.itemSummaries ?? [])
          .filter((it) => it.price?.currency === "GBP")
          .map((it, i): Product => {
            const price = parseFloat(it.price!.value);
            const was = parseFloat(it.marketingPrice?.originalPrice?.value ?? "");
            const brandNew = /^new/i.test(it.condition ?? "");
            return {
              id: `ebay:${it.itemId}`,
              title: it.title,
              brand: "",
              category: toCategory(it.categories?.[0]?.categoryName, it.title),
              colourRaw: "",
              colourFamily: toColourFamily(it.title.match(/\b(black|white|cream|beige|brown|grey|pink|red|orange|yellow|green|blue|navy|purple|gold|silver)\b/i)?.[1]),
              images: [it.image?.imageUrl, ...(it.additionalImages ?? []).map((x) => x.imageUrl)].filter(Boolean) as string[],
              isResale: !brandNew,
              rank: i,
              offers: [
                {
                  retailerId: "ebay",
                  retailerName: "eBay UK",
                  externalId: it.itemId,
                  url: it.itemWebUrl,
                  priceGbp: price,
                  wasPriceGbp: was > price ? was : undefined,
                  sizesInStock: [],
                },
              ],
            };
          });
      });
    } catch (e) {
      console.warn("[ebay]", (e as Error).message);
      return [];
    }
  },
};

export default adapter;
