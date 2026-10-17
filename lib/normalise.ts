import { COLOURS, SHADE_MAP } from "./catalogue";
import type { Category, ColourFamily } from "./types";

// Shops all name things differently. Everything gets squeezed into our
// families here so filters behave the same whichever shop it came from.

const CATEGORY_WORDS: [Category, RegExp][] = [
  ["co-ords", /\bco-?ords?\b|two piece|2 piece|matching set/i],
  ["swimwear", /swim|bikini|tankini/i],
  ["lingerie", /lingerie|\bbra\b|bralette|knicker|thong|brief|nightwear|pyjama|bodysuit lace/i],
  ["activewear", /active|sports? bra|legging|gym|yoga|running/i],
  ["shoes", /shoe|heel|boot|trainer|sneaker|sandal|loafer|flat|mule|pump|slipper|footwear/i],
  ["bags", /\bbags?\b|handbag|tote|clutch|purse|backpack|crossbody/i],
  ["accessories", /accessor|jewel|necklace|earring|belt|scarf|hat|cap\b|sunglass|hair|glove|socks?/i],
  ["dresses", /dress|gown/i],
  ["jeans", /jean|denim/i],
  ["skirts", /skirt|skort/i],
  ["coats", /coat|jacket|blazer|gilet|parka|puffer|trench|outerwear/i],
  ["knitwear", /knit|jumper|cardigan|sweater/i],
  ["trousers", /trouser|pant|jogger|short|cargo|culotte/i],
  ["tops", /top|tee|t-shirt|shirt|blouse|cami|vest|corset|bodysuit|hoodie|sweatshirt|crop/i],
];

/** Pass the shop's own category first, then the title as a fallback. */
export function toCategory(...hints: (string | undefined)[]): Category {
  for (const h of hints) {
    if (!h) continue;
    for (const [cat, re] of CATEGORY_WORDS) if (re.test(h)) return cat;
  }
  return "tops";
}

const FAMILY_NAMES = new Map(COLOURS.map((c) => [c.label.toLowerCase(), c.id]));
FAMILY_NAMES.set("print", "multi");
FAMILY_NAMES.set("multi", "multi");
FAMILY_NAMES.set("gray", "grey");
FAMILY_NAMES.set("off-white", "cream");

export function toColourFamily(raw: string | undefined): ColourFamily {
  const s = (raw ?? "").toLowerCase().trim();
  if (!s) return "multi";
  if (FAMILY_NAMES.has(s)) return FAMILY_NAMES.get(s)!;
  if (SHADE_MAP[s]) return SHADE_MAP[s];
  // "washed khaki", "dusty pink", "black/white" → look at each word, last word wins ties
  const words = s.split(/[\s/&,-]+/).reverse();
  for (const w of words) {
    if (FAMILY_NAMES.has(w)) return FAMILY_NAMES.get(w)!;
    if (SHADE_MAP[w]) return SHADE_MAP[w];
  }
  if (/print|floral|stripe|check|leopard|zebra|multi/.test(s)) return "multi";
  return "multi";
}

const LETTERS = ["XXS", "XS", "S", "M", "L", "XL", "XXL"];

/** "UK 10" → "10", "uk8" → "8", "S/M" stays, shoes become "shoe 5" so they never mix with dress sizes. */
export function toSize(raw: string, category: Category): string {
  // "XS/UK8", "S (UK 10)", "UK 6 / EU 39": the UK number wins
  const uk = raw.toUpperCase().match(/UK\s?(\d{1,2}(?:\.5)?)/);
  if (uk) return category === "shoes" ? `shoe ${uk[1]}` : uk[1];
  const s = raw.trim().toUpperCase().replace(/^UK\s*/, "").replace(/\s+/g, " ");
  if (category === "shoes") {
    const n = s.match(/^(\d+(?:\.5)?)/);
    return n ? `shoe ${n[1]}` : s;
  }
  if (LETTERS.includes(s)) return s;
  const n = s.match(/^(\d{1,2})(?:\b|$)/);
  return n ? n[1] : s;
}

export function sortSizes(sizes: string[]) {
  const key = (s: string) => {
    const shoe = s.startsWith("shoe ") ? 1000 : 0;
    const n = parseFloat(s.replace("shoe ", ""));
    if (!isNaN(n)) return shoe + n;
    const i = LETTERS.indexOf(s);
    return i >= 0 ? 500 + i : 900;
  };
  return [...new Set(sizes)].sort((a, b) => key(a) - key(b));
}

export const sizeLabel = (s: string) => s.replace(/^shoe /, "");

export function stripHtml(html: string | undefined) {
  return (html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
