import { liveAdapters } from "@/adapters";
import { TIMEOUT_MS } from "@/adapters/http";
import { EMPTY_FILTERS } from "@/lib/catalogue";
import { searchIndex } from "@/lib/catalogue-db";
import type { Product } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type SearchEvent =
  | { type: "start"; shops: { id: string; name: string }[] }
  | { type: "index"; products: Product[] }
  | { type: "shop"; id: string; ok: boolean; ms: number; products: Product[] }
  | { type: "end" };

/** Newline-delimited JSON: one line per shop, sent the moment that shop answers. */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 120);
  const adapters = liveAdapters();
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (e: SearchEvent) => ctrl.enqueue(enc.encode(JSON.stringify(e) + "\n"));
      send({ type: "start", shops: adapters.map((a) => ({ id: a.id, name: a.name })) });

      // the nightly index answers instantly; live shops then refresh prices and add anything new
      try {
        const indexed = searchIndex(q);
        if (indexed.length) send({ type: "index", products: indexed });
      } catch (e) {
        console.warn("[index]", (e as Error).message);
      }

      await Promise.all(
        adapters.map(async (a) => {
          const t0 = Date.now();
          // adapters never throw, but a hung one shouldn't hold the rest up
          const products = await Promise.race([
            a.search({ q, filters: EMPTY_FILTERS, sort: "relevance" }),
            new Promise<null>((r) => setTimeout(() => r(null), TIMEOUT_MS + 500)),
          ]);
          send({ type: "shop", id: a.id, ok: products !== null && products.length > 0, ms: Date.now() - t0, products: products ?? [] });
        }),
      );
      send({ type: "end" });
      ctrl.close();
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}
