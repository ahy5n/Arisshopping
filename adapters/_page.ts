import * as cheerio from "cheerio";
import type { Cheerio, CheerioAPI } from "cheerio";
import type { Element } from "domhandler";
import { sortSizes, toCategory, toColourFamily, toSize } from "../lib/normalise";
import type { Product, RetailerAdapter, Tier } from "../lib/types";
import { cached, politeFetch } from "./http";

// Reads a shop's own search results page (brief §4.2, method 2: structured
// data in the HTML). Works on most server-rendered shops without per-shop code.
// Three readers run over the same page and the most complete answer wins:
//   tiles     elements with data-pid / data-product-id, using the analytics
//             JSON most shops attach to each tile, then the visible HTML
//   json-ld   schema.org ItemList / Product blocks
//   app state the largest list of product-like objects in embedded JSON
//             (__NEXT_DATA__, Salesforce PWA's mobify-data, etc.)

export type PageOpts = {
  id: string;
  name: string;
  tier: Tier;
  /** Search page, with {q} where the query goes */
  searchUrl: string;
  resale?: boolean;
  /** Prices in the page are in pence */
  pence?: boolean;
  /** Key holding the current price inside the shop's price object, when it isn't obvious */
  priceKey?: string;
  /** Prepended to relative product links that resolve wrongly against the search page */
  linkPrefix?: string;
  /** Added to the search URL during crawls to get a bigger page, e.g. "&sz=200" on Salesforce sites */
  crawlSuffix?: string;
};

const MAX = 40;

type Found = {
  key: string;
  title?: string;
  brand?: string;
  price?: number;
  was?: number;
  colour?: string;
  category?: string;
  url?: string;
  image?: string;
};

const num = (v: unknown) => {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return undefined;
  const m = v.replace(/,/g, "").match(/\d+(?:\.\d{1,2})?/);
  return m ? parseFloat(m[0]) : undefined;
};

/** First scalar value under a matching key, depth-first. */
function pick(o: unknown, keys: RegExp, depth = 0): unknown {
  if (!o || typeof o !== "object" || depth > 5) return undefined;
  for (const [k, v] of Object.entries(o)) if (keys.test(k) && v !== "" && v != null && typeof v !== "object") return v;
  for (const v of Object.values(o)) {
    const hit = pick(v, keys, depth + 1);
    if (hit !== undefined) return hit;
  }
  return undefined;
}

/** First string under a matching key that passes `ok`, looking inside objects/arrays under that key too. */
function pickStr(o: unknown, keys: RegExp, ok: (v: string) => boolean, depth = 0): string | undefined {
  if (!o || typeof o !== "object" || depth > 4) return undefined;
  for (const [k, v] of Object.entries(o)) {
    if (!keys.test(k)) continue;
    if (typeof v === "string" && ok(v)) return v;
    if (v && typeof v === "object") {
      const inner = pickStr(v, /.*/, ok, depth + 1);
      if (inner) return inner;
    }
  }
  for (const v of Object.values(o)) {
    if (v && typeof v === "object") {
      const hit = pickStr(v, keys, ok, depth + 1);
      if (hit) return hit;
    }
  }
  return undefined;
}

function fromJson(o: unknown): Partial<Found> {
  const price = num(pick(o, /^(price|salePrice|sale_price|item_price|currentPrice|unit_price|nowPrice|sellingPrice)$/i));
  const orig = num(pick(o, /^(originalPrice|original_price|listPrice|list_price|wasPrice|was_price|rrp|fullPrice|regularPrice|standardPrice)$/i));
  const discount = num(pick(o, /^discount$/i));
  return {
    title: pick(o, /^(name|item_name|productName|product_name|title|displayName)$/i) as string | undefined,
    brand: pick(o, /^(brand|item_brand|brandName)$/i) as string | undefined,
    price,
    was: orig && price && orig > price ? orig : discount && price && discount > 0 && discount < price * 3 ? +(price + discount).toFixed(2) : undefined,
    colour: pick(o, /^(colou?r|item_colou?r|colourName|colorName)$/i) as string | undefined,
    category: pick(o, /^(category|item_category\d?|category0|category_level_2|buyers_category|categoryName)$/i) as string | undefined,
    url: pick(o, /^(url|productUrl|product_url|link)$/i) as string | undefined,
    image: pickStr(o, /^(image|images|imageUrl|image_url|img)$/i, isImg),
  };
}

const isImg = (v: string) => (/^(https?:)?\/\//.test(v) || v.startsWith("/")) && /\.(jpe?g|png|webp|avif)|\/image|\/i\/|media|cdn|\$|\?/i.test(v) && !/\.svg/i.test(v);
const isLink = (v: string) => /^(https?:\/\/|\/)/.test(v) && !/\.(jpe?g|png|webp|avif|svg)(\?|$)/i.test(v);

// ---------- tiles ----------

/** Some shops (Sandro, Maje) base64-encode links to keep crawlers off them. */
function realLink(h: string | undefined): string | undefined {
  if (!h || h === "#" || h.startsWith("javascript")) return undefined;
  if (/^[A-Za-z0-9+/=]{24,}$/.test(h)) {
    try {
      const d = Buffer.from(h, "base64").toString("utf8");
      if (/^(https?:\/\/|\/)/.test(d)) return d;
    } catch {}
    return undefined;
  }
  return h;
}

const isActionLink = (h: string) => /demandware\.store|wishlist|Cart-|ShowQuickView|login|account|#/i.test(h);

function linkOf($: CheerioAPI, t: Cheerio<Element>): string | undefined {
  const cands = t
    .find("a[href], [data-href], [data-url]")
    .toArray()
    .flatMap((a) => [$(a).attr("href"), $(a).attr("data-href"), $(a).attr("data-url")])
    .map(realLink)
    .filter((h): h is string => Boolean(h) && !isActionLink(h!));
  return cands.find((h) => /\.html|\/p\/|\/product|\/products\/|\/prd\//i.test(h)) ?? cands[0];
}

function imageOf($: CheerioAPI, t: Cheerio<Element>): string | undefined {
  for (const el of t.find("img, source").toArray()) {
    const a = (k: string) => $(el).attr(k);
    const cands = [a("data-original-img"), a("data-image-url"), a("data-src"), a("src"), a("data-srcset")?.split(/[\s,]+/)[0], a("srcset")?.split(/[\s,]+/)[0]];
    const good = cands.find((c) => c && !c.startsWith("data:") && !/placeholder|blank|spacer|logo|icon|\.svg|badge|swatch/i.test(c) && c.length > 12);
    if (good) return good;
  }
  return undefined;
}

function priceOf($: CheerioAPI, t: Cheerio<Element>): { price?: number; was?: number } {
  const seen: { v: number; struck: boolean }[] = [];
  for (const el of t.find('[class*="price" i], [itemprop="price"], [data-price], s, del').toArray()) {
    const $el = $(el);
    if ($el.find('[class*="price" i]').length) continue; // only innermost price elements
    const text = $el.attr("content") ?? $el.attr("data-price") ?? $el.text();
    const m = text.replace(/,/g, "").match(/£?\s?(\d+(?:\.\d{2})?)/);
    if (!m || !/£|\d\.\d\d|content|data-price/.test(text + ($el.attr("content") ? "content" : ""))) continue;
    const cls = `${$el.attr("class") ?? ""} ${el.tagName} ${$el.parent().attr("class") ?? ""}`;
    seen.push({ v: parseFloat(m[1]), struck: /strike|was|old|original|list|standard|rrp|before|crossed|\bdel\b|\bs\b/i.test(cls) });
  }
  if (!seen.length) return {};
  const live = seen.filter((s) => !s.struck).map((s) => s.v);
  const struck = seen.filter((s) => s.struck).map((s) => s.v);
  const price = Math.min(...(live.length ? live : seen.map((s) => s.v)));
  const was = struck.length ? Math.max(...struck) : undefined;
  return { price, was: was && was > price ? was : undefined };
}

function attrJson($: CheerioAPI, els: Element[]): Partial<Found> {
  const parts: Partial<Found>[] = [];
  for (const el of els) {
    for (const [k, v] of Object.entries(el.attribs ?? {})) {
      if (!k.startsWith("data-") || !v.trim().startsWith("{")) continue;
      try {
        parts.push(fromJson(JSON.parse(v)));
      } catch {}
    }
  }
  return Object.assign({}, ...parts.map((x) => Object.fromEntries(Object.entries(x).filter(([, v]) => v !== undefined))));
}

const ID_ATTRS = ["data-pid", "data-product-id", "data-productid", "data-item-id", "data-product-sku", "data-product-code", "data-sku", "data-style-id", "data-productcode"];

function fromTiles($: CheerioAPI): Found[] {
  const best = new Map<string, Element>();
  const score = (e: Element) => {
    const t = $(e);
    return (t.find("img, source").length ? 1000 : 0) + (linkOf($, t) ? 500 : 0) + Math.min(t.text().length, 400);
  };
  // some shops (Matalan) put the id only inside a tracking JSON on the tile
  const trackedId = (el: Element) => {
    const raw = $(el).attr("data-product-tracking") ?? $(el).attr("data-tracking-product");
    if (!raw) return undefined;
    try {
      const j = JSON.parse(raw) as Record<string, unknown>;
      return String(j.sku ?? j.id ?? j.productId ?? j.externalId ?? "") || undefined;
    } catch {
      return undefined;
    }
  };
  for (const el of $([...ID_ATTRS, "data-product-tracking", "data-tracking-product"].map((a) => `[${a}]`).join(",")).toArray()) {
    const key = ID_ATTRS.map((a) => $(el).attr(a)).find(Boolean) ?? trackedId(el as Element) ?? "";
    if (!key || key.includes("{{")) continue;
    // the id also sits on wishlist buttons and swatches; climb to the element that looks like a whole tile
    let node: Element = el as Element;
    const whole = (n: Element) => $(n).find("img, source").length > 0 && /£|&pound;|\d\.\d\d/.test($(n).text());
    for (let i = 0; i < 6 && !whole(node) && node.parent && node.parent.type === "tag"; i++) node = node.parent as unknown as Element;
    const prev = best.get(key);
    if (!prev || score(node) > score(prev)) best.set(key, node);
  }

  return [...best.entries()].map(([key, el]) => {
    const t = $(el);
    const j = attrJson($, [el, ...t.find("*").toArray().filter((x) => Object.keys(x.attribs ?? {}).some((k) => k.startsWith("data-") && (x.attribs[k] ?? "").trim().startsWith("{")))]);
    const nameEl = t.find('[itemprop="name"], .pdp-link a, .product-name, [class*="tile__name" i], [class*="product-title" i], [class*="productName" i], [class*="tile-name" i], [class*="name" i]').first();
    const dom = priceOf($, t);
    return {
      key,
      title: j.title ?? (nameEl.text().trim() || t.find("img").first().attr("alt")),
      brand: j.brand,
      price: dom.price ?? j.price,
      was: dom.was ?? j.was,
      colour: j.colour,
      category: j.category,
      url: linkOf($, t) ?? j.url,
      image: imageOf($, t) ?? j.image,
    };
  });
}

// ---------- json-ld ----------

function fromJsonLd($: CheerioAPI): Found[] {
  const out: Found[] = [];
  $('script[type="application/ld+json"]').each((_, s) => {
    let data: unknown;
    try {
      data = JSON.parse($(s).text());
    } catch {
      return;
    }
    const nodes: Record<string, unknown>[] = [];
    const walk = (n: unknown) => {
      if (Array.isArray(n)) return n.forEach(walk);
      if (!n || typeof n !== "object") return;
      const o = n as Record<string, unknown>;
      const type = o["@type"];
      if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) nodes.push(o);
      for (const k of ["@graph", "itemListElement", "item", "mainEntity"]) if (o[k]) walk(o[k]);
    };
    walk(data);
    for (const p of nodes) {
      const offers = (Array.isArray(p.offers) ? p.offers[0] : p.offers) as Record<string, unknown> | undefined;
      const img = Array.isArray(p.image) ? p.image[0] : p.image;
      out.push({
        key: String(p.sku ?? p.productID ?? p.url ?? p.name),
        title: p.name as string,
        brand: typeof p.brand === "object" ? (p.brand as { name?: string })?.name : (p.brand as string),
        price: num(offers?.price ?? offers?.lowPrice),
        colour: p.color as string,
        url: (p.url || offers?.url) as string,
        image: typeof img === "string" ? img : (img as { url?: string })?.url,
      });
    }
  });
  return out;
}

// ---------- embedded app state ----------

const NAME = /^(name|title|productName|product_name|displayName|item_name)$/i;

/** A string, or the first string inside a localised object like {"en-GB": "…"}. */
function text(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && !Array.isArray(v)) return Object.values(v).find((x): x is string => typeof x === "string");
  return undefined;
}

function looksLikeProduct(o: unknown): boolean {
  if (!o || typeof o !== "object" || Array.isArray(o)) return false;
  const keys = Object.keys(o);
  return keys.some((k) => NAME.test(k)) && keys.some((k) => /price/i.test(k));
}

function fromAppState($: CheerioAPI, o?: Pick<PageOpts, "priceKey">): Found[] {
  let bestArr: Record<string, unknown>[] = [];
  let bestScore = 0;
  // a page can hold several product lists (analytics, recommendations…); prefer the most complete
  const completeness = (arr: Record<string, unknown>[]) =>
    arr.reduce((n, p) => n + (looksLikeProduct(p) ? 1 : 0) + (pickStr(p, /url|link|href|path/i, isLink) ? 1 : 0) + (pickStr(p, /image|img|thumbnail|picture|media/i, isImg) ? 1 : 0), 0);
  const visit = (n: unknown, depth: number) => {
    if (!n || typeof n !== "object" || depth > 16) return;
    if (Array.isArray(n)) {
      if (n.length >= 3 && n.filter(looksLikeProduct).length / n.length > 0.6) {
        const sc = completeness(n as Record<string, unknown>[]);
        if (sc > bestScore) [bestArr, bestScore] = [n as Record<string, unknown>[], sc];
      }
      n.forEach((x) => visit(x, depth + 1));
      return;
    }
    Object.values(n).forEach((x) => visit(x, depth + 1));
  };
  $('script[type="application/json"], script#__NEXT_DATA__').each((_, s) => {
    try {
      visit(JSON.parse($(s).text()), 0);
    } catch {}
  });
  // window.__PRELOADED_STATE__ = {…}; and friends
  $("script:not([src])").each((_, sc) => {
    const t = $(sc).text();
    for (const m of t.matchAll(/(?:window\.)?__[A-Z][A-Z_]+__\s*=\s*(?=[{[])/g)) {
      const start = m.index! + m[0].length;
      let depth = 0, inStr = false, esc = false, end = -1;
      for (let i = start; i < t.length; i++) {
        const c = t[i];
        if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
        if (c === '"') inStr = true;
        else if (c === "{" || c === "[") depth++;
        else if ((c === "}" || c === "]") && --depth === 0) { end = i + 1; break; }
      }
      if (end > 0) {
        try {
          visit(JSON.parse(t.slice(start, end)), 0);
        } catch {}
      }
    }
  });
  // Next.js app router streams its data as self.__next_f.push([1,"<id>:<json>\n…"]) chunks
  const flight = $("script")
    .toArray()
    .map((s) => $(s).text())
    .filter((t) => t.includes("self.__next_f.push"))
    .map((t) => {
      const m = t.match(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/);
      try {
        return m ? (JSON.parse(m[1]) as string) : "";
      } catch {
        return "";
      }
    })
    .join("");
  for (const line of flight.split("\n")) {
    const i = line.indexOf(":");
    const body = line.slice(i + 1);
    if (i < 0 || !/^[[{]/.test(body)) continue;
    try {
      visit(JSON.parse(body), 0);
    } catch {}
  }
  return bestArr.filter(looksLikeProduct).map((p) => {
    const j = fromJson(p);
    const priceObj = Object.entries(p).find(([k, v]) => /price/i.test(k) && v && typeof v === "object")?.[1];
    const fromObj = (re: RegExp) => (priceObj && typeof priceObj === "object" ? num(pick(priceObj, re)) : undefined);
    const price = (o?.priceKey ? fromObj(new RegExp(`^${o.priceKey}$`)) : undefined) || j.price || fromObj(/^(value|amount|current|now|sale|min|price|selling)/i);
    const was = j.was ?? fromObj(/^(was|original|list|rrp|previous|old|max|regular)/i);
    return {
      key: String(pick(p, /^(id|objectId|objectID|productId|product_id|sku|code|itemId|masterId|styleId|handle)$/i) ?? j.title),
      title: text(Object.entries(p).find(([k]) => NAME.test(k))?.[1]) ?? j.title,
      brand: j.brand ?? text(p.brand),
      price,
      was: was && price && was > price ? was : undefined,
      colour: j.colour,
      category: j.category,
      url:
        pickStr(p, /^(url|link|href|productUrl|pdpUrl|seoUrl|canonicalUrl|path|productLink|url_key|slug|seoPath|pdpPath)$/i, isLink) ??
        // bare slugs like "crepe-ruffle-sleeve-maxi-dress-black"
        (() => {
          const slug = text(p.productUrl) ?? text(p.productLink) ?? text(p.slug) ?? text(p.url_key) ?? text(p.handle);
          return slug && /^[\w-]+[\w#=/.-]*$/.test(slug) ? `/${slug}` : undefined;
        })(),
      image: pickStr(p, /image|img|thumbnail|picture|media|photo/i, isImg),
    };
  });
}

// ---------- assembly ----------

/** Ask the shop's image CDN for ~600px wide, which is plenty for a card. */
const sized = (u: string) =>
  u
    .replace(/\bw_\d{3,4}\b/, "w_600")
    .replace(/([?&](?:w|width|sw|wid|imwidth)=)\d{2,4}/i, "$1600")
    .replace(/([?&](?:h|height|sh|hei)=)\d{2,4}/i, (m, k) => (/[?&](?:w|width|sw|wid)=/i.test(u) ? `${k}800` : m));

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
const titleCase = (s: string) => (s === s.toUpperCase() ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : s);

/** For scripts/debugging: what each reader found before filtering. */
export function debugPage(html: string) {
  const $ = cheerio.load(html, { scriptingEnabled: false });
  return { tiles: fromTiles($), ld: fromJsonLd($), app: fromAppState($) };
}

export function parseSearchPage(html: string, o: PageOpts, base: string, max = MAX): Product[] {
  const $ = cheerio.load(html, { scriptingEnabled: false });
  // children's and men's lines turn up in some shops' general search
  const notForHer = /^(girls?|boys?|kids?|baby|babies|toddler|mens?|men's)\b/i;
  const usable = (fs: Found[]) => fs.filter((f) => f.title && f.price && f.price > 0 && f.url && !notForHer.test(decode(f.title)));
  const found = [fromTiles($), fromJsonLd($), fromAppState($, o)]
    .map(usable)
    .sort((a, b) => b.length + b.filter((f) => f.image).length - (a.length + a.filter((f) => f.image).length))[0];
  const abs = (u: string) => (u.startsWith("//") ? `https:${u}` : new URL(u, base).toString());

  // embedded data often lacks pictures that the page itself shows; match them up by alt text
  if (found.some((f) => !f.image)) {
    const byAlt = new Map<string, string>();
    $("img[alt]").each((_, el) => {
      const src = imageOf($, $(el).parent() as Cheerio<Element>) ?? $(el).attr("src");
      const alt = ($(el).attr("alt") ?? "").trim().toLowerCase();
      if (src && alt && !byAlt.has(alt)) byAlt.set(alt, src);
    });
    for (const f of found) if (!f.image && f.title) f.image = byAlt.get(decode(f.title).toLowerCase());
  }

  return found.slice(0, max).map((f, i) => {
    const title = titleCase(decode(f.title!));
    const category = toCategory(f.category, title);
    const brand = f.brand ? titleCase(decode(f.brand)) : o.name;
    return {
      id: `${o.id}:${f.key}`,
      title,
      brand: brand.toLowerCase() === o.name.toLowerCase() ? o.name : brand,
      category,
      colourRaw: f.colour ?? "",
      colourFamily: toColourFamily(f.colour || title),
      images: f.image ? [sized(abs(decode(f.image)))] : [],
      isResale: Boolean(o.resale),
      rank: i,
      offers: [
        {
          retailerId: o.id,
          retailerName: o.name,
          externalId: f.key,
          url: o.linkPrefix && f.url!.startsWith("/") ? o.linkPrefix + decode(f.url!) : abs(decode(f.url!)),
          priceGbp: o.pence ? f.price! / 100 : f.price!,
          wasPriceGbp: f.was && f.was > f.price! ? (o.pence ? f.was / 100 : f.was) : undefined,
          sizesInStock: sortSizes(([] as string[]).map((s) => toSize(s, category))),
        },
      ],
    };
  });
}

export function pageAdapter(o: PageOpts): RetailerAdapter {
  return {
    id: o.id,
    name: o.name,
    tier: o.tier,
    mode: "live",
    async search({ q, limit = MAX }) {
      if (!q.trim()) return [];
      try {
        return await cached(`${o.id}:${limit}:${q.toLowerCase()}`, async () => {
          const url = o.searchUrl.replace("{q}", encodeURIComponent(q).replace(/%20/g, "+")) + (limit > MAX && o.crawlSuffix ? o.crawlSuffix : "");
          const res = await politeFetch(url, { headers: { accept: "text/html" } });
          if (!res.ok) throw new Error(`${o.id} ${res.status}`);
          return parseSearchPage(await res.text(), o, res.url || url, limit);
        });
      } catch (e) {
        console.warn(`[${o.id}]`, (e as Error).message);
        return [];
      }
    },
  };
}
