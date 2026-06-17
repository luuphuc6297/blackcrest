import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://blackcrest.vn";

/**
 * Sitemap for the PUBLIC, indexable routes only (landing/login/register) across
 * all locales, each with hreflang alternates. Gated portal/admin/report pages
 * are intentionally excluded (robots: index=false).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/login", "/register"];

  return routing.locales.flatMap((locale) =>
    routes.map((route) => ({
      url: `${APP_URL}/${locale}${route}`,
      lastModified: new Date(),
      changeFrequency: route === "" ? ("weekly" as const) : ("monthly" as const),
      priority: route === "" ? 1 : 0.6,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, `${APP_URL}/${l}${route}`]),
        ),
      },
    })),
  );
}
