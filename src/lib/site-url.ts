/**
 * Public, client-exposable base URL of the site — the single source of truth for
 * every SEO surface (metadataBase, canonical/OG URLs, sitemap.xml, robots.txt,
 * JSON-LD). Trailing slash stripped so `${SITE_URL}/x` is always well-formed.
 *
 * Deliberately SEPARATE from getAppUrl() in src/lib/mailer.ts: that one builds
 * links for EMAILS from the server-only APP_URL/AUTH_URL chain. This one is the
 * public origin search engines and social cards see. Keep them distinct.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://blackcrest.vn"
).replace(/\/$/, "");

/**
 * next-intl bare locale → Open Graph (BCP-47-ish) locale. The zh bundle is
 * Simplified Chinese, so it maps to zh_CN (not zh_TW). Used for og:locale +
 * og:locale:alternate and for JSON-LD inLanguage (with `_`→`-`).
 */
export const OG_LOCALE: Record<string, string> = {
  vi: "vi_VN",
  en: "en_US",
  zh: "zh_CN",
};
