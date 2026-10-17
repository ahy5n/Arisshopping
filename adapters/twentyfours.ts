import { categoryAdapter } from "./_category";

// 24S (LVMH): search isn't reachable, but its women's category pages are.
const BASE = "https://www.24s.com/en-gb/women";
const CATEGORIES = [
  "ready-to-wear/dresses", "ready-to-wear/tops-shirts", "ready-to-wear/knitwear", "ready-to-wear/skirts",
  "ready-to-wear/pants", "ready-to-wear/denim", "ready-to-wear/jackets", "ready-to-wear/coats",
  "ready-to-wear/sets", "ready-to-wear/sweatshirts", "ready-to-wear/leather", "ready-to-wear/suits", "ready-to-wear/beachwear",
  "shoes/boots-ankle-boots", "shoes/sneakers", "shoes/loafers", "shoes/sandals-slides", "shoes/pumps",
  "shoes/ballet-pumps", "shoes/mary-janes",
  "bags/handbags", "bags/shoulder-bags", "bags/mini-bags", "bags/clutch-bags", "bags/bucket-bags",
  "accessories/scarves-neckties", "accessories/belts", "accessories/hats", "accessories/sunglasses", "accessories/hair-accessories",
];

export default categoryAdapter({
  id: "24s",
  name: "24S",
  tier: "premium",
  pages: CATEGORIES.map((c) => `${BASE}/${c}`),
});
