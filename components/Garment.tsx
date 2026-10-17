import type { Category } from "@/lib/types";

// Fashion-flat sketches used as stand-ins until adapters bring real photos.
// viewBox is 120 × 160 so they sit nicely in a 3:4 card.

const SHAPES: Partial<Record<Category, { body: string; detail?: string }>> = {
  dresses: {
    body: "M47 24c-1 6-2 13-2 20 0 5 1 9 2 13L28 140c20 7 44 7 64 0L73 57c1-4 2-8 2-13 0-7-1-14-2-20-8 5-18 5-26 0z",
    detail: "M47 24l2-14M73 24l-2-14M45 56c10 3 20 3 30 0",
  },
  tops: {
    body: "M41 34c-2 18-4 38-5 58 16 5 32 5 48 0-1-20-3-40-5-58-12 7-26 7-38 0z",
    detail: "M41 34l3-16M79 34l-3-16M46 40c4 4 10 6 14 6s10-2 14-6",
  },
  knitwear: {
    body: "M40 28c13 7 27 7 40 0l22 14 9 66-13 4-7-46-1 54c-20 5-40 5-60 0l-1-54-7 46-13-4 9-66z",
    detail: "M31 112c19 4 39 4 58 0M31 117c19 4 39 4 58 0M48 29c4 6 20 6 24 0M98 106l13-4",
  },
  coats: {
    body: "M40 20c13 5 27 5 40 0l22 16 8 94-14 2-4-62 2 78H26l2-78-4 62-14-2 8-94z",
    detail: "M50 22l10 48 10-48M60 70v78M65 86h.1M65 104h.1M65 122h.1",
  },
  jeans: {
    body: "M34 20h52l6 128H66l-6-88-6 88H28z",
    detail: "M34 30h52M60 30v30M40 30c0 10 6 14 12 14M80 30c0 10-6 14-12 14",
  },
  skirts: {
    body: "M40 34h40l16 96c-24 8-48 8-72 0z",
    detail: "M40 42h40M52 42l-6 92M68 42l6 92M60 42v94",
  },
  "co-ords": {
    body: "M42 18c-2 10-3 22-4 34 15 4 29 4 44 0-1-12-2-24-4-34-11 5-25 5-36 0zM40 66h40l14 76c-23 7-45 7-68 0z",
    detail: "M40 73h40",
  },
  swimwear: {
    body: "M44 26c-2 14-4 30-2 44l-4 34c6 0 14 4 22 12 8-8 16-12 22-12l-4-34c2-14 0-30-2-44-10 6-22 6-32 0z",
    detail: "M44 26l2-12M76 26l-2-12M42 70c12 4 24 4 36 0",
  },
  shoes: {
    body: "M14 108c0-14 10-22 26-22h20c18 0 32 4 42 12 8 6 8 14 2 16-30 6-62 6-90-6z",
    detail: "M16 114c28 8 58 8 88 2M48 86c2 8 10 12 20 12",
  },
  bags: {
    body: "M26 66h68l6 70c-27 6-53 6-80 0z",
    detail: "M42 66c0-26 36-26 36 0M26 80h68M58 80v10h4v-10",
  },
  accessories: {
    body: "M60 22l44 44-44 44-44-44z",
    detail: "M60 110c-4 10-10 18-18 22M60 110c4 10 10 18 18 22M38 66h44M60 44v44",
  },
};
SHAPES.activewear = SHAPES.tops;
SHAPES.lingerie = SHAPES.tops;
SHAPES.trousers = SHAPES.jeans;

export function Garment({ category, colour, patterned, id }: { category: Category; colour: string; patterned?: boolean; id: string }) {
  const s = SHAPES[category] ?? SHAPES.tops!;
  const pid = `pat-${id}`;
  const light = isLight(colour);
  const stroke = light ? "color-mix(in oklab, var(--ink) 55%, transparent)" : "color-mix(in oklab, black 35%, " + colour + ")";
  return (
    <svg viewBox="0 0 120 160" className="h-full w-full" aria-hidden="true">
      {patterned && (
        <defs>
          <pattern id={pid} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
            <rect width="14" height="14" fill={colour} />
            <circle cx="4" cy="4" r="1.8" fill="#fff" opacity=".8" />
            <circle cx="11" cy="10" r="1.3" fill="var(--accent)" opacity=".7" />
          </pattern>
        </defs>
      )}
      <g style={{ filter: "drop-shadow(0 6px 8px color-mix(in oklab, var(--ink) 12%, transparent))" }}>
        <path d={s.body} fill={patterned ? `url(#${pid})` : colour} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round" />
        {s.detail && <path d={s.detail} fill="none" stroke={stroke} strokeWidth="1.1" strokeLinecap="round" opacity=".75" />}
      </g>
    </svg>
  );
}

function isLight(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 200;
}
