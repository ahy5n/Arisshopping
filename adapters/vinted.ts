import { toCategory, toColourFamily, toSize } from "../lib/normalise";
import type { Product, RetailerAdapter } from "../lib/types";
import { cached, politeFetch } from "./http";

// Vinted's catalogue page streams its results (Next.js flight data) as escaped
// JSON: each listing is a "productItem" with title, link, price and photos,
// plus an "itemBox" whose lines are brand and "size · condition".

const SITE = "https://www.vinted.co.uk";

const str = (chunk: string, key: string) => chunk.match(new RegExp(`"${key}":"((?:[^"\\\\]|\\\\.)*)"`))?.[1];
const money = (chunk: string, key: string) => {
  const m = chunk.match(new RegExp(`"${key}":\\{"amount":"([\\d.]+)","currencyCode":"GBP"`));
  return m ? parseFloat(m[1]) : undefined;
};

export function parseVinted(html: string, limit = 40): Product[] {
  // the flight data is a JS string: undo one level of escaping
  const flat = html.replace(/\\"/g, '"').replace(/\\\\u0026/g, "&").replace(/\\u0026/g, "&");
  const chunks = flat.split('"productItem":{').slice(1);
  const out: Product[] = [];
  const seen = new Set<string>();
  for (const c of chunks) {
    const chunk = c.slice(0, 4000);
    const id = chunk.match(/^"id":(\d+)/)?.[1];
    const title = str(chunk, "title");
    const url = str(chunk, "url");
    const total = money(chunk, "totalItemPrice") ?? money(chunk, "price");
    if (!id || !title || !url || !total || seen.has(id)) continue;
    seen.add(id);
    const brand = str(chunk, "firstLine");
    const [size, condition] = (str(chunk, "secondLine") ?? "").split(" · ");
    const thumb = str(chunk, "thumbnailUrl");
    const category = toCategory(undefined, title);
    out.push({
      id: `vinted:${id}`,
      title,
      brand: brand && brand !== "$undefined" ? brand : "Vinted",
      category,
      colourRaw: "",
      colourFamily: toColourFamily(title),
      images: thumb ? [thumb] : [], // signed URL: resizing it breaks the signature
      isResale: true,
      description: condition ? `Condition: ${condition}. Price includes Vinted's buyer protection fee.` : undefined,
      rank: out.length,
      offers: [
        {
          retailerId: "vinted",
          retailerName: "Vinted",
          externalId: id,
          url: url.startsWith("http") ? url : `${SITE}${url}`,
          priceGbp: total,
          sizesInStock: size && size !== "$undefined" ? [toSize(size, category)] : [],
        },
      ],
    });
    if (out.length >= limit) break;
  }
  return out;
}

const adapter: RetailerAdapter = {
  id: "vinted",
  name: "Vinted",
  tier: "resale",
  mode: "live",
  async search({ q, limit = 40 }) {
    if (!q.trim()) return [];
    try {
      return await cached(`vinted:${limit}:${q.toLowerCase()}`, async () => {
        // catalog[]=1904 is Women
        const res = await politeFetch(`${SITE}/catalog?search_text=${encodeURIComponent(q)}&catalog[]=1904`, { headers: { accept: "text/html" } });
        if (!res.ok) throw new Error(`vinted ${res.status}`);
        return parseVinted(await res.text(), limit);
      });
    } catch (e) {
      console.warn("[vinted]", (e as Error).message);
      return [];
    }
  },
};

export default adapter;
