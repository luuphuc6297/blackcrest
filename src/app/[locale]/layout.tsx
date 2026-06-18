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
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
