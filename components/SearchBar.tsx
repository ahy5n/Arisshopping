"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { PROMPTS } from "@/lib/catalogue";
import { pushRecent, useRecents } from "@/lib/storage";

export function SearchBar({ value, onSearch }: { value: string; onSearch: (q: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const [n, setN] = useState(0);
  const [recents, setRecents] = useRecents();
  const input = useRef<HTMLInputElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => setDraft(value), [value]);

  useEffect(() => {
    if (draft || focused) return;
    const t = setInterval(() => setN((x) => (x + 1) % PROMPTS.length), 3400);
    return () => clearInterval(t);
  }, [draft, focused]);

  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const go = (q: string) => {
    setDraft(q);
    setRecents((r) => pushRecent(r, q));
    setFocused(false);
    input.current?.blur();
    onSearch(q);
  };

  const showRecents = focused && !draft && recents.length > 0;

  return (
    <div ref={wrap} className="relative">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(draft);
        }}
        className={`flex h-[52px] items-center gap-2 rounded-full border bg-bg pl-4 pr-1.5 transition-[border-color,box-shadow] duration-300 ${
          focused
            ? "border-accent/60 shadow-[0_8px_30px_-8px_color-mix(in_oklab,var(--accent)_40%,transparent)]"
            : "border-line shadow-[0_2px_12px_-6px_color-mix(in_oklab,var(--ink)_20%,transparent)]"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-[19px] w-[19px] shrink-0 text-muted" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M15.2 15.4l4.6 4.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <div className="relative min-w-0 flex-1">
          <input
            ref={input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => setFocused(true)}
            enterKeyHint="search"
            autoComplete="off"
            aria-label="What are you looking for?"
            className="h-11 w-full bg-transparent text-[16px] text-ink outline-none"
          />
          {!draft && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center overflow-hidden text-[16px] text-muted/80">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={n}
                  initial={{ y: 14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -14, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="truncate"
                >
                  {PROMPTS[n]}
                </motion.span>
              </AnimatePresence>
            </span>
          )}
        </div>
        {draft && (
          <button
            type="button"
            aria-label="Clear"
            onClick={() => {
              setDraft("");
              input.current?.focus();
            }}
            className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-card"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <button
          type="submit"
          className="h-10 shrink-0 rounded-full bg-accent px-4 text-[14px] font-medium text-on-accent transition active:scale-95"
        >
          Find it
        </button>
      </form>

      <AnimatePresence>
        {showRecents && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            className="absolute inset-x-0 top-[60px] z-30 overflow-hidden rounded-[22px] border border-line bg-bg p-2 shadow-[0_20px_50px_-20px_color-mix(in_oklab,var(--ink)_35%,transparent)]"
          >
            <div className="flex items-center justify-between px-3 pb-1 pt-2">
              <p className="font-hand text-[18px] text-muted">you looked for…</p>
              <button onClick={() => setRecents([])} className="text-[12.5px] text-muted underline-offset-4 hover:underline">
                clear all
              </button>
            </div>
            <ul>
              {recents.map((r) => (
                <li key={r} className="flex items-center">
                  <button
                    onClick={() => go(r)}
                    className="flex min-h-11 flex-1 items-center gap-3 rounded-xl px-3 text-left text-[15px] text-ink hover:bg-card"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-muted" aria-hidden="true">
                      <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4M12 8v4l3 2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="truncate">{r}</span>
                  </button>
                  <button
                    aria-label={`Remove ${r}`}
                    onClick={() => setRecents((l) => l.filter((x) => x !== r))}
                    className="grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-card"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
