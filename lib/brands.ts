// Brand names that ordinary word search can't handle: "H&M" splits into the
// single letters "h" and "m", which match nearly everything. When a search
// mentions one of these, the catalogue is searched by exact brand instead.

export const AMPERSAND_BRANDS: { re: RegExp; brands: string[] }[] = [
  { re: /\bh\s*(?:&|and|n)\s*m\b|\bhandm\b/i, brands: ["H&M"] },
  { re: /\bf\s*(?:&|and)\s*f\b/i, brands: ["F&F"] },
  { re: /\bm\s*(?:&|and)\s*s\b|\bmarks\s*(?:&|and)\s*spencer\b/i, brands: ["M&S", "Marks & Spencer", "M&S Collection", "Autograph"] },
  { re: /\bd\s*(?:&|and)\s*g\b|\bdolce\s*(?:&|and)\s*gabbana\b/i, brands: ["Dolce & Gabbana", "Dolce&Gabbana"] },
  { re: /\ba\s*(?:&|and)\s*f\b|\babercrombie\b/i, brands: ["Abercrombie & Fitch"] },
  { re: /\bc\s*(?:&|and)\s*k\b|\bcharles\s*(?:&|and)\s*keith\b/i, brands: ["Charles & Keith"] },
];

/** If the query names one of these brands, return the brand variants and the rest of the words. */
export function brandQuery(q: string): { brands: string[]; rest: string[] } | null {
  for (const b of AMPERSAND_BRANDS) {
    const m = q.match(b.re);
    if (!m) continue;
    const rest = q
      .replace(b.re, " ")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 1);
    return { brands: b.brands, rest };
  }
  return null;
}
