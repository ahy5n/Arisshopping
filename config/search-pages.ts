// Search-results page for each shop read by the generic page adapter
// (adapters/_page.ts). {q} is replaced with the query. Only shops listed here
// AND marked "page" in probe-results.json are searched this way.

export const SEARCH_PAGES: Record<string, string[]> = {
  asos: ["https://www.asos.com/search/?q={q}"],
  zara: ["https://www.zara.com/uk/en/search?searchTerm={q}&section=WOMAN"],
  riverisland: ["https://www.riverisland.com/search?keyword={q}"],
  newlook: ["https://www.newlook.com/uk/search?text={q}", "https://www.newlook.com/uk/search/?q={q}"],
  next: ["https://www.next.co.uk/search?w={q}"],
  ms: ["https://www.marksandspencer.com/l/search?q={q}", "https://www.marksandspencer.com/search?searchTerm={q}"],
  bershka: ["https://www.bershka.com/gb/q/{q}"],
  pullandbear: ["https://www.pullandbear.com/gb/search?q={q}"],
  stradivarius: ["https://www.stradivarius.com/gb/search?q={q}"],
  massimodutti: ["https://www.massimodutti.com/gb/search?q={q}"],
  primark: ["https://www.primark.com/en-gb/search?q={q}"],
  gap: ["https://www.gap.co.uk/browse/search.do?searchText={q}", "https://www.gap.co.uk/search?q={q}"],
  weekday: ["https://www.weekday.com/en-gb/search?q={q}", "https://www.weekday.com/en_gbp/search.html?q={q}"],
  monsoon: ["https://www.monsoon.co.uk/search?q={q}"],
  accessorize: ["https://www.accessorize.com/uk/search?q={q}"],
  hollister: ["https://www.hollisterco.com/shop/uk/search?searchTerm={q}"],
  joules: ["https://www.joules.com/search?q={q}", "https://www.joules.com/search?w={q}"],
  fatface: ["https://www.fatface.com/search?q={q}", "https://www.fatface.com/search?w={q}"],
  matalan: ["https://www.matalan.co.uk/search/?q={q}"],
  tu: ["https://tuclothing.sainsburys.co.uk/search?q={q}"],
  tkmaxx: ["https://www.tkmaxx.com/uk/en/search?text={q}"],
  harrods: ["https://www.harrods.com/en-gb/search?query={q}"],
  harveynichols: ["https://www.harveynichols.com/searchresults?descriptionfilter={q}", "https://www.harveynichols.com/search?q={q}"],
  johnlewis: ["https://www.johnlewis.com/search?search-term={q}"],
  houseoffraser: ["https://www.houseoffraser.co.uk/searchresults?descriptionfilter={q}"],
  flannels: ["https://www.flannels.com/searchresults?descriptionfilter={q}"],
  stories: ["https://www.stories.com/en-gb/search?q={q}", "https://www.stories.com/en_gbp/search.html?q={q}"],
  whistles: ["https://www.whistles.com/search?q={q}"],
  hobbs: ["https://www.hobbs.com/search?q={q}"],
  phaseeight: ["https://www.phase-eight.com/search?q={q}"],
  lkbennett: ["https://lkbennett.com/search?q={q}", "https://lkbennett.com/search?type=product&q={q}"],
  boden: ["https://www.boden.com/en-gb/search?q={q}", "https://www.boden.co.uk/search?q={q}"],
  sezane: ["https://www.sezane.com/uk/search?q={q}", "https://www.sezane.com/uk/search/{q}"],
  ghost: ["https://www.ghost.co.uk/site/search?q={q}"],
  meandem: ["https://www.meandem.com/search?q={q}"],
  sandro: ["https://uk.sandro-paris.com/en/search?q={q}"],
  maje: ["https://uk.maje.com/en/search?q={q}"],
  ganni: ["https://www.ganni.com/en-gb/search?q={q}"],
  mytheresa: ["https://www.mytheresa.com/gb/en/women/search?q={q}", "https://www.mytheresa.com/en-gb/search?q={q}"],
  end: ["https://www.endclothing.com/gb/catalogsearch/results?q={q}"],
  "24s": ["https://www.24s.com/en-gb/search?query={q}", "https://www.24s.com/en-gb/women?q={q}"],
  shein: ["https://www.shein.co.uk/pdsearch/{q}/"],
  clubl: ["https://www.clubllondon.com/search?q={q}"],
  gymshark: ["https://uk.gymshark.com/search?q={q}", "https://www.gymshark.com/search?q={q}"],
  sweatybetty: ["https://www.sweatybetty.com/search?q={q}"],
  nike: ["https://www.nike.com/gb/w?q={q}"],
  office: ["https://www.office.co.uk/view/search?search={q}"],
  kurtgeiger: ["https://www.kurtgeiger.com/search?search={q}", "https://www.kurtgeiger.com/catalogsearch/result/?q={q}"],
  dune: ["https://www.dunelondon.com/search?q={q}"],
  hunkemoller: ["https://www.hunkemoller.co.uk/search?q={q}"],
  bouxavenue: ["https://www.bouxavenue.com/search?q={q}"],
  vinted: ["https://www.vinted.co.uk/catalog?search_text={q}"],
  charleskeith: ["https://www.charleskeith.co.uk/gb/search?q={q}"],
};

/** Per-shop quirks for the page reader. */
const SFCC = { crawlSuffix: "&sz=200" }; // Salesforce Commerce Cloud: bigger pages during crawls

export const PAGE_OPTIONS: Record<string, { pence?: boolean; priceKey?: string; linkPrefix?: string; crawlSuffix?: string }> = {
  monsoon: SFCC, accessorize: SFCC, whistles: SFCC, hobbs: SFCC, phaseeight: SFCC,
  sandro: SFCC, maje: SFCC, ganni: SFCC, dune: SFCC, bouxavenue: SFCC, charleskeith: SFCC,
  // price.discount is the current price, in pence; slugs live under /gb/en/women
  mytheresa: { pence: true, priceKey: "discount", linkPrefix: "https://www.mytheresa.com/gb/en/women" },
};
