"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { Filters, Product, SortKey } from "./types";

// Everything lives on her phone. Storage can vanish (private mode, cleared
// data), so every read and write is wrapped and the app works without it.

const PREFIX = "aris:";
const listeners = new Set<() => void>();

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable; keep going in memory */
  }
  listeners.forEach((l) => l());
}

const cache = new Map<string, { raw: string | null; value: unknown }>();

/** Shared, reactive localStorage value. Every component using the same key stays in sync. */
export function useStored<T>(key: string, fallback: T) {
  const subscribe = useCallback((cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }, []);
  const getSnapshot = useCallback(() => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(PREFIX + key);
    } catch {}
    const hit = cache.get(key);
    if (hit && hit.raw === raw) return hit.value as T;
    const value = raw == null ? fallback : read(key, fallback);
    cache.set(key, { raw, value });
    return value;
    // fallback is treated as constant per key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const value = useSyncExternalStore(subscribe, getSnapshot, () => fallback);
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = read(key, fallback);
      write(key, typeof next === "function" ? (next as (p: T) => T)(prev) : next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  return [value, set] as const;
}

export function useDeviceId() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    let existing = read<string | null>("device", null);
    if (!existing) {
      existing = crypto.randomUUID();
      write("device", existing);
    }
    setId(existing);
  }, []);
  return id;
}

const EMPTY: string[] = [];

export const useRecents = () => useStored<string[]>("recents", EMPTY);
const NO_PRODUCTS: Product[] = [];
/** Saved as full snapshots, so the wishlist works without re-searching. */
export const useWishlist = () => useStored<Product[]>("wishlist-v2", NO_PRODUCTS);
export const useMySizes = () => useStored<string[]>("sizes", EMPTY);

export type SavedSearch = { id: string; name: string; q: string; f: Filters; sort: SortKey; at: string };
const NO_SAVED: SavedSearch[] = [];
export const useSavedSearches = () => useStored<SavedSearch[]>("saved", NO_SAVED);

/** Open a search with its filters already applied (the search page restores this view). */
export function openSaved(s: Pick<SavedSearch, "q" | "f" | "sort">) {
  try {
    sessionStorage.setItem("aris:view", JSON.stringify({ q: s.q, f: s.f, sort: s.sort, shown: 48, y: 0 }));
  } catch {}
  return `/?q=${encodeURIComponent(s.q)}`;
}

export function pushRecent(list: string[], q: string) {
  const clean = q.trim();
  if (!clean) return list;
  return [clean, ...list.filter((x) => x.toLowerCase() !== clean.toLowerCase())].slice(0, 10);
}
