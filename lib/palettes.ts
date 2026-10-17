export type PaletteId = "blush" | "cherry" | "matcha" | "butter" | "lilac" | "mocha";

type Tokens = {
  bg: string; card: string; accent: string; ink: string; muted: string;
  tag: string; tagInk: string; onAccent: string;
};

export const DEFAULT_PALETTE: PaletteId = "lilac";

export type Palette = { id: PaletteId; name: string; note: string; light: Tokens; dark: Tokens };

export const PALETTES: Palette[] = [
  {
    id: "lilac", name: "Lilac haze", note: "lavender, ari's pick",
    light: { bg: "#FBF8FC", card: "#ECE4F2", accent: "#8E6BAE", ink: "#2F2538", muted: "#766C80", tag: "#C4D3B6", tagInk: "#334028", onAccent: "#FBF8FC" },
    dark: { bg: "#1C1722", card: "#2A2232", accent: "#C3A5E0", ink: "#F1EAF6", muted: "#ADA2B8", tag: "#C4D3B6", tagInk: "#28331e", onAccent: "#1C1722" },
  },
  {
    id: "blush", name: "Blush", note: "rose on cream, from the brief",
    light: { bg: "#FFF9F6", card: "#F6E3E0", accent: "#C97B84", ink: "#3D2A33", muted: "#7A6670", tag: "#A8B5A2", tagInk: "#26331f", onAccent: "#FFF9F6" },
    dark: { bg: "#241A1F", card: "#33262C", accent: "#E09AA2", ink: "#F6E3E0", muted: "#B7A2AA", tag: "#A8B5A2", tagInk: "#1d2618", onAccent: "#2A1D23" },
  },
  {
    id: "cherry", name: "Cherry cola", note: "deep red, a bit grown-up",
    light: { bg: "#FBF5F0", card: "#F3DCD6", accent: "#9E2B3A", ink: "#2E1519", muted: "#7D5D61", tag: "#D9C7A7", tagInk: "#45351b", onAccent: "#FBF5F0" },
    dark: { bg: "#1E1213", card: "#2E1C1E", accent: "#E0606F", ink: "#F6E4DE", muted: "#B79A9C", tag: "#D9C7A7", tagInk: "#3a2c14", onAccent: "#1E1213" },
  },
  {
    id: "matcha", name: "Matcha & milk", note: "soft green, very calm",
    light: { bg: "#F7F6EF", card: "#E6EADB", accent: "#6F8A5E", ink: "#2B3326", muted: "#6F7768", tag: "#E8C4BE", tagInk: "#5a2e2a", onAccent: "#F7F6EF" },
    dark: { bg: "#181C16", card: "#252B21", accent: "#A3BE8F", ink: "#EEF0E4", muted: "#A4AB9B", tag: "#E8C4BE", tagInk: "#4a2522", onAccent: "#181C16" },
  },
  {
    id: "butter", name: "Butter & denim", note: "pale yellow, sunny",
    light: { bg: "#FFFBEF", card: "#F6EBC8", accent: "#4A6A9E", ink: "#1F2A3D", muted: "#69707E", tag: "#EBC2B0", tagInk: "#5a3020", onAccent: "#FFFBEF" },
    dark: { bg: "#151A24", card: "#212836", accent: "#8FB0E3", ink: "#FBF3D9", muted: "#A3AAB8", tag: "#EBC2B0", tagInk: "#4a2616", onAccent: "#151A24" },
  },
  {
    id: "mocha", name: "Mocha latte", note: "warm browns, cosy",
    light: { bg: "#F8F3EE", card: "#EADDD0", accent: "#8A5A44", ink: "#2E211B", muted: "#7A685E", tag: "#A8B5A2", tagInk: "#26331f", onAccent: "#F8F3EE" },
    dark: { bg: "#1D1714", card: "#2C231E", accent: "#D19A7C", ink: "#F3E8DE", muted: "#B3A196", tag: "#A8B5A2", tagInk: "#1d2618", onAccent: "#1D1714" },
  },
];

const vars = (t: Tokens) =>
  `--bg:${t.bg};--card:${t.card};--accent:${t.accent};--ink:${t.ink};--muted:${t.muted};--tag:${t.tag};--tag-ink:${t.tagInk};--on-accent:${t.onAccent};`;

/** Generated once and inlined in <head>, so no flash of the wrong colours. */
export function paletteCss() {
  return PALETTES.map((p) => {
    const sel = p.id === DEFAULT_PALETTE ? `:root,[data-palette="${p.id}"]` : `[data-palette="${p.id}"]`;
    const darkSel = p.id === DEFAULT_PALETTE ? `:root,[data-palette="${p.id}"]` : `[data-palette="${p.id}"]`;
    return (
      `${sel}{${vars(p.light)}color-scheme:light}` +
      `@media (prefers-color-scheme:dark){${darkSel.split(",").map((s) => `${s}:not([data-mode="light"])`).join(",")}{${vars(p.dark)}color-scheme:dark}}` +
      `${darkSel.split(",").map((s) => `${s}[data-mode="dark"]`).join(",")}{${vars(p.dark)}color-scheme:dark}`
    );
  }).join("");
}

/** Runs before paint: applies her saved palette and light/dark choice. */
export const PALETTE_BOOT = `try{var d=document.documentElement,p=JSON.parse(localStorage.getItem("aris:palette")||'"lilac"'),m=JSON.parse(localStorage.getItem("aris:mode")||'"auto"');d.dataset.palette=p;if(m!=="auto")d.dataset.mode=m}catch(e){}`;
