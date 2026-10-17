/**
 * One live sample search per shop, checking the shape of what comes back.
 *   npm run test:adapters            every live shop
 *   ONLY=rixo,boohoo npm run test:adapters
 * Hits the real shops (once each), so run it by hand, not on every save.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { EMPTY_FILTERS } from "../lib/catalogue";
import { liveAdapters } from "./index";

const only = process.env.ONLY?.split(",");
const adapters = liveAdapters().filter((a) => !only || only.includes(a.id));

for (const a of adapters) {
  test(`${a.name} returns well-formed products`, { timeout: 15_000 }, async () => {
    const t0 = Date.now();
    const items = await a.search({ q: process.env.Q ?? "black", filters: EMPTY_FILTERS, sort: "relevance" });
    assert.ok(Date.now() - t0 < 10_000, "answered within 10s");
    assert.ok(items.length > 0, "found at least one product");

    for (const p of items) {
      assert.match(p.id, new RegExp(`^${a.id}:`), "id is prefixed with the shop");
      assert.ok(p.title.length > 2, `title: ${p.title}`);
      assert.ok(p.offers.length === 1, "one offer per shop result");
      const o = p.offers[0];
      assert.equal(o.retailerId, a.id);
      assert.ok(o.priceGbp > 0 && o.priceGbp < 250_000, `price £${o.priceGbp}`);
      assert.ok(!o.wasPriceGbp || o.wasPriceGbp > o.priceGbp, "was-price is higher than price");
      assert.match(o.url, /^https:\/\//, "absolute product link");
      assert.ok(p.images.every((i) => i.startsWith("https://")), "images are https");
      assert.ok(Array.isArray(o.sizesInStock));
    }
    assert.ok(items.some((p) => p.images.length > 0), "at least one product has a picture");
  });
}
