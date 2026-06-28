/**
 * Theme presets ("skins") — a FULL design-system swap (palette + typography +
 * elevation + corners), beyond the 7 per-attribute Appearance settings. Selected
 * via the `data-skin` attribute on <html>, persisted in the same bc-appearance
 * cookie, applied SSR-flash-free. A skin is pure CSS-variable overrides in
 * src/styles/tokens/skins/<id>.css — no component changes.
 *
 * SCALABLE — to add a new skin, do exactly 3 things:
 *   1. add an entry to SKINS below (id + i18n label key + preview swatch),
 *   2. create src/styles/tokens/skins/<id>.css (copy atelier.css, retune vars),
 *   3. @import that file in src/app/globals.css (after colors.css).
 * The Skin type, cookie validation, the settings selector, the swatch previews,
 * and the no-flash script all derive from this single list.
 */

export const SKINS = [
  {
    id: "blackcrest",
    labelKey: "skinBlackcrest",
    swatch: { canvas: "#f6f6f8", card: "#ffffff", accent: "#16181d" },
  },
  {
    id: "atelier",
    labelKey: "skinAtelier",
    swatch: { canvas: "#eef1f5", card: "#ffffff", accent: "#3b5bdb" },
  },
] as const;

export type Skin = (typeof SKINS)[number]["id"];
export type SkinMeta = (typeof SKINS)[number];

export const SKIN_IDS = SKINS.map((s) => s.id) as readonly Skin[];
export const DEFAULT_SKIN: Skin = "blackcrest";
