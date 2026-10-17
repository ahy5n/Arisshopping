"use client";

import { Heart, Sparkle } from "@/components/doodles";
import { EmptyState } from "@/components/EmptyState";
import { Header } from "@/components/Header";
import { ProductCard } from "@/components/ProductCard";
import { cheapest, formatGbp } from "@/lib/search";
import { useMySizes, useWishlist } from "@/lib/storage";

export default function WishlistPage() {
  const [items] = useWishlist();
  const [sizes] = useMySizes();
  const total = items.reduce((n, p) => n + cheapest(p).priceGbp, 0);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-32 md:px-8">
        <div className="flex items-end justify-between gap-4 pb-6 pt-6">
          <div>
            <h1 className="serif text-[40px] italic leading-none tracking-[-0.02em] md:text-[56px]">wishlist</h1>
            {items.length > 0 && (
              <p className="mt-3 text-[14px] text-muted">
                {items.length} {items.length === 1 ? "thing" : "things"} · {formatGbp(Math.round(total))} if you got the lot
              </p>
            )}
          </div>
          {items.length > 0 && (
            <p className="max-w-[9rem] text-right font-hand text-[16px] leading-tight text-muted">prices as of when you hearted them</p>
          )}
        </div>

        {items.length === 0 ? (
          <EmptyState
            title="Nothing yet"
            body="Tap the little heart on anything you like and it'll wait for you here. Start hearting things."
            art={
              <div className="relative">
                <Heart className="h-20 w-20 -rotate-6" />
                <Sparkle className="absolute -right-3 -top-1 h-5 w-5" />
              </div>
            }
            cta={{ href: "/", label: "Go looking" }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-x-5 md:gap-y-10">
            {items.map((p, i) => (
              <ProductCard key={p.id} p={p} index={i} mySizes={sizes} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
