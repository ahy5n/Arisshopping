export type Tier = "high-street" | "mid" | "premium" | "fast" | "resale";

export type Category =
  | "dresses"
  | "tops"
  | "knitwear"
  | "coats"
  | "jeans"
  | "trousers"
  | "skirts"
  | "co-ords"
  | "activewear"
  | "lingerie"
  | "swimwear"
  | "shoes"
  | "bags"
  | "accessories";

export type ColourFamily =
  | "black"
  | "white"
  | "cream"
  | "beige"
  | "brown"
  | "grey"
  | "pink"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "navy"
  | "purple"
  | "metallic"
  | "multi";

export type Offer = {
  retailerId: string;
  externalId?: string;
  retailerName: string;
  url: string;
  priceGbp: number;
  wasPriceGbp?: number;
  sizesInStock: string[];
};

/** One card in the feed. Grouped items carry several offers, cheapest first. */
export type Product = {
  id: string;
  title: string;
  brand: string;
  category: Category;
  colourRaw: string;
  colourFamily: ColourFamily;
  images: string[];
  /** Hex of the item's actual colour; used for placeholder art until real images exist. */
  swatch?: string;
  isResale: boolean;
  isNew?: boolean;
  description?: string;
  offers: Offer[];
  /** Position in its shop's own results; used to interleave shops for "best match". */
  rank?: number;
};

export type SortKey = "relevance" | "price-asc" | "price-desc";
export type Condition = "all" | "new" | "resale";

export type Filters = {
  colours: ColourFamily[];
  shade: string;
  brands: string[];
  minPrice: number;
  maxPrice: number; // PRICE_CAP means "no upper limit"
  sizes: string[];
  categories: Category[];
  saleOnly: boolean;
  condition: Condition;
};

export type SearchQuery = { q: string; filters: Filters; sort: SortKey; /** Crawls ask for as many as the shop allows */ limit?: number };

/** Phase 2 adapters implement this. One file per shop in /adapters. */
export interface RetailerAdapter {
  id: string;
  name: string;
  tier: Tier;
  mode: "live" | "indexed";
  search(q: SearchQuery): Promise<Product[]>; // max 8s, never throws
  /** Whole-catalogue crawl for the nightly index, yielding batches. Shops without one are swept by search words. */
  crawl?(): AsyncIterable<Product[]>;
}
