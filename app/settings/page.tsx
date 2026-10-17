"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ShopRow } from "@/app/api/shops/route";
import { Header } from "@/components/Header";
import { DEFAULT_PALETTE, PALETTES, type PaletteId } from "@/lib/palettes";
import { useStored } from "@/lib/storage";

type Mode = "auto" | "light" | "dark";

const STATE_LABEL: Record<ShopRow["state"], string> = {
  live: "searching",
  "needs-key": "needs a key",
  later: "coming later",
  blocked: "unavailable",
  unreachable: "unavailable",
  "not-pounds": "not in £",
};

function Block({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="rounded-[24px] bg-wash p-5 md:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="serif text-[21px] text-ink">{title}</h2>
        {note && <span className="text-right font-hand text-[16px] text-muted">{note}</span>}
      </div>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const [palette, setPalette] = useStored<PaletteId>("palette", DEFAULT_PALETTE);
  const [mode, setMode] = useStored<Mode>("mode", "auto");

  useEffect(() => {
    const d = document.documentElement;
    d.dataset.palette = palette;
    if (mode === "auto") delete d.dataset.mode;
    else d.dataset.mode = mode;
  }, [palette, mode]);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-32 md:px-8">
        <h1 className="serif pb-6 pt-6 text-[40px] italic leading-none tracking-[-0.02em] md:text-[56px]">settings</h1>

        <div className="space-y-4">
          <Block title="Colours" note="changes everything, instantly">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {PALETTES.map((p) => {
                const on = palette === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPalette(p.id)}
                    aria-pressed={on}
                    className={`relative overflow-hidden rounded-[18px] border p-3 text-left transition-all duration-300 active:scale-[0.97] ${
                      on ? "border-accent shadow-[0_8px_24px_-10px_var(--accent)]" : "border-line hover:border-accent/40"
                    }`}
                    style={{ background: p.light.bg }}
                  >
                    <div className="flex -space-x-2">
                      {[p.light.card, p.light.accent, p.light.ink, p.light.tag].map((c, i) => (
                        <span key={i} className="h-7 w-7 rounded-full ring-2" style={{ background: c, ["--tw-ring-color" as string]: p.light.bg }} />
                      ))}
                    </div>
                    <p className="serif mt-3 text-[16px] italic" style={{ color: p.light.ink }}>{p.name}</p>
                    <p className="text-[12px]" style={{ color: p.light.muted }}>{p.note}</p>
                    {on && (
                      <motion.span
                        layoutId="pal-on"
                        className="absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full"
                        style={{ background: p.light.accent, color: p.light.onAccent }}
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                          <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </motion.span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 grid grid-cols-3 rounded-full bg-card p-1" role="radiogroup" aria-label="Light or dark">
              {(["auto", "light", "dark"] as Mode[]).map((m) => (
                <button
                  key={m}
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => setMode(m)}
                  className={`relative z-10 h-10 rounded-full text-[13.5px] transition-colors ${mode === m ? "text-ink" : "text-muted"}`}
                >
                  {mode === m && <motion.span layoutId="mode" className="absolute inset-0 -z-10 rounded-full bg-bg shadow-sm" />}
                  {m === "auto" ? "Auto" : m === "light" ? "Light" : "Dark"}
                </button>
              ))}
            </div>
          </Block>

          <Shops />

        </div>

        <p className="mt-12 text-center font-hand text-[18px] text-muted">made for ari, with love ♡</p>
      </main>
    </>
  );
}

function Shops() {
  const [rows, setRows] = useState<ShopRow[] | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    fetch("/api/shops").then((r) => r.json()).then(setRows).catch(() => setRows([]));
  }, []);
  const live = rows?.filter((r) => r.state === "live") ?? [];
  const sections = useMemo(() => [...new Set((rows ?? []).map((r) => r.section))], [rows]);

  return (
    <Block title="Shops" note={rows ? `${live.length} of ${rows.length} searching` : "checking…"}>
      <div className="flex flex-wrap gap-1.5">
        {live.map((r) => (
          <span key={r.id} className="rounded-full bg-bg px-3 py-1.5 text-[13px] text-ink">
            {r.name}
          </span>
        ))}
        {!rows && Array.from({ length: 8 }, (_, i) => <span key={i} className="breathe h-8 w-24 rounded-full bg-card" />)}
      </div>

      <button onClick={() => setOpen((o) => !o)} className="mt-5 text-[13.5px] text-muted underline decoration-dotted underline-offset-4 hover:text-ink">
        {open ? "hide the full list" : "see all 100 and why some aren't on yet"}
      </button>

      {open && rows && (
        <div className="mt-4 space-y-5">
          {sections.map((sec) => (
            <div key={sec}>
              <p className="mb-2 text-[11.5px] uppercase tracking-[0.12em] text-muted">{sec}</p>
              <ul className="divide-y divide-line">
                {rows.filter((r) => r.section === sec).map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-2 text-[14px]">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        r.state === "live" ? "bg-tag" : r.state === "later" || r.state === "needs-key" ? "bg-accent/40" : "bg-line"
                      }`}
                    />
                    <span className={r.state === "live" ? "text-ink" : "text-muted"}>
                      {r.name}
                      {r.replaces && <span className="block text-[11.5px] text-muted">instead of {r.replaces}</span>}
                    </span>
                    <span className="ml-auto text-right text-[12px] text-muted" title={r.note}>
                      {STATE_LABEL[r.state]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="text-[12.5px] leading-relaxed text-muted">
            &ldquo;Unavailable&rdquo; means the shop turned away a polite, honest request, or its site couldn&rsquo;t be reached. We leave those alone rather than sneak round them. &ldquo;Coming later&rdquo; ones answer fine and just need their own adapter.
          </p>
        </div>
      )}
    </Block>
  );
}
