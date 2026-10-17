import { bloomreachAdapter } from "./_bloomreach";

// Account ids come from each shop's own page config (bloomReachConfig / suggest URLs).

/** Next also sells Lipsy, Joules, FatFace, AllSaints, adidas and many more under one roof. */
export const next = bloomreachAdapter({
  id: "next",
  name: "Next",
  tier: "high-street",
  accountId: "6042",
  domainKey: "next",
  site: "https://www.next.co.uk",
  fq: 'gender:"women"',
});

export const reiss = bloomreachAdapter({
  id: "reiss",
  name: "Reiss",
  tier: "mid",
  accountId: "6647",
  domainKey: "reiss",
  site: "https://www.reiss.com",
});

export const primark = bloomreachAdapter({
  id: "primark",
  name: "Primark",
  tier: "high-street",
  accountId: "6657",
  domainKey: "primark",
  site: "https://www.primark.com",
  pence: true,
  link: (d) => `https://www.primark.com/en-gb/p/${d.url}`,
  image: (d) => (d.thumb_image ? `${d.thumb_image}?w=600&fmt=auto` : undefined),
});

/** TK Maxx: designer and high street at discount; the RRP is the "was" price. */
export const tkmaxx = bloomreachAdapter({
  id: "tkmaxx",
  name: "TK Maxx",
  tier: "high-street",
  accountId: "7256",
  domainKey: "tkmaxx",
  viewId: "tkmaxx-uk",
  site: "https://www.tkmaxx.com/uk/en",
  fq: 'department:"Women"',
  extraFields: "rrp,was_price,color,department",
  wasOf: (d) => Math.max(Number(d.rrp) || 0, Number(d.was_price) || 0) || undefined,
  link: (d) => `https://www.tkmaxx.com/uk/en${d.url}`,
});

/** Victoria's Secret UK is run by Next plc on the same platform (victoriassecret.com blocks requests). */
export const victoriassecret = bloomreachAdapter({
  id: "victoriassecret",
  name: "Victoria's Secret",
  tier: "high-street",
  accountId: "6505",
  domainKey: "victoriassecret_global",
  site: "https://www.victoriassecret.co.uk",
});
