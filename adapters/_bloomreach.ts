import { sortSizes, toCategory, toColourFamily, toSize } from "../lib/normalise";
import type { Product, RetailerAdapter, Tier } from "../lib/types";
import { cached, politeFetch } from "./http";

// Shops whose site search is Bloomreach Discovery. This is Bloomreach's public
// search API, called with the account id each shop's own pages send to every
// visitor's browser.

type Doc = {
  pid: string;
  title: string;
  brand?: string;
  price?: number;
  sale_price?: number;
  thumb_image?: string;
  url?: string;
  sizes?: string[];
  colour?: string;
  variants?: { colour?: string[] }[];
  [extra: string]: unknown;
};

type Opts = {
  id: string;
  name: string;
  tier: Tier;
  accountId: string;
  domainKey: string;
  site: string;
  /** Bloomreach filter query, e.g. gender:"women" */
  fq?: string;
  /** Prices come in pence */
  pence?: boolean;
  /** Turn the doc's url field into a full product link */
  link?: (d: Doc) => string;
  image?: (d: Doc) => string | undefined;
  /** Some accounts serve several sites; this picks the UK one */
  viewId?: string;
  /** Extra fields to request, e.g. "rrp,was_price" */
  extraFields?: string;
  /** Full price when it isn't the plain `price` field (e.g. RRP) */
  wasOf?: (d: Doc) => number | undefined;
};

const FIELDS = "pid,title,brand,price,sale_price,thumb_image,url,sizes,colour,variants";
const titleCase = (s: string) => (s === s.toLowerCase() ? s.replace(/\b\w/g, (c) => c.toUpperCase()) : s);
const BRAND_NAMES: Record<string, string> = {
  friendslikethese: "Friends Like These", next: "Next", reiss: "Reiss", primark: "Primark",
  victoriassecret: "Victoria's Secret", victoriassecretpink: "Victoria's Secret PINK",
};

export function bloomreachAdapter(o: Opts): RetailerAdapter {
  return {
    id: o.id,
    name: o.name,
    tier: o.tier,
    mode: "live",
    async search({ q, limit = 40 }) {
      if (!q.trim()) return [];
      try {
        return await cached(`${o.id}:${limit}:${q.toLowerCase()}`, async () => {
          // Bloomreach returns at most 200 rows a time; crawls ask for more, so page through
          const docs: Doc[] = [];
          for (let start = 0; start < limit; start += 200) {
            const params = new URLSearchParams({
              account_id: o.accountId,
              domain_key: o.domainKey,
              request_type: "search",
              search_type: "keyword",
              q,
              rows: String(Math.min(limit - start, 200)),
              start: String(start),
              fl: o.extraFields ? `${FIELDS},${o.extraFields}` : FIELDS,
              url: o.site,
              _br_uid_2: "aris-shopping",
            });
            if (o.fq) params.append("fq", o.fq);
            if (o.viewId) params.append("view_id", o.viewId);
            const res = await politeFetch(`https://core.dxpapi.com/api/v1/core/?${params}`, { headers: { accept: "application/json" } }, o.id);
            if (!res.ok) throw new Error(`${o.id} ${res.status}`);
            const data = (await res.json()) as { response?: { docs: Doc[]; numFound?: number } };
            const page = data.response?.docs ?? [];
            docs.push(...page);
            if (page.length < 200 || docs.length >= (data.response?.numFound ?? 0)) break;
          }
          const k = o.pence ? 0.01 : 1;
          return docs
            .filter((d) => d.title && (d.sale_price ?? d.price))
            .slice(0, limit)
            .map((d, i): Product => {
              const title = titleCase(d.title.trim());
              const category = toCategory(undefined, title);
              const price = +((d.sale_price ?? d.price)! * k).toFixed(2);
              const fullRaw = o.wasOf ? o.wasOf(d) : d.price;
              const full = fullRaw ? +(fullRaw * k).toFixed(2) : undefined;
              const colour = d.colour ?? d.variants?.[0]?.colour?.[0] ?? "";
              const img = o.image ? o.image(d) : d.thumb_image;
              const brandKey = (d.brand ?? "").toLowerCase();
              return {
                id: `${o.id}:${d.pid}`,
                title,
                brand: BRAND_NAMES[brandKey] ?? (d.brand ? titleCase(d.brand) : o.name),
                category,
                colourRaw: colour,
                colourFamily: toColourFamily(colour || title),
                images: img ? [img] : [],
                isResale: false,
                rank: i,
                offers: [
                  {
                    retailerId: o.id,
                    retailerName: o.name,
                    externalId: d.pid,
                    url: o.link ? o.link(d) : d.url!.startsWith("http") ? d.url! : `${o.site}/${d.url}`,
                    priceGbp: price,
                    wasPriceGbp: full && full > price ? full : undefined,
                    sizesInStock: sortSizes((d.sizes ?? []).map((s) => toSize(s, category))),
                  },
                ],
              };
            });
        });
      } catch (e) {
        console.warn(`[${o.id}]`, (e as Error).message);
        return [];
      }
    },
  };
}
