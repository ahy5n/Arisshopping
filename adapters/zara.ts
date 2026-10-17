import { sortSizes, toCategory, toColourFamily, toSize } from "../lib/normalise";
import type { Product, RetailerAdapter } from "../lib/types";
import { cached, politeFetch } from "./http";

// Zara's own storefront search JSON (what zara.com/uk calls when you search).
const STORE = 10706; // UK

type Money = { value: number; currency: { exponent: number } };
type Component = {
  identifier: { id: string };
  name: string;
  classification?: { family?: { name: string }; subfamily?: { name: string } };
  color?: { name: string };
  pricing?: { price: { current: Money; old?: Money; original?: Money } };
  media?: { asset: { type: string; url: string } }[];
  seo?: { keyword: string; seoProductId: string; discernProductId: number };
  sizes?: { nomenclature: { name: string }; availability: string }[];
  state?: { availability: string };
};

const gbp = (m?: Money) => (m ? Math.round(m.value * 10 ** m.currency.exponent * 100) / 100 : undefined);
const title = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const adapter: RetailerAdapter = {
  id: "zara",
  name: "Zara",
  tier: "high-street",
  mode: "live",
  async search({ q, limit = 40 }) {
    if (!q.trim()) return [];
    try {
      return await cached(`zara:${limit}:${q.toLowerCase()}`, async () => {
        const params = new URLSearchParams({ query: q, clientId: "web-za", language: "en-GB", section: "WOMAN", limit: String(Math.min(limit, 200)), filter: "searchSection:WOMAN", ajax: "true" });
        const res = await politeFetch(`https://www.zara.com/api/storefront/2/stores/${STORE}/grids/search?${params}`, { headers: { accept: "application/json" } });
        if (!res.ok) throw new Error(`zara ${res.status}`);
        const data = (await res.json()) as { components: Record<string, Component> };
        return Object.values(data.components)
          .filter((c) => c.name && c.seo && c.state?.availability !== "out_of_stock" && gbp(c.pricing?.price?.current))
          .slice(0, limit)
          .map((c, i): Product => {
            const name = title(c.name);
            const category = toCategory(c.classification?.family?.name === "VESTIDO" ? "dress" : undefined, name);
            const price = gbp(c.pricing!.price.current)!;
            const was = gbp(c.pricing!.price.old ?? c.pricing!.price.original);
            const img = c.media?.find((m) => m.asset.type === "image")?.asset.url;
            return {
              id: `zara:${c.identifier.id}`,
              title: name,
              brand: "Zara",
              category,
              colourRaw: c.color?.name ?? "",
              colourFamily: toColourFamily(c.color?.name ?? name),
              images: img ? [img.replace("{width}", "600")] : [],
              isResale: false,
              rank: i,
              offers: [
                {
                  retailerId: "zara",
                  retailerName: "Zara",
                  externalId: c.identifier.id,
                  url: `https://www.zara.com/uk/en/${c.seo!.keyword}-p${c.seo!.seoProductId}.html?v1=${c.seo!.discernProductId}`,
                  priceGbp: price,
                  wasPriceGbp: was && was > price ? was : undefined,
                  sizesInStock: sortSizes((c.sizes ?? []).filter((s) => s.availability === "in_stock").map((s) => toSize(s.nomenclature.name, category))),
                },
              ],
            };
          });
      });
    } catch (e) {
      console.warn("[zara]", (e as Error).message);
      return [];
    }
  },
};

export default adapter;
