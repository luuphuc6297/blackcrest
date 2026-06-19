import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site-url";

/**
 * /robots.txt — emitted ONCE at the site root (Next never namespaces this under
 * [locale]). Locks the gated, post-login areas out of search (security, not
 * ranking) while allowing the marketing landing. Mirrors the middleware
 * needsAuth gate and the noindex default in [locale]/layout.tsx.
 */
const GATED_SEGMENTS = ["admin", "portal", "reports", "profile"];

export default function robots(): MetadataRoute.Robots {
  const disallow = [
    "/api/",
    ...routing.locales.flatMap((locale) =>
      GATED_SEGMENTS.map((seg) => `/${locale}/${seg}`),
    ),
  ];

  return {
    rules: { userAgent: "*", allow: "/", disallow },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
