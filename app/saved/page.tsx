"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { Header } from "@/components/Header";
import { CATEGORIES, COLOURS, PRICE_CAP } from "@/lib/catalogue";
import { sizeLabel } from "@/lib/normalise";
import { activeFilterCount } from "@/lib/search";
import { openSaved, useSavedSearches, type SavedSearch } from "@/lib/storage";

function summary(s: SavedSearch) {
  const f = s.f;
  const bits = [
    ...f.colours.map((c) => COLOURS.find((x) => x.id === c)?.label.toLowerCase() ?? c),
    f.shade,
    ...f.categories.map((c) => CATEGORIES.find((x) => x.id === c)?.label.toLowerCase() ?? c),
    ...f.brands,
    f.minPrice > 0 || f.maxPrice < PRICE_CAP ? `£${f.minPrice}–${f.maxPrice >= PRICE_CAP ? "500+" : f.maxPrice}` : "",
    f.sizes.length ? `size ${f.sizes.map(sizeLabel).join(", ")}` : "",
    f.saleOnly ? "on sale" : "",
    f.condition === "new" ? "new only" : f.condition === "resale" ? "pre-loved only" : "",
  ].filter(Boolean);
  return bits;
}

export default function SavedPage() {
  const [saved, setSaved] = useSavedSearches();
  const router = useRouter();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-32 md:px-8">
        <div className="flex items-end justify-between pb-6 pt-6">
          <h1 className="serif text-[40px] italic leading-none tracking-[-0.02em] md:text-[56px]">saved</h1>
          {saved.length > 0 && <p className="max-w-[10rem] text-right font-hand text-[16px] leading-tight text-muted">tap one to run it again</p>}
        </div>

        {saved.length === 0 ? (
          <EmptyState
            title="No saved searches"
            body="When a search is just right (colour, size, price, the lot), tap save next to it and it'll be one tap away next time."
            art={
              <svg viewBox="0 0 80 80" className="h-20 w-20 rotate-3" aria-hidden="true">
                <path d="M22 12h36c2 0 3 1 3 3v53L40 55 19 68V15c0-2 1-3 3-3z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
                <path d="M30 28c6-2 14-2 20 0M30 37c5-1 10-1 14 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity=".6" />
              </svg>
            }
            cta={{ href: "/", label: "Start a search" }}
          />
        ) : (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {saved.map((s) => (
                <motion.li
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}
                >
                  <SavedRow
                    s={s}
                    onOpen={() => router.push(openSaved(s))}
                    onRename={(name) => setSaved((l) => l.map((x) => (x.id === s.id ? { ...x, name } : x)))}
                    onDelete={() => setSaved((l) => l.filter((x) => x.id !== s.id))}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </main>
    </>
  );
}

function SavedRow({ s, onOpen, onRename, onDelete }: { s: SavedSearch; onOpen: () => void; onRename: (n: string) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(s.name);
  const bits = summary(s);
  const n = activeFilterCount(s.f);

  return (
    <div className="group flex items-center gap-2 rounded-[22px] bg-wash p-2 pl-5">
      <div className="min-w-0 flex-1 py-2">
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onRename(name.trim() || s.q);
              setEditing(false);
            }}
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                onRename(name.trim() || s.q);
                setEditing(false);
              }}
              aria-label="Name this search"
              className="serif w-full border-b border-accent/50 bg-transparent text-[20px] italic text-ink outline-none"
            />
          </form>
        ) : (
          <button onClick={onOpen} className="block w-full text-left">
            <span className="serif block truncate text-[20px] italic text-ink">{s.name}</span>
            <span className="mt-0.5 block truncate text-[13px] text-muted">
              {s.name.toLowerCase() !== s.q.toLowerCase() && <>&ldquo;{s.q}&rdquo;{bits.length ? " · " : ""}</>}
              {bits.length ? bits.join(" · ") : n === 0 && s.name.toLowerCase() === s.q.toLowerCase() ? "no filters" : ""}
            </span>
          </button>
        )}
      </div>
      <button
        onClick={() => setEditing(true)}
        aria-label={`Rename ${s.name}`}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted transition hover:bg-bg hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        onClick={onDelete}
        aria-label={`Delete ${s.name}`}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted transition hover:bg-bg hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      <button
        onClick={onOpen}
        aria-label={`Run ${s.name}`}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-on-accent transition active:scale-90"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
