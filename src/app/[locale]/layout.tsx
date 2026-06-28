import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SITE_URL, OG_LOCALE } from "@/lib/site-url";
import { fontVariables } from "../fonts";
import { Providers } from "../providers";
import "../globals.css";

/** Browser-chrome colour: grey desk in light, near-black brand in dark. */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0b0d" },
  ],
};

/** Document language. The zh bundle is Simplified, so emit `zh-Hans` (matching
 *  the zh_CN used in og:locale / JSON-LD) instead of the coarse `zh`. */
const HTML_LANG: Record<string, string> = { vi: "vi", en: "en", zh: "zh-Hans" };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const ogLocale = OG_LOCALE[locale] ?? OG_LOCALE.vi;

  return {
    metadataBase: new URL(SITE_URL),
    applicationName: "Blackcrest",
    title: {
      default: t("defaultTitle"),
      template: "%s · Blackcrest",
    },
    description: t("defaultDescription"),
    // Gated portal — keep search engines out by default; the marketing landing
    // page opts back in via its own generateMetadata.
    robots: { index: false, follow: false },
    alternates: {
      canonical: `/${locale}`,
      languages: { vi: "/vi", en: "/en", zh: "/zh", "x-default": "/vi" },
    },
    // Brand defaults inherited by every route. og:title/og:description fall back
    // to each page's title/description; the image comes from the opengraph-image
    // file convention (src/app/opengraph-image.tsx).
    openGraph: {
      type: "website",
      siteName: "Blackcrest",
      url: `/${locale}`,
      locale: ogLocale,
      alternateLocale: Object.values(OG_LOCALE).filter((l) => l !== ogLocale),
    },
    twitter: { card: "summary_large_image" },
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? {
          verification: {
            google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
          },
        }
      : {}),
  };
}

/** Pre-render all locales at build time (blueprint §F4). */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // MUST run before any next-intl call to enable static rendering (blueprint §F4).
  setRequestLocale(locale);

  return (
    <html
      lang={HTML_LANG[locale] ?? locale}
      className={fontVariables}
      suppressHydrationWarning
    >
      {/* suppressHydrationWarning: browser extensions (Grammarly etc.) inject
          attributes onto <body> before React hydrates — harmless, but it would
          otherwise log a hydration-attribute mismatch. */}
      <body
        className="min-h-screen bg-surface text-ink antialiased"
        suppressHydrationWarning
      >
        {/* Flash-free Appearance prefs: set <html data-theme/depth/density/
            reading/radius/text/font> from the bc-appearance cookie BEFORE paint.
            Each default needs no attribute, so SSR output matches → no FOUC. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var m=document.cookie.match(/(?:^|; )bc-appearance=([^;]*)/);if(!m)return;var p=JSON.parse(decodeURIComponent(m[1]));var d=document.documentElement;if(p.skin&&p.skin!=='blackcrest')d.setAttribute('data-skin',p.skin);var th=p.theme||'light';var eff=th==='system'?((window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'):th;if(eff==='dark')d.setAttribute('data-theme','dark');if(p.depth&&p.depth!=='soft')d.setAttribute('data-depth',p.depth);if(p.density&&p.density!=='comfortable')d.setAttribute('data-density',p.density);if(p.reading&&p.reading!=='light')d.setAttribute('data-reading',p.reading);if(p.radius&&p.radius!=='sharp')d.setAttribute('data-radius',p.radius);if(p.text&&p.text!=='default')d.setAttribute('data-text',p.text);if(p.font&&p.font!=='sans')d.setAttribute('data-font',p.font);}catch(e){}})();",
          }}
        />
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
