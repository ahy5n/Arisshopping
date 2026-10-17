"use client";

import { useEffect, useState } from "react";
import type { SearchEvent } from "@/app/api/search/route";
import { mergeBatch } from "./merge";
import type { Product } from "./types";

export type ShopStatus = { id: string; name: string; state: "waiting" | "done" | "skipped"; count: number };

// Finished searches, so going back from a product shows the same feed instantly
// instead of asking every shop again.
const FRESH_MS = 10 * 60 * 1000;
const memo = new Map<string, { items: Product[]; shops: ShopStatus[]; at: number }>();

/** Reads /api/search as a stream so each shop's results appear as soon as it answers. */
export function useSearch(q: string) {
  const [items, setItems] = useState<Product[]>(() => memo.get(q)?.items ?? []);
  const [shops, setShops] = useState<ShopStatus[]>(() => memo.get(q)?.shops ?? []);
  const [loading, setLoading] = useState(() => !memo.has(q));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const hit = memo.get(q);
    if (hit && Date.now() - hit.at < FRESH_MS) {
      setItems(hit.items);
      setShops(hit.shops);
      setLoading(false);
      setFailed(false);
      return;
    }

    const ctrl = new AbortController();
    let acc: Product[] = [];
    let status: ShopStatus[] = [];
    setItems([]);
    setShops([]);
    setLoading(true);
    setFailed(false);

    (async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
      if (!res.ok || !res.body) throw new Error(String(res.status));
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += value;
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const e = JSON.parse(line) as SearchEvent;
          if (e.type === "start") status = e.shops.map((s) => ({ ...s, state: "waiting", count: 0 }));
          if (e.type === "index") {
            // the index is up to a day old: never let it overwrite a live result that got here first
            const have = new Set(acc.flatMap((p) => [p.id, ...p.offers.map((o) => `${o.retailerId}:${o.externalId}`)]));
            acc = mergeBatch(acc, e.products.filter((p) => !have.has(p.id)));
          }
          if (e.type === "shop") {
            acc = mergeBatch(acc, e.products);
            status = status.map((s) => (s.id === e.id ? { ...s, state: e.ok ? "done" : "skipped", count: e.products.length } : s));
          }
          setItems(acc);
          setShops(status);
        }
      }
      memo.set(q, { items: acc, shops: status, at: Date.now() });
      if (memo.size > 12) memo.delete(memo.keys().next().value!);
      setLoading(false);
    })().catch((err) => {
      if (ctrl.signal.aborted) return;
      console.warn("search failed", err);
      setFailed(true);
      setLoading(false);
    });

    return () => ctrl.abort();
  }, [q]);

  return { items, shops, loading, failed };
}
