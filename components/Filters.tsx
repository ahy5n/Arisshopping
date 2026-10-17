"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CATEGORIES, COLOURS, PRICE_CAP, SIZES } from "@/lib/catalogue";
import type { Condition, Filters } from "@/lib/types";

type Props = {
  f: Filters;
  set: (next: Filters) => void;
  brands: string[];
};

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="border-b border-line py-5 last:border-0">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="serif text-[17px] text-ink">{title}</h3>
        {hint && <span className="font-hand text-[15px] text-muted">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-9 rounded-full border px-3.5 text-[13.5px] transition-all duration-200 active:scale-95 ${
        on ? "border-accent bg-accent text-on-accent" : "border-line bg-bg text-ink hover:border-accent/50"
      }`}
    >
      {children}
    </button>
  );
}

export function FilterPanel({ f, set, brands }: Props) {
  const [brandQ, setBrandQ] = useState("");
  const shownBrands = useMemo(
    () => brands.filter((b) => b.toLowerCase().includes(brandQ.toLowerCase())),
    [brands, brandQ],
  );

  return (
    <div>
      <Section title="New or pre-loved">
        <div className="relative grid grid-cols-3 rounded-full bg-card p-1" role="radiogroup">
          {(["all", "new", "resale"] as Condition[]).map((c) => (
            <button
              key={c}
              role="radio"
              aria-checked={f.condition === c}
              onClick={() => set({ ...f, condition: c })}
              className={`relative z-10 h-9 rounded-full text-[13.5px] transition-colors ${f.condition === c ? "text-ink" : "text-muted"}`}
            >
              {f.condition === c && (
                <motion.span layoutId="cond" className="absolute inset-0 -z-10 rounded-full bg-bg shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 35 }} />
              )}
              {c === "all" ? "Both" : c === "new" ? "New" : "Pre-loved"}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Colour" hint={f.colours.length ? `${f.colours.length} picked` : undefined}>
        <div className="grid grid-cols-8 gap-x-1 gap-y-3">
          {COLOURS.map((c) => {
            const on = f.colours.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                aria-label={c.label}
                title={c.label}
                onClick={() => set({ ...f, colours: toggle(f.colours, c.id) })}
                className="group grid place-items-center"
              >
                <span
                  className={`block h-8 w-8 rounded-full ring-offset-2 ring-offset-bg transition-all duration-200 ${
                    on ? "scale-110 ring-2 ring-accent" : "ring-1 ring-line group-hover:scale-105"
                  }`}
                  style={{ background: c.swatch }}
                />
              </button>
            );
          })}
        </div>
        <label className="mt-4 flex h-11 items-center gap-2 rounded-full border border-line bg-bg px-4 focus-within:border-accent/60">
          <span className="font-hand text-[16px] text-muted">or a shade:</span>
          <input
            value={f.shade}
            onChange={(e) => set({ ...f, shade: e.target.value })}
            placeholder="sage, burgundy…"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted/60"
          />
        </label>
      </Section>

      <Section title="Price" hint={`£${f.minPrice} – ${f.maxPrice >= PRICE_CAP ? "£500+" : `£${f.maxPrice}`}`}>
        <PriceRange f={f} set={set} />
      </Section>

      <Section title="Size" hint="we'll remember these">
        <div className="space-y-3">
          {Object.entries(SIZES).map(([group, list]) => (
            <div key={group}>
              <p className="mb-1.5 text-[11.5px] uppercase tracking-[0.12em] text-muted">{group}</p>
              <div className="flex flex-wrap gap-1.5">
                {list.map((s) => {
                  const key = group === "UK shoe" ? `shoe ${s}` : s;
                  return (
                    <Chip key={key} on={f.sizes.includes(key)} onClick={() => set({ ...f, sizes: toggle(f.sizes, key) })}>
                      {s}
                    </Chip>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Category">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <Chip key={c.id} on={f.categories.includes(c.id)} onClick={() => set({ ...f, categories: toggle(f.categories, c.id) })}>
              {c.label}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Brand" hint={brands.length ? `${brands.length} in these results` : undefined}>
        <input
          value={brandQ}
          onChange={(e) => setBrandQ(e.target.value)}
          placeholder="Search brands"
          className="mb-3 h-11 w-full rounded-full border border-line bg-bg px-4 text-[15px] text-ink outline-none placeholder:text-muted/60 focus:border-accent/60"
        />
        <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
          {shownBrands.map((b) => (
            <Chip key={b} on={f.brands.includes(b)} onClick={() => set({ ...f, brands: toggle(f.brands, b) })}>
              {b}
            </Chip>
          ))}
          {!shownBrands.length && <p className="text-[13px] text-muted">No brands match that.</p>}
        </div>
      </Section>

      <Section title="Sale only">
        <button
          role="switch"
          aria-checked={f.saleOnly}
          onClick={() => set({ ...f, saleOnly: !f.saleOnly })}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-[14px] text-muted">Only show things that are reduced</span>
          <span className={`relative h-7 w-12 rounded-full transition-colors duration-300 ${f.saleOnly ? "bg-accent" : "bg-card"}`}>
            <motion.span
              className="absolute top-1 h-5 w-5 rounded-full bg-bg shadow"
              animate={{ left: f.saleOnly ? 24 : 4 }}
              transition={{ type: "spring", stiffness: 600, damping: 32 }}
            />
          </span>
        </button>
      </Section>
    </div>
  );
}

function PriceRange({ f, set }: { f: Filters; set: (n: Filters) => void }) {
  const lo = (f.minPrice / PRICE_CAP) * 100;
  const hi = (f.maxPrice / PRICE_CAP) * 100;
  return (
    <div>
      <div className="relative h-7">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-card" />
        <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-accent" style={{ left: `${lo}%`, right: `${100 - hi}%` }} />
        <input
          type="range" min={0} max={PRICE_CAP} step={5} value={f.minPrice} aria-label="Minimum price"
          onChange={(e) => set({ ...f, minPrice: Math.min(+e.target.value, f.maxPrice - 5) })}
          className="absolute inset-0 w-full"
        />
        <input
          type="range" min={0} max={PRICE_CAP} step={5} value={f.maxPrice} aria-label="Maximum price"
          onChange={(e) => set({ ...f, maxPrice: Math.max(+e.target.value, f.minPrice + 5) })}
          className="absolute inset-0 w-full"
        />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <NumberBox label="min" value={f.minPrice} onChange={(v) => set({ ...f, minPrice: Math.max(0, Math.min(v, f.maxPrice)) })} />
        <span className="text-muted">–</span>
        <NumberBox label="max" value={f.maxPrice} plus={f.maxPrice >= PRICE_CAP} onChange={(v) => set({ ...f, maxPrice: Math.min(PRICE_CAP, Math.max(v, f.minPrice)) })} />
      </div>
    </div>
  );
}

function NumberBox({ label, value, onChange, plus }: { label: string; value: number; onChange: (v: number) => void; plus?: boolean }) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => setTxt(String(value)), [value]);
  return (
    <label className="flex h-11 flex-1 items-center gap-1 rounded-full border border-line bg-bg px-4 focus-within:border-accent/60">
      <span className="text-[12px] text-muted">{label}</span>
      <span className="ml-auto text-muted">£</span>
      <input
        inputMode="numeric"
        value={txt}
        onChange={(e) => setTxt(e.target.value.replace(/\D/g, ""))}
        onBlur={() => onChange(Number(txt || 0))}
        className="w-12 bg-transparent text-right text-[15px] text-ink outline-none"
      />
      {plus && <span className="text-muted">+</span>}
    </label>
  );
}

export function FilterSheet({ open, onClose, count, onClear, children }: { open: boolean; onClose: () => void; count: number; onClear: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", esc);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-[28px] bg-bg shadow-[0_-20px_60px_-20px_color-mix(in_oklab,var(--ink)_40%,transparent)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => (i.offset.y > 120 || i.velocity.y > 600) && onClose()}
          >
            <div className="flex cursor-grab justify-center pb-1 pt-3">
              <span className="h-1.5 w-10 rounded-full bg-line" />
            </div>
            <div className="flex items-center justify-between px-5 pb-1">
              <h2 className="serif text-[24px] italic text-ink">filters</h2>
              <button onClick={onClear} className="text-[13.5px] text-muted underline-offset-4 hover:underline">
                clear all
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5" onPointerDownCapture={(e) => e.stopPropagation()}>
              {children}
            </div>
            <div className="border-t border-line px-5 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3">
              <button
                onClick={onClose}
                className="h-[52px] w-full rounded-full bg-accent text-[15.5px] font-medium text-on-accent transition active:scale-[0.98]"
              >
                {count === 0 ? "Nothing matches yet" : `Show ${count} ${count === 1 ? "thing" : "things"}`}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
