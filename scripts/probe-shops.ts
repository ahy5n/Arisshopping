/**
 * Checks every shop in config/retailers.ts with at most two polite requests:
 *   1. Shopify's public search JSON (if it answers, a generic adapter works)
 *   2. the home page (does it load, block us, or has the shop gone?)
 * Writes config/probe-results.json, which Settings and the adapter registry read.
 *
 *   npx tsx scripts/probe-shops.ts            all shops
 *   npx tsx scripts/probe-shops.ts rixo ghost just these
 */
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { USER_AGENT } from "../adapters/http";
import { RETAILERS, type Retailer } from "../config/retailers";

export type ProbeState = "shopify" | "reachable" | "blocked" | "unreachable";
export type ProbeResult = { state: ProbeState; origin?: string; currency?: string; status?: number; detail?: string; at: string };

const OUT = new URL("../config/probe-results.json", import.meta.url);
// strong signals only: a normal page can mention "captcha" in its login form
const CHALLENGE = /<title>[^<]*(just a moment|access denied|attention required|are you a robot|security check)[^<]*<\/title>|cf-chl-|px-captcha|_Incapsula_Resource|captcha-delivery\.com|geo\.captcha|challenge-platform/i;

async function get(url: string, accept = "text/html") {
  return fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "en-GB", accept },
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });
}

async function probe(r: Retailer): Promise<ProbeResult> {
  const at = new Date().toISOString();
  const origin = new URL(r.site).origin;
  const sub = new URL(r.site).pathname.replace(/\/$/, "");

  try {
    const s = await get(`${origin}${sub}/search/suggest.json?q=dress&resources[type]=product&resources[limit]=3`, "application/json");
    if (s.ok && (s.headers.get("content-type") ?? "").includes("json")) {
      const j = (await s.json()) as { resources?: { results?: { products?: { price?: string }[] } } };
      const products = j.resources?.results?.products;
      if (products?.length) {
        const shopOrigin = new URL(s.url).origin + sub;
        await new Promise((res) => setTimeout(res, 1500));
        // the store's checkout currency; anything not in pounds stays switched off
        const cart = await get(`${shopOrigin}/cart.js`, "application/json").then((x) => x.json()).catch(() => ({}));
        const currency = (cart as { currency?: string }).currency ?? "unknown";
        return { state: "shopify", origin: shopOrigin, currency, status: s.status, detail: `${products.length} products, e.g. ${products[0].price} ${currency}`, at };
      }
    }
  } catch {
    /* not Shopify, or unreachable; the home page check decides */
  }

  await new Promise((res) => setTimeout(res, 1500)); // same host, so wait before asking again

  try {
    const h = await get(r.site);
    const body = (await h.text()).slice(0, 60_000);
    const finalHost = new URL(h.url).host;
    const parked = /sedo|atom\.com|sawsells|dan\.com|hugedomains|godaddy/.test(finalHost);
    if (parked) return { state: "unreachable", status: h.status, detail: `redirects to ${finalHost}`, at };
    if (h.status === 403 || h.status === 429 || h.status === 503 || CHALLENGE.test(body)) {
      return { state: "blocked", status: h.status, detail: CHALLENGE.test(body) ? "bot challenge page" : `HTTP ${h.status}`, at };
    }
    if (h.status === 404) return { state: "unreachable", status: 404, detail: "page not found, check the URL", at };
    if (h.ok) return { state: "reachable", origin: new URL(h.url).origin, status: h.status, at };
    return { state: "blocked", status: h.status, detail: `HTTP ${h.status}`, at };
  } catch (e) {
    const msg = (e as Error).message;
    return { state: /timeout|aborted/i.test(msg) ? "blocked" : "unreachable", detail: msg.slice(0, 80), at };
  }
}

async function main() {
  const only = process.argv.slice(2);
  const todo = only.length ? RETAILERS.filter((r) => only.includes(r.id)) : RETAILERS;
  const results: Record<string, ProbeResult> = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};

  // different shops in parallel, but only a few at a time
  const queue = [...todo];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let r = queue.shift(); r; r = queue.shift()) {
        const res = await probe(r);
        results[r.id] = res;
        console.log(`${res.state.padEnd(9)} ${r.name.padEnd(22)} ${res.detail ?? res.origin ?? ""}`);
      }
    }),
  );

  const ordered = Object.fromEntries(RETAILERS.filter((r) => results[r.id]).map((r) => [r.id, results[r.id]]));
  writeFileSync(OUT, JSON.stringify(ordered, null, 2) + "\n");
  const count = (s: ProbeState) => Object.values(ordered).filter((x) => x.state === s).length;
  console.log(`\nshopify ${count("shopify")} · reachable ${count("reachable")} · blocked ${count("blocked")} · unreachable ${count("unreachable")}`);
}

main();
