"use client";

import { useEffect, useMemo, useState } from "react";
import { displayTitle } from "@/lib/display";
import { remember } from "@/lib/product-cache";
import { useMySizes, useViewed, useWishlist } from "@/lib/storage";
import type { Product } from "@/lib/types";
import { Sparkle } from "./doodles";
import { CardSkeleton, ProductCard } from "./ProductCard";

const CACHE = "aris:foryou";
type Pick = Product & { because?: string };

/** "Picked for you" on the home page, learned from her hearts and what she opens. */
export function ForYou() {
  const [hearts] = useWishlist();
  const [viewed] = useViewed();
  const [sizes] = useMySizes();
  const [picks, setPicks] = useState<Pick[] | null>(null);
  const [more, setMore] = useState(false);

  // only re-ask when her hearts (or recent views) actually change
  const key = useMemo(() => [...hearts.slice(0, 12), ...viewed.slice(0, 6)].map((p) => p.id).join("|"), [hearts, viewed]);

  useEffect(() => {
    if (!key) {
      setPicks([]);
      return;
    }
    try {
      const hit = JSON.parse(sessionStorage.getItem(CACHE) ?? "null") as { key: string; picks: Pick[] } | null;
      if (hit?.key === key) {
        setPicks(hit.picks);
        remember(hit.picks);
        return;
      }
    } catch {}
    let alive = true;
    setPicks(null);
    const slim = (p: Product) => ({ ...p, description: undefined, images: p.images.slice(0, 1) });
    fetch("/api/foryou", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ liked: hearts.slice(0, 12).map(slim), viewed: viewed.slice(0, 12).map(slim) }),
    })
      .then((r) => r.json())
      .then(({ picks }: { picks: Pick[] }) => {
        if (!alive) return;
        setPicks(picks ?? []);
        remember(picks ?? []);
        try {
          sessionStorage.setItem(CACHE, JSON.stringify({ key, picks }));
        } catch {}
      })
      .catch(() => alive && setPicks([]));
    return () => {
      alive = false;
    };
    // hearts/viewed are captured through `key`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!key || (picks && picks.length === 0)) return null;

  const inspiredBy = hearts.length ? hearts.slice(0, 2).map(displayTitle) : viewed.slice(0, 1).map(displayTitle);
  const shown = more ? picks ?? [] : (picks ?? []).slice(0, 12);

  return (
    <section className="pb-10 pt-2">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="serif flex items-center gap-1.5 text-[28px] italic leading-none tracking-[-0.02em] md:text-[34px]">
            picked for you <Sparkle className="h-4 w-4 text-accent" />
          </h2>
          <p className="mt-1.5 font-hand text-[16px] leading-tight text-muted">
            because you {hearts.length ? "hearted" : "looked at"} {inspiredBy.join(" & ").toLowerCase()}
            {hearts.length > 2 ? ` and ${hearts.length - 2} more` : ""}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-x-5 md:gap-y-10">
        {picks === null
          ? Array.from({ length: 4 }, (_, i) => <CardSkeleton key={i} i={i} />)
          : shown.map((p, i) => <ProductCard key={p.id} p={p} index={i} mySizes={sizes} />)}
      </div>
      {picks && picks.length > 12 && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setMore((m) => !m)}
            className="h-11 rounded-full border border-line px-5 text-[14px] text-ink transition hover:border-accent/60"
          >
            {more ? "fewer" : `${picks.length - 12} more picks`}
          </button>
        </div>
      )}
    </section>
  );
}
