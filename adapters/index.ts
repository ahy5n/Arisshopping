import probe from "../config/probe-results.json";
import { RETAILERS } from "../config/retailers";
import { PAGE_OPTIONS } from "../config/search-pages";
import type { RetailerAdapter } from "../lib/types";
import { pageAdapter } from "./_page";
import { shopifyAdapter } from "./_shopify";
import { end, flannels, gymshark, houseoffraser } from "./algolia-shops";
import { next, primark, reiss, tkmaxx, victoriassecret } from "./bloomreach-shops";
import asos from "./asos";
import boohoo from "./boohoo";
import coast from "./coast";
import debenhams from "./debenhams";
import dorothyperkins from "./dorothyperkins";
import ebay, { ebayConfigured } from "./ebay";
import ghost from "./ghost";
import harrods from "./harrods";
import karenmillen from "./karenmillen";
import twentyfours from "./twentyfours";
import wallis from "./wallis";
import misspap from "./misspap";
import nastygal from "./nastygal";
import nike from "./nike";
import oasis from "./oasis";
import plt from "./plt";
import riverisland from "./riverisland";
import sweatybetty from "./sweatybetty";
import vinted from "./vinted";
import zara from "./zara";

type Probe = Record<string, { state: string; origin?: string; currency?: string; searchUrl?: string }>;
const results = probe as Probe;

/** Shopify stores the probe found, priced in pounds. */
function shopifyStores(): RetailerAdapter[] {
  return RETAILERS.flatMap((r) => {
    const p = results[r.id];
    if (p?.state !== "shopify" || !p.origin) return [];
    const pounds = p.currency === "GBP" || (p.currency === "unknown" && /\.co\.uk$/.test(new URL(p.origin).host));
    return pounds ? [shopifyAdapter({ id: r.id, name: r.name, tier: r.tier, origin: p.origin })] : [];
  });
}

/** Shops whose own search page the generic reader can parse (scripts/probe-pages.ts). */
function pageStores(): RetailerAdapter[] {
  return RETAILERS.flatMap((r) => {
    const p = results[r.id];
    return p?.state === "page" && p.searchUrl ? [pageAdapter({ id: r.id, name: r.name, tier: r.tier, searchUrl: p.searchUrl, resale: r.tier === "resale", ...PAGE_OPTIONS[r.id] })] : [];
  });
}

/** Hand-written adapters first; they win over anything generic with the same id. */
const CUSTOM: RetailerAdapter[] = [boohoo, plt, nastygal, misspap, coast, oasis, flannels, houseoffraser, gymshark, end, zara, next, reiss, primark, asos, riverisland, ghost, tkmaxx, sweatybetty, vinted, nike, harrods, twentyfours, victoriassecret, debenhams, karenmillen, wallis, dorothyperkins, ebay];

const generic = [...shopifyStores(), ...pageStores()];
export const ADAPTERS: RetailerAdapter[] = [...CUSTOM, ...generic.filter((s) => !CUSTOM.some((c) => c.id === s.id))];

/** Shops the refresh crawl reads: everything live, plus catalogue-only shops (mode "indexed"). */
export function crawlableAdapters() {
  return ADAPTERS.filter((a) => (a.mode === "indexed" && a.crawl) || liveAdapters().includes(a));
}

/** Adapters that can actually run right now. */
export function liveAdapters() {
  return ADAPTERS.filter((a) => a.mode === "live" && (a.id !== "ebay" || ebayConfigured()));
}

/** Why a shop isn't searchable, for the Settings page. */
export function shopStatus(id: string): { state: "live" | "needs-key" | "blocked" | "later" | "unreachable" | "not-pounds"; note?: string } {
  const p = results[id] as { state: string; currency?: string; detail?: string } | undefined;
  if (id === "ebay") return ebayConfigured() ? { state: "live" } : { state: "needs-key", note: "free eBay developer key" };
  if (ADAPTERS.some((a) => a.id === id)) return { state: "live" };
  if (p?.state === "shopify") return { state: "not-pounds", note: `prices in ${p.currency}` };
  if (p?.state === "page") return { state: "live" };
  if (p?.state === "blocked") return { state: "blocked", note: p.detail };
  if (p?.state === "unreachable") return { state: "unreachable", note: p.detail };
  return { state: "later" };
}
