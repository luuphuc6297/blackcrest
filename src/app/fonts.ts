import { Inter, Source_Serif_4, IBM_Plex_Mono } from "next/font/google";

/**
 * Self-hosted webfonts (next/font → no external CDN call at runtime, which also
 * keeps us inside the data-localization rule from the blueprint §6.11).
 *
 *  • Inter           — UI / body (matches Linear).
 *  • Source Serif 4  — editorial display (substitutes the commercial Tiempos).
 *  • IBM Plex Mono   — figures / numerals (substitutes the commercial Berkeley).
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

export const plexMono = IBM_Plex_Mono({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

/** Combined font-variable classes for the <html> element. */
export const fontVariables = `${inter.variable} ${sourceSerif.variable} ${plexMono.variable}`;
