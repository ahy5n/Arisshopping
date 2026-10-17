"use client";

import type { Product } from "./types";

// Products the feed has already shown, so the detail view opens instantly
// (including grouped cards, whose shop list only exists client-side).
// Survives a refresh via sessionStorage; falls back to the index API.

const mem = new Map<string, Product>();
const KEY = "aris:seen";

export function remember(items: Product[]) {
  for (const p of items) mem.set(p.id, p);
}

export function recall(id: string): Product | undefined {
  if (mem.has(id)) return mem.get(id);
  try {
    const hit = JSON.parse(sessionStorage.getItem(KEY) ?? "{}")[id] as Product | undefined;
    if (hit) mem.set(id, hit);
    return hit;
  } catch {
    return undefined;
  }
}

/** Called when a card is opened: keep that one across a refresh. */
export function pin(p: Product) {
  mem.set(p.id, p);
  try {
    const all = JSON.parse(sessionStorage.getItem(KEY) ?? "{}") as Record<string, Product>;
    all[p.id] = p;
    const ids = Object.keys(all);
    for (const old of ids.slice(0, Math.max(0, ids.length - 40))) delete all[old];
    sessionStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}
