"use client";

import Link from "next/link";
import { useState } from "react";
import { COLOURS } from "@/lib/catalogue";
import { displayTitle } from "@/lib/display";
import { sizeLabel } from "@/lib/normalise";
import { pin } from "@/lib/product-cache";
import { cheapest, formatGbp } from "@/lib/search";
import type { Product } from "@/lib/types";
import { Garment } from "./Garment";
import { HeartButton } from "./HeartButton";

/** Small stable wobble per item so the grid feels arranged by hand, not stamped. */
function tilt(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return ((h % 7) - 3) * 0.9;
}

export function ProductCard({ p, index = 0, mySizes = [] }: { p: Product; index?: number; mySizes?: string[] }) {
  const best = cheapest(p);
  const was = best.wasPriceGbp && best.wasPriceGbp > best.priceGbp ? best.wasPriceGbp : undefined;
  const sizes = [...new Set(p.offers.flatMap((o) => o.sizesInStock))];
  const t = tilt(p.id);
  const [broken, setBroken] = useState(false);

  return (
    <article
      className="rise group relative"
      style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
    >
      <Link href={`/item/${encodeURIComponent(p.id)}`} onClick={() => pin(p)} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-[18px] bg-card transition-transform duration-500 ease-[var(--ease-soft)] group-hover:-translate-y-1">
          {p.images[0] && !broken ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.images[0]}
              alt=""
              loading={index < 6 ? "eager" : "lazy"}
              decoding="async"
              onError={() => setBroken(true)}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-soft)] group-hover:scale-[1.035]"
            />
          ) : (
            <div
              className="absolute inset-[9%_12%_7%] transition-transform duration-700 ease-[var(--ease-soft)] group-hover:scale-[1.04]"
              style={{ transform: `rotate(${t}deg)` }}
            >
              <Garment id={p.id} category={p.category} colour={p.swatch ?? swatchFor(p)} patterned={p.colourFamily === "multi"} />
            </div>
          )}

          {p.isResale && (
            <span
              className="absolute bottom-3 left-3 rounded-[6px] bg-tag px-2 py-[3px] font-hand text-[15px] leading-none text-tag-ink shadow-sm"
              style={{ transform: `rotate(${-3 + t / 3}deg)` }}
            >
              pre-loved
            </span>
          )}
          {!p.isResale && p.isNew && (
            <span className="absolute bottom-3 left-3 font-hand text-[16px] leading-none text-muted">just in</span>
          )}
          {was && (
            <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium tracking-wide text-on-accent">
              −{Math.round((1 - best.priceGbp / was) * 100)}%
            </span>
          )}
        </div>
      </Link>

      <HeartButton product={p} className="absolute right-2 top-2" />

      <div className="px-1 pt-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{p.brand}</p>
        <h3 className="mt-0.5 line-clamp-2 text-[14.5px] leading-snug text-ink">{displayTitle(p)}</h3>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="serif text-[19px] leading-none text-ink">{formatGbp(best.priceGbp)}</span>
          {was && <s className="text-[13px] text-muted decoration-accent/70">{formatGbp(was)}</s>}
        </div>
        <p className="mt-1 text-[12.5px] text-muted">
          {p.offers.length > 1 ? "from " : "at "}
          <span className="text-ink/80">{best.retailerName}</span>
          {p.offers.length > 1 && <> +{p.offers.length - 1} more</>}
        </p>
        <ul className="mt-2 flex flex-wrap gap-1" aria-label="Sizes in stock">
          {sizes.slice(0, 6).map((s) => (
            <li
              key={s}
              className={`rounded-full border px-2 py-[2px] text-[11px] ${
                mySizes.includes(s) ? "border-accent bg-accent/10 text-ink" : "border-line text-muted"
              }`}
            >
              {sizeLabel(s)}
            </li>
          ))}
          {sizes.length > 6 && <li className="px-1 text-[11px] text-muted">+{sizes.length - 6}</li>}
        </ul>
      </div>
    </article>
  );
}

function swatchFor(p: Product) {
  const c = COLOURS.find((x) => x.id === p.colourFamily)?.swatch ?? "#ddd";
  return c.startsWith("#") ? c : "#e9d5c9";
}

export function CardSkeleton({ i = 0 }: { i?: number }) {
  return (
    <div className="breathe" style={{ animationDelay: `${i * 120}ms` }}>
      <div className="aspect-[3/4] rounded-[18px] bg-card" />
      <div className="mt-3 h-2.5 w-1/3 rounded-full bg-card" />
      <div className="mt-2 h-3 w-4/5 rounded-full bg-card" />
      <div className="mt-2 h-4 w-1/4 rounded-full bg-card" />
    </div>
  );
}
