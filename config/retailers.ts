import type { Tier } from "../lib/types";

// The 100 shops from "aris-shopping-retailers.pdf". Safe to import in the browser.
// `state` comes from scripts/probe-shops.ts; re-run it to refresh (see README).

export type Section =
  | "High street" | "Value" | "Department stores" | "Mid-range" | "Premium & designer"
  | "Fast fashion" | "Activewear" | "Shoes, bags & lingerie" | "Resale";

export type Retailer = {
  id: string;
  name: string;
  /** Home page as given in the list; adapters may use a different host */
  site: string;
  tier: Tier;
  section: Section;
  find: string;
};

const r = (id: string, name: string, site: string, tier: Tier, section: Section, find: string): Retailer => ({ id, name, site, tier, section, find });

export const RETAILERS: Retailer[] = [
  r("asos", "ASOS", "https://www.asos.com", "high-street", "High street", "Huge multi-brand catalogue incl. own label"),
  r("zara", "Zara", "https://www.zara.com/uk", "high-street", "High street", "Trend-led basics and occasionwear"),
  r("hm", "H&M", "https://www2.hm.com/en_gb", "high-street", "High street", "Affordable basics and trends"),
  r("mango", "Mango", "https://shop.mango.com/gb", "high-street", "High street", "Polished everyday and workwear"),
  r("riverisland", "River Island", "https://www.riverisland.com", "high-street", "High street", "Trend-led, denim, going-out"),
  r("newlook", "New Look", "https://www.newlook.com", "high-street", "High street", "Budget trends, shoes"),
  r("next", "Next", "https://www.next.co.uk", "high-street", "High street", "Also sells many partner brands"),
  r("ms", "M&S", "https://www.marksandspencer.com", "high-street", "High street", "Knitwear, basics, lingerie"),
  r("uo", "Urban Outfitters", "https://www.urbanoutfitters.com/en-gb", "high-street", "High street", "Vintage-inspired, own brands"),
  r("bershka", "Bershka", "https://www.bershka.com/gb", "high-street", "High street", "Young, trend-led"),
  r("pullandbear", "Pull&Bear", "https://www.pullandbear.com/gb", "high-street", "High street", "Casual, denim"),
  r("stradivarius", "Stradivarius", "https://www.stradivarius.com/gb", "high-street", "High street", "Feminine trends"),
  r("primark", "Primark", "https://www.primark.com/en-gb", "high-street", "High street", "Browse-only site (no online checkout)"),
  r("uniqlo", "Uniqlo", "https://www.uniqlo.com/uk", "high-street", "High street", "Quality basics, knitwear, outerwear"),
  r("gap", "Gap", "https://www.gap.co.uk", "high-street", "High street", "Denim, casual basics"),
  r("weekday", "Weekday", "https://www.weekday.com", "high-street", "High street", "Minimal, Scandi, denim"),
  r("lipsy", "Lipsy", "https://www.lipsy.co.uk", "high-street", "High street", "Occasion and going-out"),
  r("monsoon", "Monsoon", "https://www.monsoon.co.uk", "high-street", "High street", "Boho, occasion, prints"),
  r("accessorize", "Accessorize", "https://www.accessorize.com/uk", "high-street", "High street", "Bags, jewellery, swim"),
  r("hollister", "Hollister", "https://www.hollisterco.com", "high-street", "High street", "Casual, denim"),
  r("joules", "Joules", "https://www.joules.com", "high-street", "High street", "Country casual, prints"),
  r("fatface", "FatFace", "https://www.fatface.com", "high-street", "High street", "Relaxed casual"),
  r("whitestuff", "White Stuff", "https://www.whitestuff.com", "high-street", "High street", "Relaxed, prints, knitwear"),

  r("matalan", "Matalan", "https://www.matalan.co.uk", "high-street", "Value", "Budget basics"),
  r("george", "George at Asda", "https://direct.asda.com/george", "high-street", "Value", "Budget basics"),
  r("tu", "Tu at Sainsbury's", "https://tuclothing.sainsburys.co.uk", "high-street", "Value", "Budget basics"),
  r("ff", "F&F at Tesco", "https://www.tesco.com", "high-street", "Value", "Budget basics"),
  r("tkmaxx", "TK Maxx", "https://www.tkmaxx.com/uk", "high-street", "Value", "Discounted designer and high street"),

  r("selfridges", "Selfridges", "https://www.selfridges.com", "premium", "Department stores", "Designer to contemporary"),
  r("harrods", "Harrods", "https://www.harrods.com", "premium", "Department stores", "Luxury"),
  r("harveynichols", "Harvey Nichols", "https://www.harveynichols.com", "premium", "Department stores", "Designer and contemporary"),
  r("liberty", "Liberty", "https://www.libertylondon.com", "premium", "Department stores", "Designer, prints, accessories"),
  r("johnlewis", "John Lewis", "https://www.johnlewis.com", "premium", "Department stores", "Wide mix of mid-range brands"),
  r("fenwick", "Fenwick", "https://www.fenwick.co.uk", "premium", "Department stores", "Contemporary brands"),
  r("houseoffraser", "House of Fraser", "https://www.houseoffraser.co.uk", "premium", "Department stores", "High street and mid-range brands"),
  r("flannels", "Flannels", "https://www.flannels.com", "premium", "Department stores", "Designer and premium"),
  r("very", "Very", "https://www.very.co.uk", "premium", "Department stores", "Many high-street brands in one place"),

  r("cos", "COS", "https://www.cos.com", "mid", "Mid-range", "Minimal, quality basics"),
  r("stories", "& Other Stories", "https://www.stories.com", "mid", "Mid-range", "Feminine, considered"),
  r("arket", "Arket", "https://www.arket.com", "mid", "Mid-range", "Modern essentials"),
  r("massimodutti", "Massimo Dutti", "https://www.massimodutti.com/gb", "mid", "Mid-range", "Elevated classics"),
  r("reformation", "Reformation", "https://www.thereformation.com", "mid", "Mid-range", "Dresses, sustainable"),
  r("freepeople", "Free People", "https://www.freepeople.com/uk", "mid", "Mid-range", "Boho, relaxed"),
  r("anthropologie", "Anthropologie", "https://www.anthropologie.com/en-gb", "mid", "Mid-range", "Boho, colourful"),
  r("whistles", "Whistles", "https://www.whistles.com", "mid", "Mid-range", "Modern British"),
  r("reiss", "Reiss", "https://www.reiss.com", "mid", "Mid-range", "Tailoring, occasion"),
  r("hobbs", "Hobbs", "https://www.hobbs.com", "mid", "Mid-range", "Classic, workwear"),
  r("jigsaw", "Jigsaw", "https://www.jigsaw-online.com", "mid", "Mid-range", "Classic British"),
  r("phaseeight", "Phase Eight", "https://www.phase-eight.com", "mid", "Mid-range", "Occasion and wedding guest"),
  r("lkbennett", "L.K.Bennett", "https://www.lkbennett.com", "mid", "Mid-range", "Classic, shoes"),
  r("boden", "Boden", "https://www.boden.com", "mid", "Mid-range", "Colourful prints"),
  r("sezane", "Sézane", "https://www.sezane.com/uk", "mid", "Mid-range", "Parisian, knitwear"),
  r("rixo", "Rixo", "https://www.rixo.co.uk", "mid", "Mid-range", "Printed dresses"),
  r("ghost", "Ghost", "https://www.ghost.co.uk", "mid", "Mid-range", "Satin and bias-cut dresses"),
  r("nfd", "Never Fully Dressed", "https://www.neverfullydressed.co.uk", "mid", "Mid-range", "Bold prints"),
  r("kitri", "Kitri", "https://www.kitristudio.com", "mid", "Mid-range", "Dresses, prints"),
  r("hush", "Hush", "https://www.hush-uk.com", "mid", "Mid-range", "Relaxed, loungewear"),
  r("meandem", "ME+EM", "https://www.meandem.com", "mid", "Mid-range", "Smart, modern"),
  r("allsaints", "AllSaints", "https://www.allsaints.com", "mid", "Mid-range", "Leather, edgy"),
  r("sandro", "Sandro", "https://uk.sandro-paris.com", "mid", "Mid-range", "Parisian contemporary"),
  r("maje", "Maje", "https://uk.maje.com", "mid", "Mid-range", "Parisian contemporary"),
  r("ganni", "Ganni", "https://www.ganni.com/en-gb", "mid", "Mid-range", "Danish, playful"),
  r("nobodyschild", "Nobody's Child", "https://www.nobodyschild.com", "mid", "Mid-range", "Sustainable dresses"),

  r("netaporter", "Net-a-Porter", "https://www.net-a-porter.com", "premium", "Premium & designer", "Luxury designer"),
  r("farfetch", "Farfetch", "https://www.farfetch.com/uk", "premium", "Premium & designer", "Designer marketplace"),
  r("mytheresa", "Mytheresa", "https://www.mytheresa.com", "premium", "Premium & designer", "Luxury designer"),
  r("ssense", "SSENSE", "https://www.ssense.com", "premium", "Premium & designer", "Designer, directional"),
  r("browns", "Browns", "https://www.brownsfashion.com", "premium", "Premium & designer", "Designer"),
  r("end", "END.", "https://www.endclothing.com", "premium", "Premium & designer", "Designer streetwear"),
  r("luisaviaroma", "LuisaViaRoma", "https://www.luisaviaroma.com", "premium", "Premium & designer", "Designer"),
  r("24s", "24S", "https://www.24s.com", "premium", "Premium & designer", "Designer (LVMH)"),

  r("plt", "PrettyLittleThing", "https://www.prettylittlething.com", "fast", "Fast fashion", "Going-out, trends"),
  r("boohoo", "Boohoo", "https://www.boohoo.com", "fast", "Fast fashion", "Budget trends"),
  r("ohpolly", "Oh Polly", "https://www.ohpolly.com", "fast", "Fast fashion", "Bodycon, occasion"),
  r("shein", "Shein", "https://uk.shein.com", "fast", "Fast fashion", "Ultra-budget trends"),
  r("nastygal", "Nasty Gal", "https://www.nastygal.com/gb", "fast", "Fast fashion", "Trend-led"),
  r("misspap", "Misspap", "https://www.misspap.com", "fast", "Fast fashion", "Going-out"),
  r("meshki", "Meshki", "https://www.meshki.co.uk", "fast", "Fast fashion", "Going-out, sets"),
  r("whitefox", "White Fox", "https://www.whitefoxboutique.com", "fast", "Fast fashion", "Loungewear, sets"),
  r("motelrocks", "Motel Rocks", "https://www.motelrocks.com", "fast", "Fast fashion", "Y2K, slip dresses"),
  r("clubl", "Club L London", "https://www.clubllondon.com", "fast", "Fast fashion", "Occasion, evening"),
  r("princesspolly", "Princess Polly", "https://www.princesspolly.co.uk", "fast", "Fast fashion", "Trend-led"),

  r("gymshark", "Gymshark", "https://www.gymshark.com", "high-street", "Activewear", "Gym, leggings"),
  r("lululemon", "Lululemon", "https://www.lululemon.co.uk", "high-street", "Activewear", "Premium activewear"),
  r("sweatybetty", "Sweaty Betty", "https://www.sweatybetty.com", "high-street", "Activewear", "Activewear, yoga"),
  r("adanola", "Adanola", "https://www.adanola.com", "high-street", "Activewear", "Athleisure"),
  r("nike", "Nike", "https://www.nike.com/gb", "high-street", "Activewear", "Trainers, activewear"),
  r("adidas", "Adidas", "https://www.adidas.co.uk", "high-street", "Activewear", "Trainers, activewear"),

  r("office", "Office", "https://www.office.co.uk", "high-street", "Shoes, bags & lingerie", "Shoes and trainers"),
  r("schuh", "Schuh", "https://www.schuh.co.uk", "high-street", "Shoes, bags & lingerie", "Shoes and trainers"),
  r("kurtgeiger", "Kurt Geiger", "https://www.kurtgeiger.com", "high-street", "Shoes, bags & lingerie", "Shoes and bags"),
  r("dune", "Dune London", "https://www.dunelondon.com", "high-street", "Shoes, bags & lingerie", "Shoes and bags"),
  r("charleskeith", "Charles & Keith", "https://www.charleskeith.co.uk/gb", "high-street", "Shoes, bags & lingerie", "Affordable bags and shoes"),
  r("hunkemoller", "Hunkemöller", "https://www.hunkemoller.co.uk", "high-street", "Shoes, bags & lingerie", "Lingerie"),
  r("bouxavenue", "Boux Avenue", "https://www.bouxavenue.com", "high-street", "Shoes, bags & lingerie", "Lingerie, nightwear"),

  r("vinted", "Vinted", "https://www.vinted.co.uk", "resale", "Resale", "Huge peer-to-peer resale"),
  r("depop", "Depop", "https://www.depop.com", "resale", "Resale", "Vintage and Y2K resale"),
  r("ebay", "eBay UK", "https://www.ebay.co.uk", "resale", "Resale", "New and pre-loved"),
  r("vestiaire", "Vestiaire Collective", "https://www.vestiairecollective.com", "resale", "Resale", "Pre-loved designer"),
  r("hewi", "Hardly Ever Worn It", "https://www.hardlyeverwornit.com", "resale", "Resale", "Pre-loved luxury"),
];
