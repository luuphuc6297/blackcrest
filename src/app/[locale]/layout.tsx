import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { fontVariables } from "../fonts";
import { Providers } from "../providers";
import "../globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://blackcrest.vn";

const TITLES: Record<string, string> = {
  vi: "Blackcrest — Cổng tài liệu đầu tư",
  en: "Blackcrest — Investment Document Portal",
  zh: "Blackcrest — 投资文件门户",
};
const DESCRIPTIONS: Record<string, string> = {
  vi: "Cổng phân phối tài liệu đầu tư tư nhân, kiểm soát truy cập đến từng trang.",
  en: "Private-wealth investment document portal with page-level access control.",
  zh: "私人财富投资文件门户，逐页严格的访问控制。",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    metadataBase: new URL(APP_URL),
    title: {
      default: TITLES[locale] ?? TITLES.vi,
      template: "%s · Blackcrest",
    },
    description: DESCRIPTIONS[locale] ?? DESCRIPTIONS.vi,
    // Gated portal — keep search engines out by default; the marketing landing
    // page opts back in via its own generateMetadata.
    robots: { index: false, follow: false },
    alternates: {
      canonical: `/${locale}`,
      languages: { vi: "/vi", en: "/en", zh: "/zh", "x-default": "/vi" },
    },
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
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
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
              "(function(){try{var m=document.cookie.match(/(?:^|; )bc-appearance=([^;]*)/);if(!m)return;var p=JSON.parse(decodeURIComponent(m[1]));var d=document.documentElement;var th=p.theme||'light';var eff=th==='system'?((window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'):th;if(eff==='dark')d.setAttribute('data-theme','dark');if(p.depth&&p.depth!=='soft')d.setAttribute('data-depth',p.depth);if(p.density&&p.density!=='comfortable')d.setAttribute('data-density',p.density);if(p.reading&&p.reading!=='light')d.setAttribute('data-reading',p.reading);if(p.radius&&p.radius!=='sharp')d.setAttribute('data-radius',p.radius);if(p.text&&p.text!=='default')d.setAttribute('data-text',p.text);if(p.font&&p.font!=='sans')d.setAttribute('data-font',p.font);}catch(e){}})();",
          }}
        />
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
