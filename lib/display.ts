import { COLOURS, SHADE_MAP } from "./catalogue";
import type { Product } from "./types";

const isColour = (s: string) => {
  const w = s.trim().toLowerCase();
  return w in SHADE_MAP || COLOURS.some((c) => c.label.toLowerCase() === w) || /^(off[- ]white|light|dark|pale)\s/.test(w);
};

/**
 * Department stores write "Whistles Slim Jersey Jacket, Ivory, Ivory". The card
 * already shows the brand and colour, so drop them from the title for display.
 */
export function displayTitle(p: Product) {
  let t = p.title.trim();
  if (p.brand && t.toLowerCase().startsWith(p.brand.toLowerCase() + " ")) t = t.slice(p.brand.length + 1);
  t = t.replace(/^(women'?s|ladies)\s+/i, "");
  // trailing ", Ivory" / ", Black, Black" / " - Black"
  const c = p.colourRaw.toLowerCase();
  for (let i = 0; i < 2; i++) t = t.replace(/(,|\s-)\s*([^,]+)$/, (m, _sep, tail) => (tail.trim().toLowerCase() === c || isColour(tail) ? "" : m));
  return t.charAt(0).toUpperCase() + t.slice(1);
}
