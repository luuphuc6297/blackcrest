import { defineRouting } from "next-intl/routing";

/**
 * Locale routing (blueprint §F4).
 * - Vietnamese is the default and primary locale.
 * - `localePrefix: "always"` → clean hreflang/SEO; URL is the source of truth.
 */
export const routing = defineRouting({
  locales: ["vi", "en", "zh"],
  defaultLocale: "vi",
  localePrefix: "always",
  localeCookie: {
    // Remember the visitor's choice for a year.
    maxAge: 60 * 60 * 24 * 365,
  },
});

export type Locale = (typeof routing.locales)[number];
