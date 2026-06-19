import {
  Inter,
  Source_Serif_4,
  IBM_Plex_Mono,
  Be_Vietnam_Pro,
  Plus_Jakarta_Sans,
  Lexend,
} from "next/font/google";

/**
 * Self-hosted webfonts (next/font → no external CDN call at runtime, which also
 * keeps us inside the data-localization rule from the blueprint §6.11).
 *
 *  • Inter           — UI / body default (matches Linear).
 *  • Source Serif 4  — editorial display (substitutes the commercial Tiempos).
 *  • IBM Plex Mono   — figures / numerals (substitutes the commercial Berkeley).
 *  • Be Vietnam Pro / Plus Jakarta Sans / Lexend — extra humanist-geometric sans
 *    options (all with the `vietnamese` subset) the user can pick in Settings.
 *
 * The `vietnamese` subset is required — the whole product is Vietnamese-first.
 */
export const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

export const sourceSerif = Source_Serif_4({
  subsets: ["latin", "vietnamese"],
  variable: "--font-source-serif",
  display: "swap",
});

// Preload ONLY Inter (body) + Source Serif (the LCP hero <h1>). Everything else
// is `preload: false` to keep first paint lean for the VN-mobile audience: Plex
// Mono alone is 3 weights × 2 subsets = 6 files, and it only paints secondary
// numerals (Trust-band stats), not the LCP. `display: swap` + next/font's
// adjustFontFallback (size-adjusted Menlo/SF Mono) make its swap shift-free, so
// the trade is a brief, near-identical numeral swap vs. 6 extra preloads. The 3
// opt-in Appearance sans likewise don't preload until the user selects them.
export const plexMono = IBM_Plex_Mono({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
  preload: false,
});

// ── Optional UI fonts (Appearance → Font) — humanist/geometric sans in the same
// family as Be Vietnam Pro, all with the Vietnamese subset. ───────────────────
export const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam",
  display: "swap",
  preload: false,
});

export const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
  preload: false,
});

export const lexend = Lexend({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-lexend",
  display: "swap",
  preload: false,
});

/** Combined font-variable classes for the <html> element. */
export const fontVariables = [
  inter.variable,
  sourceSerif.variable,
  plexMono.variable,
  beVietnamPro.variable,
  plusJakarta.variable,
  lexend.variable,
].join(" ");
