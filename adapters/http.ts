// Polite fetching, per brief §4.4: honest UA, hard timeout, one request at a
// time per shop with a gap between them, and a 30-minute cache per query.

export const USER_AGENT = "Mozilla/5.0 (compatible; aris-shopping/0.1; private personal project)";
export const TIMEOUT_MS = 8000;
const MIN_GAP_MS = 1500;

const lastHit = new Map<string, number>();
const queue = new Map<string, Promise<unknown>>();

/**
 * Requests for the same shop wait their turn and are spaced MIN_GAP_MS apart.
 * `shop` defaults to the host; pass it when several shops share one search provider.
 */
export function politeFetch(url: string, init: RequestInit = {}, shop?: string, timeoutMs = TIMEOUT_MS): Promise<Response> {
  const host = shop ?? new URL(url).host;
  const prev = queue.get(host) ?? Promise.resolve();
  const run = prev
    .catch(() => {})
    .then(async () => {
      const wait = (lastHit.get(host) ?? 0) + MIN_GAP_MS - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastHit.set(host, Date.now());
      return fetch(url, {
        ...init,
        headers: { "User-Agent": USER_AGENT, "Accept-Language": "en-GB", ...init.headers },
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });
    });
  queue.set(host, run);
  return run;
}

type Entry<T> = { at: number; value: T };
const CACHE_MS = 30 * 60 * 1000;
const cache = new Map<string, Entry<unknown>>();

export async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key) as Entry<T> | undefined;
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  return value;
}
