import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site-url";

/**
 * Sitemap for the PUBLIC, indexable routes across all locales, each with
 * hreflang alternates. Only the marketing landing is indexable — login/register
 * inherit robots:index=false (so they're excluded to avoid a robots↔sitemap
 * contradiction), and gated portal/admin/report pages are never listed.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [""];

  return routing.locales.flatMap((locale) =>
    routes.map((route) => ({
      url: `${SITE_URL}/${locale}${route}`,
      lastModified: new Date(),
      changeFrequency: route === "" ? ("weekly" as const) : ("monthly" as const),
      priority: route === "" ? 1 : 0.6,
      alternates: {
        languages: {
          ...Object.fromEntries(
            routing.locales.map((l) => [l, `${SITE_URL}/${l}${route}`]),
          ),
          "x-default": `${SITE_URL}/${routing.defaultLocale}${route}`,
        },
      },
    })),
  );
}
