import type { Category, ColourFamily, Filters } from "./types";

export const PRICE_CAP = 500;

export const COLOURS: { id: ColourFamily; label: string; swatch: string }[] = [
  { id: "black", label: "Black", swatch: "#1f1a1c" },
  { id: "white", label: "White", swatch: "#ffffff" },
  { id: "cream", label: "Cream", swatch: "#f3ead8" },
  { id: "beige", label: "Beige", swatch: "#d9c3a5" },
  { id: "brown", label: "Brown", swatch: "#7a5440" },
  { id: "grey", label: "Grey", swatch: "#a5a2a3" },
  { id: "pink", label: "Pink", swatch: "#eeb3c0" },
  { id: "red", label: "Red", swatch: "#b8333b" },
  { id: "orange", label: "Orange", swatch: "#e48a4f" },
  { id: "yellow", label: "Yellow", swatch: "#ecd06f" },
  { id: "green", label: "Green", swatch: "#7f9a6e" },
  { id: "blue", label: "Blue", swatch: "#86a9d4" },
  { id: "navy", label: "Navy", swatch: "#27304d" },
  { id: "purple", label: "Purple", swatch: "#9b7bb3" },
  { id: "metallic", label: "Metallic", swatch: "linear-gradient(135deg,#f4e7c3,#c9a75b 45%,#fff6dc 60%,#a8883f)" },
  { id: "multi", label: "Print", swatch: "conic-gradient(#eeb3c0,#ecd06f,#7f9a6e,#86a9d4,#9b7bb3,#eeb3c0)" },
];

/** Shop colour names → our families. Extended as adapters arrive. */
export const SHADE_MAP: Record<string, ColourFamily> = {
  oat: "beige", stone: "beige", sand: "beige", camel: "beige", taupe: "beige", nude: "beige",
  ecru: "cream", ivory: "cream", vanilla: "cream", "off white": "cream", butter: "yellow",
  chocolate: "brown", mocha: "brown", tan: "brown", rust: "orange", terracotta: "orange",
  sage: "green", olive: "green", khaki: "green", mint: "green", forest: "green",
  burgundy: "red", wine: "red", cherry: "red", oxblood: "red",
  blush: "pink", rose: "pink", fuchsia: "pink", baby: "pink",
  lilac: "purple", lavender: "purple", plum: "purple",
  denim: "blue", sky: "blue", cobalt: "blue", midnight: "navy",
  charcoal: "grey", silver: "metallic", gold: "metallic",
  floral: "multi", gingham: "multi", leopard: "multi", stripe: "multi",
};

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: "dresses", label: "Dresses" },
  { id: "tops", label: "Tops" },
  { id: "knitwear", label: "Knitwear" },
  { id: "coats", label: "Coats & jackets" },
  { id: "jeans", label: "Jeans" },
  { id: "trousers", label: "Trousers" },
  { id: "skirts", label: "Skirts" },
  { id: "co-ords", label: "Co-ords" },
  { id: "activewear", label: "Activewear" },
  { id: "lingerie", label: "Lingerie" },
  { id: "swimwear", label: "Swimwear" },
  { id: "shoes", label: "Shoes" },
  { id: "bags", label: "Bags" },
  { id: "accessories", label: "Accessories" },
];

export const SIZES = {
  "UK clothing": ["4", "6", "8", "10", "12", "14", "16", "18", "20"],
  Letter: ["XS", "S", "M", "L", "XL"],
  "UK shoe": ["3", "4", "5", "6", "7", "8"],
} as const;

export const EMPTY_FILTERS: Filters = {
  colours: [],
  shade: "",
  brands: [],
  minPrice: 0,
  maxPrice: PRICE_CAP,
  sizes: [],
  categories: [],
  saleOnly: false,
  condition: "all",
};

/** Rotating placeholder lines. Written how she'd actually type them. */
export const PROMPTS = [
  "black satin midi skirt",
  "cute top for a date under £30",
  "something floaty for a summer wedding",
  "cream knit, the oversized kind",
  "loafers that won't kill my feet",
  "a leather jacket, pre-loved is fine",
];

export const BRANDS_LIKE: Record<string, string[]> = {
  Reformation: ["& Other Stories", "Free People", "Mango"],
  COS: ["Arket", "& Other Stories", "Whistles"],
  Zara: ["Mango", "H&M", "River Island"],
};
