"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Squiggle } from "@/components/doodles";
import { Garment } from "@/components/Garment";
import { Header } from "@/components/Header";
import { HeartButton } from "@/components/HeartButton";
import { ProductCard } from "@/components/ProductCard";
import { COLOURS } from "@/lib/catalogue";
import { displayTitle } from "@/lib/display";
import { sizeLabel, sortSizes } from "@/lib/normalise";
import { pin, recall } from "@/lib/product-cache";
import { formatGbp } from "@/lib/search";
import { noteViewed, useMySizes, useViewed, useWishlist } from "@/lib/storage";
import type { Product } from "@/lib/types";

export default function ItemPage() {
  const { id: raw } = useParams<{ id: string }>();
  const id = decodeURIComponent(raw);
  const router = useRouter();
  const [wish] = useWishlist();
  const [, setViewed] = useViewed();
  const [p, setP] = useState<Product | null | undefined>(undefined);
  const [similar, setSimilar] = useState<Product[] | null>(null);

  useEffect(() => {
    let alive = true;
    const known = recall(id) ?? wish.find((w) => w.id === id);
    setP(known ?? undefined);
    setSimilar(null);
    (async () => {
      if (known) {
        const r = await fetch("/api/product", { method: "POST", body: JSON.stringify({ product: known }) });
        const j = await r.json();
        if (alive) setSimilar(j.similar ?? []);
      } else {
        const r = await fetch(`/api/product?id=${encodeURIComponent(id)}`);
        const j = await r.json();
        if (!alive) return;
        setP(j.product ?? null);
        setSimilar(j.similar ?? []);
        if (j.product) pin(j.product);
      }
    })().catch(() => alive && setSimilar([]));
    return () => {
      alive = false;
    };
    // wishlist is only a fallback source; don't refetch when it changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // what she opens quietly teaches the "picked for you" feed
  useEffect(() => {
    if (p) setViewed((list) => noteViewed(list, p));
  }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl pb-32 md:px-8 md:pb-16">
        {p === undefined && <DetailSkeleton />}
        {p === null && (
          <div className="mx-auto max-w-sm px-4 py-20 text-center">
            <p className="serif text-[26px] italic">this one&rsquo;s wandered off</p>
            <p className="mt-3 text-[14.5px] text-muted">It may have sold out or left the shop. Try searching for it again.</p>
            <button onClick={() => router.back()} className="mt-6 h-11 rounded-full border border-line px-5 text-[14px] hover:bg-card">
              go back
            </button>
          </div>
        )}
        {p && <Detail p={p} onBack={() => router.back()} />}

        {p && (
          <section className="mt-14 px-4 md:px-0">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="serif text-[24px] italic">you might also like</h2>
              <span className="font-hand text-[16px] text-muted">same vibe, similar price</span>
            </div>
            {similar === null ? (
              <div className="flex gap-3 overflow-hidden">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="breathe aspect-[3/4] w-[44%] shrink-0 rounded-[18px] bg-card sm:w-[22%]" style={{ animationDelay: `${i * 120}ms` }} />
                ))}
              </div>
            ) : similar.length ? (
              <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 no-scrollbar md:mx-0 md:px-0">
                {similar.map((s, i) => (
                  <div key={s.id} className="w-[44%] shrink-0 snap-start sm:w-[30%] lg:w-[22%]">
                    <ProductCard p={s} index={i} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[14px] text-muted">Nothing close enough yet. The index grows every night.</p>
            )}
          </section>
        )}
      </main>
    </>
  );
}

function Detail({ p, onBack }: { p: Product; onBack: () => void }) {
  const [mySizes] = useMySizes();
  const best = p.offers[0];
  const was = best.wasPriceGbp;
  const sizes = sortSizes(p.offers.flatMap((o) => o.sizesInStock));
  const swatch = COLOURS.find((c) => c.id === p.colourFamily)?.swatch;

  return (
    <div className="md:grid md:grid-cols-[1.1fr_1fr] md:gap-12 md:pt-6">
      <Gallery p={p} onBack={onBack} />

      <div className="px-4 pt-5 md:px-0 md:pt-0">
        <p className="text-[11.5px] font-medium uppercase tracking-[0.16em] text-muted">{p.brand}</p>
        <h1 className="serif mt-1 text-[28px] leading-[1.1] tracking-[-0.01em] md:text-[38px]">{displayTitle(p)}</h1>

        <div className="mt-4 flex items-end gap-3">
          <span className="serif text-[34px] leading-none">{formatGbp(best.priceGbp)}</span>
          {was && <s className="pb-1 text-[16px] text-muted decoration-accent/70">{formatGbp(was)}</s>}
          {was && <span className="mb-1 rounded-full bg-accent px-2.5 py-1 text-[11.5px] font-medium text-on-accent">−{Math.round((1 - best.priceGbp / was) * 100)}%</span>}
        </div>
        <p className="mt-2 text-[13.5px] text-muted">
          {p.offers.length > 1 ? (
            <>
              cheapest at <span className="text-ink">{best.retailerName}</span>, {p.offers.length} shops have it
            </>
          ) : (
            <>at {best.retailerName}</>
          )}
          {p.isResale && <span className="ml-2 rounded-[6px] bg-tag px-1.5 py-0.5 font-hand text-[14px] text-tag-ink">pre-loved</span>}
        </p>

        {p.colourRaw && (
          <p className="mt-5 flex items-center gap-2 text-[14px]">
            {swatch && <span className="h-4 w-4 rounded-full ring-1 ring-line" style={{ background: swatch }} />}
            <span className="capitalize">{p.colourRaw.toLowerCase()}</span>
          </p>
        )}

        {sizes.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-[11.5px] uppercase tracking-[0.12em] text-muted">in stock somewhere</p>
            <ul className="flex flex-wrap gap-1.5">
              {sizes.map((s) => (
                <li key={s} className={`min-w-10 rounded-full border px-3 py-1.5 text-center text-[13px] ${mySizes.includes(s) ? "border-accent bg-accent/10 font-medium" : "border-line text-ink/80"}`}>
                  {sizeLabel(s)}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <a
            href={best.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-full bg-accent text-[15.5px] font-medium text-on-accent transition active:scale-[0.98]"
          >
            Go to {best.retailerName}
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path d="M8 16L16 8M9 8h7v7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <HeartButton product={p} className="relative !h-[52px] !w-[52px] border border-line !bg-bg" />
        </div>

        <WhereToBuy p={p} mySizes={mySizes} />

        {p.description && <Description text={p.description} />}
      </div>
    </div>
  );
}

function Gallery({ p, onBack }: { p: Product; onBack: () => void }) {
  const [i, setI] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
  const imgs = p.images;

  return (
    <div className="relative">
      <div
        ref={strip}
        onScroll={(e) => {
          const el = e.currentTarget;
          setI(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="flex aspect-[3/4] snap-x snap-mandatory overflow-x-auto bg-card no-scrollbar md:rounded-[24px]"
      >
        {imgs.length ? (
          imgs.map((src, n) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt={n === 0 ? p.title : ""} loading={n === 0 ? "eager" : "lazy"} className="h-full w-full shrink-0 snap-center object-cover" />
          ))
        ) : (
          <div className="grid h-full w-full shrink-0 place-items-center p-[14%]">
            <Garment id={p.id} category={p.category} colour={COLOURS.find((c) => c.id === p.colourFamily)?.swatch?.startsWith("#") ? COLOURS.find((c) => c.id === p.colourFamily)!.swatch : "#e9d5c9"} patterned={p.colourFamily === "multi"} />
          </div>
        )}
      </div>

      <button
        onClick={onBack}
        aria-label="Back"
        className="absolute left-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-bg/85 text-ink shadow-sm backdrop-blur-sm transition active:scale-90 md:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {imgs.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
          {imgs.map((_, n) => (
            <span key={n} className={`h-1.5 rounded-full bg-bg transition-all duration-300 ${n === i ? "w-5 opacity-100" : "w-1.5 opacity-60"}`} />
          ))}
        </div>
      )}

      {imgs.length > 1 && (
        <div className="mt-3 hidden gap-2 md:flex">
          {imgs.map((src, n) => (
            <button
              key={src}
              onClick={() => strip.current?.scrollTo({ left: n * strip.current.clientWidth, behavior: "smooth" })}
              className={`aspect-[3/4] w-16 overflow-hidden rounded-[10px] ring-offset-2 ring-offset-bg transition ${n === i ? "ring-2 ring-accent" : "opacity-70 hover:opacity-100"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function WhereToBuy({ p, mySizes }: { p: Product; mySizes: string[] }) {
  return (
    <section className="mt-9">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="serif text-[22px] italic">where to buy</h2>
        {p.offers.length > 1 && <span className="font-hand text-[16px] text-muted">cheapest first</span>}
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-[20px] border border-line">
        {p.offers.map((o, n) => {
          const fits = o.sizesInStock.filter((s) => mySizes.includes(s));
          return (
            <li key={o.retailerId + o.url} className={`relative flex items-center gap-3 px-4 py-3.5 ${n === 0 ? "bg-wash" : ""}`}>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[15px] text-ink">
                  {o.retailerName}
                  {n === 0 && p.offers.length > 1 && (
                    <span className="relative font-hand text-[15px] text-accent">
                      cheapest
                      <Squiggle className="absolute -bottom-1 left-0 h-1.5 w-full text-accent/60" />
                    </span>
                  )}
                </p>
                <p className="mt-0.5 truncate text-[12.5px] text-muted">
                  {o.sizesInStock.length
                    ? fits.length
                      ? `your size ${fits.map(sizeLabel).join(", ")} in stock`
                      : `sizes ${o.sizesInStock.slice(0, 6).map(sizeLabel).join(", ")}${o.sizesInStock.length > 6 ? "…" : ""}`
                    : "check sizes on their site"}
                </p>
              </div>
              <div className="text-right">
                <p className="serif text-[19px] leading-none">{formatGbp(o.priceGbp)}</p>
                {o.wasPriceGbp && <s className="text-[12px] text-muted">{formatGbp(o.wasPriceGbp)}</s>}
              </div>
              <a
                href={o.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Go to ${o.retailerName}`}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-bg text-ink transition hover:border-accent/60 active:scale-90"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path d="M8 16L16 8M9 8h7v7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Description({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="mt-8">
      <h2 className="serif text-[22px] italic">the details</h2>
      <p className={`mt-2 whitespace-pre-line text-[14.5px] leading-relaxed text-ink/85 ${open ? "" : "line-clamp-4"}`}>{text}</p>
      {text.length > 220 && (
        <button onClick={() => setOpen((o) => !o)} className="mt-1 text-[13.5px] text-muted underline decoration-dotted underline-offset-4 hover:text-ink">
          {open ? "less" : "read more"}
        </button>
      )}
    </section>
  );
}

function DetailSkeleton() {
  return (
    <div className="md:grid md:grid-cols-[1.1fr_1fr] md:gap-12 md:pt-6">
      <div className="breathe aspect-[3/4] bg-card md:rounded-[24px]" />
      <div className="space-y-3 px-4 pt-5 md:px-0">
        <div className="breathe h-3 w-24 rounded-full bg-card" />
        <div className="breathe h-8 w-4/5 rounded-full bg-card" />
        <div className="breathe h-9 w-28 rounded-full bg-card" />
        <div className="breathe mt-6 h-[52px] w-full rounded-full bg-card" />
      </div>
    </div>
  );
}

