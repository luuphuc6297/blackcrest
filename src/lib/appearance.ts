/**
 * Appearance preferences (client-side). Persisted in the `bc-appearance` cookie
 * and applied to <html data-theme/depth/density/reading/radius/text/font>. The
 * matching tokens live in styles/tokens/{colors,elevation,typography}.css +
 * globals.css; the SSR layout reads the same cookie via an inline script so
 * there is no flash. Each default value needs NO attribute, so the baseline is
 * the plain :root.
 */
import { type Skin, SKIN_IDS, DEFAULT_SKIN } from "./skins";

export type { Skin } from "./skins";
export type Theme = "light" | "dark" | "system";
export type Depth = "flat" | "soft" | "elevated";
export type Density = "comfortable" | "compact";
export type Reading = "light" | "dark";
export type Radius = "sharp" | "soft" | "round";
export type TextSize = "small" | "default" | "large";
export type FontChoice =
  | "sans"
  | "be-vietnam"
  | "jakarta"
  | "lexend"
  | "serif"
  | "mono";

export interface Appearance {
  skin: Skin;
  theme: Theme;
  depth: Depth;
  density: Density;
  reading: Reading;
  radius: Radius;
  text: TextSize;
  font: FontChoice;
}

export const DEFAULT_APPEARANCE: Appearance = {
  skin: DEFAULT_SKIN,
  theme: "light",
  depth: "soft",
  density: "comfortable",
  reading: "light",
  radius: "sharp",
  text: "default",
  font: "sans",
};

const COOKIE = "bc-appearance";
const ONE_YEAR = 60 * 60 * 24 * 365;

const OPTIONS = {
  skin: SKIN_IDS,
  theme: ["light", "dark", "system"],
  depth: ["flat", "soft", "elevated"],
  density: ["comfortable", "compact"],
  reading: ["light", "dark"],
  radius: ["sharp", "soft", "round"],
  text: ["small", "default", "large"],
  font: ["sans", "be-vietnam", "jakarta", "lexend", "serif", "mono"],
} as const;

function pick<K extends keyof Appearance>(
  key: K,
  raw: Partial<Appearance>,
): Appearance[K] {
  const v = raw[key];
  return ((OPTIONS[key] as readonly string[]).includes(v as string)
    ? v
    : DEFAULT_APPEARANCE[key]) as Appearance[K];
}

function coerce(raw: unknown): Appearance {
  const p = (raw ?? {}) as Partial<Appearance>;
  return {
    skin: pick("skin", p),
    theme: pick("theme", p),
    depth: pick("depth", p),
    density: pick("density", p),
    reading: pick("reading", p),
    radius: pick("radius", p),
    text: pick("text", p),
    font: pick("font", p),
  };
}

/** Read the saved prefs from the cookie (client only). Falls back to defaults. */
export function readAppearance(): Appearance {
  if (typeof document === "undefined") return DEFAULT_APPEARANCE;
  const m = document.cookie.match(/(?:^|; )bc-appearance=([^;]*)/);
  if (!m) return DEFAULT_APPEARANCE;
  try {
    return coerce(JSON.parse(decodeURIComponent(m[1])));
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

/** Mirror prefs onto <html> — only non-default values get an attribute. */
export function applyAppearance(a: Appearance): void {
  if (typeof document === "undefined") return;
  const d = document.documentElement;
  const set = (attr: string, value: string, isDefault: boolean) =>
    isDefault ? d.removeAttribute(attr) : d.setAttribute(attr, value);

  // Skin = the brand layer; the axes below compose on top. Default emits nothing.
  set("data-skin", a.skin, a.skin === DEFAULT_SKIN);

  // Theme: resolve "system" against the OS preference to a concrete light/dark.
  const sysDark =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const effTheme = a.theme === "system" ? (sysDark ? "dark" : "light") : a.theme;
  set("data-theme", "dark", effTheme !== "dark");

  set("data-depth", a.depth, a.depth === "soft");
  set("data-density", a.density, a.density === "comfortable");
  set("data-reading", a.reading, a.reading === "light");
  set("data-radius", a.radius, a.radius === "sharp");
  set("data-text", a.text, a.text === "default");
  set("data-font", a.font, a.font === "sans");
}

/** Persist + apply (live, no reload). */
export function writeAppearance(a: Appearance): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(a))}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  applyAppearance(a);
}
