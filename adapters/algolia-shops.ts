import { algoliaAdapter, en, type Mapped } from "./_algolia";

// One entry per shop that searches through Algolia. Each `map` turns that
// shop's record shape into ours.

type Hit = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Frasers Group sites share one record shape. */
function frasers(site: string) {
  return (h: Hit): Mapped | null => {
    const gender = en(h.genderage) ?? en(h.webgender) ?? "";
    const sizes = (h.sizeVariants ?? []).map((v: Hit) => en(v.description)).filter(Boolean);
    const img = h.imageUrl ?? (Array.isArray(h.alternativeImages) ? h.alternativeImages[0] : undefined);
    return {
      id: String(h.objectID),
      title: (en(h.name) ?? "").replace(/^(Womens|Ladies)\s+/i, ""),
      brand: h.brand,
      price: Number(h.prices?.GBP?.sellingPrice ?? h.sellingPrice),
      was: Number(h.prices?.GBP?.ticketPrice ?? h.ticketPrice),
      colour: en(h.colourName) ?? en(h.cleancolour),
      category: en(h.subcategory) ?? en(h.webcat),
      url: `https://${site}/${String(h.productLink ?? "").replace(/^\//, "")}`,
      images: img ? [`${String(img).split("?")[0]}?w=600&h=600`] : [],
      sizes,
      women: /wom|ladies|female/i.test(gender) || (gender === "" ? undefined : false),
    };
  };
}

export const flannels = algoliaAdapter({
  id: "flannels",
  name: "Flannels",
  tier: "premium",
  appId: "965LU92YBT",
  key: "8e6d091d67594dd5463c991c27068a81",
  index: "flan_production_search",
  params: { filters: "hasInventory:true" },
  map: frasers("www.flannels.com"),
});

export const houseoffraser = algoliaAdapter({
  id: "houseoffraser",
  name: "House of Fraser",
  tier: "premium",
  appId: "INFXMHMQ1H",
  key: "90c9176f30182998c0e3f778d597b4fe",
  index: "hof_production_search",
  params: { filters: "hasInventory:true" },
  map: frasers("www.houseoffraser.co.uk"),
});

export const gymshark = algoliaAdapter({
  id: "gymshark",
  name: "Gymshark",
  tier: "high-street",
  appId: "2DEAES0CUO",
  key: "932fd4562e8443c09e3d14fd4ab94295",
  index: "production_gb_products_v2_popularity",
  map: (h: Hit) => ({
    id: String(h.objectID),
    title: h.title,
    brand: "Gymshark",
    price: Number(h.price),
    was: Number(h.compareAtPrice),
    colour: h.colour,
    category: h.type ?? h.productType,
    url: `https://uk.gymshark.com/products/${h.handle}`,
    images: [h.featuredMedia?.src, ...(h.media ?? []).map((m: Hit) => m.src)].filter(Boolean).slice(0, 4).map((u: string) => `${u}${u.includes("?") ? "&" : "?"}width=600`),
    sizes: (h.availableSizes ?? []).filter((s: Hit) => s.inStock).map((s: Hit) => String(s.size).toUpperCase()),
    women: Array.isArray(h.gender) ? h.gender.includes("f") : undefined,
  }),
});

export const end = algoliaAdapter({
  id: "end",
  name: "END.",
  tier: "premium",
  appId: "KO4W2GBINK",
  key: "dfa5df098f8d677dd2105ece472a44f8",
  index: "Catalog_products_v3_gb_products_search",
  host: "search1web.endclothing.com", // END. serves its search through its own domain
  map: (h: Hit) => ({
    id: String(h.sku ?? h.objectID),
    title: String(h.name ?? "").replace(new RegExp(`^${h.brand}\\s+`, "i"), ""),
    brand: h.brand,
    price: Number(h.final_price_1), // store 1 is the GB store, in pounds
    was: Number(h.full_price_1),
    colour: en(h.colour) ?? h.actual_colour,
    category: en(h.categories) ?? h.product_type,
    url: `https://www.endclothing.com/gb/${h.url_key}.html`,
    images: (h.media_gallery ?? [h.small_image]).filter(Boolean).slice(0, 4).map((p: string) => `https://media.endclothing.com/media/f_auto,q_auto:eco,w_600/prodmedia/media/catalog/product${p}`),
    sizes: (h.size_label ?? []).map((s: string) => s.replace(/^UK\s*/i, "")),
  }),
});
