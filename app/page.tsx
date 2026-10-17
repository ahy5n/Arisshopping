"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Arrow, Squiggle } from "@/components/doodles";
import { FilterPanel, FilterSheet } from "@/components/Filters";
import { Header } from "@/components/Header";
import { CardSkeleton, ProductCard } from "@/components/ProductCard";
import { SearchBar } from "@/components/SearchBar";
import { CATEGORIES, COLOURS, EMPTY_FILTERS, PRICE_CAP } from "@/lib/catalogue";
import { sizeLabel } from "@/lib/normalise";
import { groupProducts } from "@/lib/group";
import { remember } from "@/lib/product-cache";
import { activeFilterCount, applyFilters } from "@/lib/search";
import { pushRecent, useMySizes, useRecents, useSavedSearches } from "@/lib/storage";
import type { Filters, SortKey } from "@/lib/types";
import { useSearch, type ShopStatus } from "@/lib/useSearch";

const PAGE = 48;
const VIEW_KEY = "aris:view";
type SavedView = { q: string; f: Filters; sort: SortKey; shown: number; y: number };

const SORTS: { id: SortKey; label: string }[] = [
  { id: "relevance", label: "Best match" },
  { id: "price-asc", label: "£ low to high" },
  { id: "price-desc", label: "£ high to low" },
];

const IDEAS = ["satin skirt", "black midi dress", "corset top", "cream knit", "ballet flats"];

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "still up, ari?";
  if (h < 12) return "morning, ari";
  if (h < 18) return "afternoon, ari";
  return "evening, ari";
}

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("relevance");
  const [mySizes, setMySizes] = useMySizes();
  const [f, setF] = useState<Filters>(EMPTY_FILTERS);
  const [sheet, setSheet] = useState(false);
  const [hello, setHello] = useState("hello, ari");
  const [, setRecents] = useRecents();
  const { items, shops, loading, failed } = useSearch(q);

  // coming back from a product: same search, same filters, same scroll position
  const restoreY = useRef<number | null>(null);
  const restoring = useRef(false);
  useEffect(() => {
    setHello(greeting());
    const initial = new URLSearchParams(location.search).get("q") ?? "";
    try {
      const v = JSON.parse(sessionStorage.getItem(VIEW_KEY) ?? "null") as SavedView | null;
      if (v && v.q === initial) {
        restoring.current = true;
        setF(v.f);
        setSort(v.sort);
        setShown(v.shown);
        restoreY.current = v.y;
      }
    } catch {}
    if (initial) setQ(initial);
  }, []);

  // her sizes come back every visit
  useEffect(() => {
    if (mySizes.length) setF((prev) => (prev.sizes.length ? prev : { ...prev, sizes: mySizes }));
  }, [mySizes]);

  const update = useCallback(
    (next: Filters) => {
      if (next.sizes !== f.sizes) setMySizes(next.sizes);
      setF(next);
    },
    [f.sizes, setMySizes],
  );

  const search = (next: string) => {
    setQ(next);
    const url = next ? `?q=${encodeURIComponent(next)}` : location.pathname;
    history.replaceState(null, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // same item at several shops → one card (brief §6.4), then filters and sort
  const grouped = useMemo(() => groupProducts(items), [items]);
  const results = useMemo(() => applyFilters(grouped, f, sort, q), [grouped, f, sort, q]);
  useEffect(() => remember(grouped), [grouped]);

  // infinite scroll: draw PAGE at a time, more as she nears the bottom
  const [shown, setShown] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (restoring.current) return;
    setShown(PAGE);
  }, [q, f, sort]);

  // remember the view as she scrolls, put the scroll back once the feed is long enough again
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const save = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        try {
          sessionStorage.setItem(VIEW_KEY, JSON.stringify({ q, f, sort, shown, y: window.scrollY } satisfies SavedView));
        } catch {}
      }, 150);
    };
    save();
    window.addEventListener("scroll", save, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", save);
    };
  }, [q, f, sort, shown]);
  useEffect(() => {
    if (restoreY.current === null || !results.length || loading) return;
    const y = restoreY.current;
    restoreY.current = null;
    requestAnimationFrame(() => window.scrollTo({ top: y }));
    restoring.current = false;
  }, [results.length, loading]);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setShown((n) => n + PAGE), { rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  }, [results.length]);
  const brands = useMemo(() => [...new Set(items.map((p) => p.brand))].sort(), [items]);
  const nFilters = activeFilterCount(f);
  const waiting = shops.filter((s) => s.state === "waiting").length;

  return (
    <>
      <Header>
        <SearchBar value={q} onSearch={search} />
        <ActiveChips f={f} set={update} />
      </Header>

      <main className="mx-auto max-w-7xl px-4 pb-32 md:px-8 md:pb-16">
        <div className="md:grid md:grid-cols-[264px_1fr] md:gap-10">
          <aside className="hidden md:block">
            <div className="sticky top-[calc(var(--header-h,120px)+16px)] max-h-[calc(100dvh-var(--header-h,120px)-32px)] overflow-y-auto pr-2 no-scrollbar">
              <div className="flex items-center justify-between pt-2">
                <h2 className="serif text-[22px] italic">filters</h2>
                {nFilters > 0 && (
                  <button onClick={() => update({ ...EMPTY_FILTERS })} className="text-[13px] text-muted underline-offset-4 hover:underline">
                    clear all
                  </button>
                )}
              </div>
              <FilterPanel f={f} set={update} brands={brands} />
            </div>
          </aside>

          <div>
            {!q ? (
                <section key="hello" className="rise pb-4 pt-6 md:pt-8">
                  <h1 className="serif text-[42px] leading-[0.95] tracking-[-0.03em] text-ink md:text-[64px]">
                    {hello.split(", ")[0]},{" "}
                    <span className="relative inline-block italic text-accent">
                      {hello.split(", ")[1]}
                      <Squiggle className="absolute -bottom-2 left-0 h-3 w-full text-accent/70" />
                    </span>
                  </h1>
                  <p className="mt-4 max-w-md text-[15.5px] leading-relaxed text-muted">
                    Type anything. I&rsquo;ll look across the shops at once and put the cheapest one first.
                  </p>
                  <div className="mt-5 flex items-start gap-2">
                    <Arrow className="mt-1 hidden h-7 w-9 shrink-0 -scale-x-100 text-muted/70 sm:block" />
                    <div className="flex flex-wrap gap-1.5">
                      {IDEAS.map((idea, i) => (
                        <button
                          key={idea}
                          onClick={() => {
                            setRecents((r) => pushRecent(r, idea));
                            search(idea);
                          }}
                          className="rise min-h-9 rounded-full border border-dashed border-muted/40 px-3.5 text-[13.5px] text-ink transition hover:border-solid hover:border-accent hover:bg-card"
                          style={{ animationDelay: `${120 + i * 50}ms` }}
                        >
                          {idea}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              ) : (
                <section key={`q-${q}`} className="rise pb-2 pt-5">
                  <p className="text-[13px] text-muted">you searched</p>
                  <div className="flex items-end justify-between gap-3">
                    <h1 className="serif min-w-0 text-[30px] leading-tight tracking-[-0.02em] md:text-[40px]">
                      &ldquo;<span className="italic">{q}</span>&rdquo;
                    </h1>
                    <SaveSearch q={q} f={f} sort={sort} />
                  </div>
                </section>
              )}

            <ShopTicker shops={shops} />

            <div className="sort-bar sticky top-[calc(var(--header-h,120px)-1px)] z-20 -mx-4 mb-3 flex items-center gap-2 bg-bg/95 px-4 py-2.5 md:static md:mx-0 md:bg-transparent md:px-0 md:backdrop-blur-none">
              <button
                onClick={() => setSheet(true)}
                className="flex h-10 items-center gap-2 rounded-full border border-line bg-bg px-4 text-[14px] text-ink transition active:scale-95 md:hidden"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path d="M4 7h9M17 7h3M4 17h3M11 17h9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <circle cx="15" cy="7" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="9" cy="17" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                </svg>
                Filters
                {nFilters > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-medium text-on-accent">{nFilters}</span>
                )}
              </button>
              <div className="flex gap-1 overflow-x-auto no-scrollbar">
                {SORTS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSort(s.id)}
                    className={`h-10 shrink-0 rounded-full px-3.5 text-[13.5px] transition-colors ${
                      sort === s.id ? "bg-ink text-bg" : "text-muted hover:text-ink"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <span className="ml-auto hidden shrink-0 text-[13px] text-muted md:block">
                {results.length} {results.length === 1 ? "thing" : "things"}
              </span>
            </div>

            {failed ? (
              <Empty
                title="the shops aren't answering"
                body="Might be your signal, might be them. Give it a moment and try again."
                action="try again"
                onReset={() => search(q)}
              />
            ) : results.length === 0 && !loading ? (
              <Empty
                title="hmm, nothing quite like that"
                body={items.length ? "There are results, but your filters hide them all. Loosen one or two?" : "Try fewer words, or a different way of saying it. Shops name things oddly sometimes."}
                action="start fresh"
                onReset={() => { update({ ...EMPTY_FILTERS }); search(""); }}
              />
            ) : (
              <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-x-5 md:gap-y-10">
                {results.slice(0, shown).map((p, i) => (
                  <ProductCard key={p.id} p={p} index={i % PAGE} mySizes={f.sizes} />
                ))}
                {(waiting > 0 || (loading && !shops.length)) && Array.from({ length: Math.min(Math.max(waiting, 3) * 2, 6) }, (_, i) => <CardSkeleton key={`s${i}`} i={i} />)}
              </div>
            )}

            <div ref={sentinel} aria-hidden="true" />
            {shown < results.length && (
              <p className="mt-10 text-center text-[13px] text-muted">
                {results.length - shown} more as you scroll…
              </p>
            )}
            {!loading && results.length > 0 && shown >= results.length && (
              <p className="mt-12 text-center font-hand text-[20px] text-muted">that&rsquo;s everything for now ♡</p>
            )}
          </div>
        </div>
      </main>

      <FilterSheet open={sheet} onClose={() => setSheet(false)} count={results.length} onClear={() => update({ ...EMPTY_FILTERS })}>
        <FilterPanel f={f} set={update} brands={brands} />
      </FilterSheet>
    </>
  );
}

function SaveSearch({ q, f, sort }: { q: string; f: Filters; sort: SortKey }) {
  const [saved, setSaved] = useSavedSearches();
  const same = saved.find((s) => s.q.toLowerCase() === q.toLowerCase() && JSON.stringify(s.f) === JSON.stringify(f));
  return (
    <button
      onClick={() =>
        setSaved((list) =>
          same
            ? list.filter((s) => s.id !== same.id)
            : [{ id: crypto.randomUUID(), name: q, q, f, sort, at: new Date().toISOString() }, ...list],
        )
      }
      aria-pressed={Boolean(same)}
      className={`mb-1 flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] transition active:scale-95 ${
        same ? "bg-tag text-tag-ink" : "border border-line text-ink hover:border-accent/60"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path d="M7 4.5h10c.6 0 1 .4 1 1v14l-6-3.8-6 3.8v-14c0-.6.4-1 1-1z" fill={same ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
      {same ? "saved" : "save"}
    </button>
  );
}

function ShopTicker({ shops }: { shops: ShopStatus[] }) {
  const done = shops.filter((s) => s.state === "done").length;
  return (
    <div className="mb-1 flex items-center gap-3 overflow-x-auto py-2 text-[12.5px] no-scrollbar" aria-live="polite">
      <span className="shrink-0 text-muted">
        {!shops.length ? "asking the shops…" : shops.some((s) => s.state === "waiting") ? `asking ${shops.length} shops…` : `${done} of ${shops.length} shops answered`}
      </span>
      {shops.map((s) => (
        <span key={s.id} className={`flex shrink-0 items-center gap-1.5 transition-colors duration-500 ${s.state === "done" ? "text-ink" : s.state === "skipped" ? "text-muted/50 line-through decoration-muted/40" : "text-muted/60"}`}
          title={s.state === "skipped" ? `${s.name} didn't answer this time` : undefined}>
          <span className={`relative h-2 w-2 rounded-full transition-colors duration-500 ${s.state === "done" ? "bg-tag" : "bg-line"}`}>
            {s.state === "waiting" && <span className="absolute inset-0 animate-ping rounded-full bg-accent/40" />}
          </span>
          {s.name}
        </span>
      ))}
    </div>
  );
}

function ActiveChips({ f, set }: { f: Filters; set: (n: Filters) => void }) {
  const chips: { key: string; label: string; clear: () => Filters }[] = [
    ...f.colours.map((c) => ({ key: `c-${c}`, label: COLOURS.find((x) => x.id === c)!.label, clear: () => ({ ...f, colours: f.colours.filter((x) => x !== c) }) })),
    ...(f.shade ? [{ key: "shade", label: f.shade, clear: () => ({ ...f, shade: "" }) }] : []),
    ...(f.minPrice > 0 || f.maxPrice < PRICE_CAP
      ? [{ key: "price", label: `£${f.minPrice}–${f.maxPrice >= PRICE_CAP ? "500+" : f.maxPrice}`, clear: () => ({ ...f, minPrice: 0, maxPrice: PRICE_CAP }) }]
      : []),
    ...f.categories.map((c) => ({ key: `k-${c}`, label: CATEGORIES.find((x) => x.id === c)!.label, clear: () => ({ ...f, categories: f.categories.filter((x) => x !== c) }) })),
    ...f.brands.map((b) => ({ key: `b-${b}`, label: b, clear: () => ({ ...f, brands: f.brands.filter((x) => x !== b) }) })),
    ...(f.sizes.length ? [{ key: "sizes", label: `size ${f.sizes.map(sizeLabel).join(", ")}`, clear: () => ({ ...f, sizes: [] }) }] : []),
    ...(f.saleOnly ? [{ key: "sale", label: "on sale", clear: () => ({ ...f, saleOnly: false }) }] : []),
    ...(f.condition !== "all" ? [{ key: "cond", label: f.condition === "new" ? "new only" : "pre-loved only", clear: () => ({ ...f, condition: "all" as const }) }] : []),
  ];
  if (!chips.length) return null;
  return (
    <div className="-mx-4 mt-2.5 flex gap-1.5 overflow-x-auto px-4 no-scrollbar md:mx-0 md:px-0">
      <AnimatePresence initial={false}>
        {chips.map((c) => (
          <motion.button
            layout
            key={c.key}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => set(c.clear())}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-card pl-3 pr-2 text-[13px] text-ink"
          >
            {c.label}
            <svg viewBox="0 0 24 24" className="h-3 w-3 text-muted" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Empty({ title, body, action, onReset }: { title: string; body: string; action: string; onReset: () => void }) {
  return (
    <div className="mx-auto max-w-sm py-16 text-center">
      <p className="serif text-[26px] italic leading-tight">{title}</p>
      <p className="mt-3 text-[14.5px] leading-relaxed text-muted">{body}</p>
      <button onClick={onReset} className="mt-6 h-11 rounded-full border border-line px-5 text-[14px] text-ink hover:bg-card">
        {action}
      </button>
    </div>
  );
}
