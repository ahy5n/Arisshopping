import { sortSizes, stripHtml, toCategory, toColourFamily, toSize } from "../lib/normalise";
import type { Product, RetailerAdapter, Tier } from "../lib/types";
import { cached, politeFetch } from "./http";

// Boohoo, PrettyLittleThing, Nasty Gal, Coast and Oasis all search through the
// same Algolia app. These are the public search-only credentials their own
// websites send from every visitor's browser (found in the site's JS bundle).
// If they rotate, the adapter starts failing and shows as unavailable;
// update them from the site's network tab.
const APP_ID = "HNC30IYYNP";
const SEARCH_KEY = "6e5de83d201b6bdaac45d449a9466a42";
const HITS = 40;
// the shops also list marketplace sellers; ask for extra so 40 survive the cut
const ASK = 64;

type Hit = {
  objectID: string;
  name: string;
  brand?: string;
  slug: string;
  price: number;
  wasPrice?: number;
  colour?: string;
  colourFacet?: string;
  images?: string[];
  sizes?: string[];
  isOnStock?: boolean;
  isNew?: boolean;
  categoryTaxonomy?: string;
  styleTaxonomy?: string;
  description?: string;
  colourVariants?: { colour: string; sizesInStock?: string[]; isOnStock?: boolean }[];
  source?: string;
};

type Opts = { id: string; name: string; tier: Tier; index: string; site: string };

function image(url: string) {
  // the shop's own image CDN resizes on request
  return `${url}${url.includes("?") ? "&" : "?"}w=600&qlt=70&fmt=auto`;
}

export function toProduct(h: Hit, o: Opts, rank: number): Product {
  const category = toCategory(h.categoryTaxonomy, h.styleTaxonomy, h.name);
  const variant = h.colourVariants?.find((v) => v.colour === h.colour) ?? h.colourVariants?.[0];
  const sizes = (variant?.sizesInStock ?? h.sizes ?? []).map((s) => toSize(s, category));
  const colourRaw = h.colourFacet ?? h.colour ?? "";
  return {
    id: `${o.id}:${h.objectID}`,
    title: h.name.trim(),
    brand: h.brand ?? o.name,
    category,
    colourRaw,
    colourFamily: toColourFamily(colourRaw),
    images: (h.images ?? []).slice(0, 5).map(image),
    isResale: false,
    isNew: h.isNew,
    description: stripHtml(h.description).slice(0, 600) || undefined,
    rank,
    offers: [
      {
        retailerId: o.id,
        retailerName: o.name,
        externalId: h.objectID,
        url: `https://${o.site}/product/${h.slug}${h.colour ? `?colour=${encodeURIComponent(h.colour)}` : ""}`,
        priceGbp: h.price,
        wasPriceGbp: h.wasPrice && h.wasPrice > h.price ? h.wasPrice : undefined,
        sizesInStock: sortSizes(sizes),
      },
    ],
  };
}

export function boohooGroupAdapter(o: Opts): RetailerAdapter {
  return {
    id: o.id,
    name: o.name,
    tier: o.tier,
    mode: "live",
    async search({ q, limit = HITS }) {
      try {
        return await cached(`${o.id}:${limit}:${q.toLowerCase()}`, async () => {
          const res = await politeFetch(`https://${APP_ID.toLowerCase()}-dsn.algolia.net/1/indexes/${o.index}/query`, {
            method: "POST",
            headers: {
              "x-algolia-application-id": APP_ID,
              "x-algolia-api-key": SEARCH_KEY,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              query: q,
              hitsPerPage: Math.min(1000, Math.round(limit * 1.6)),
              // women's and in stock; not every index can filter on `source`, so sellers are dropped below
              filters: "gender:Female AND isOnStock:true",
            }),
          }, o.id);
          if (!res.ok) throw new Error(`${o.id} ${res.status}`);
          const data = (await res.json()) as { hits: Hit[] };
          return data.hits
            .filter((h) => h.name && h.slug && h.price && (!h.source || h.source === "BOOHOOGROUP"))
            .slice(0, limit)
            .map((h, i) => toProduct(h, o, i));
        });
      } catch (e) {
        console.warn(`[${o.id}]`, (e as Error).message);
        return [];
      }
    },
  };
}
