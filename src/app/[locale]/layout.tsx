import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { fontVariables } from "../fonts";
import { Providers } from "../providers";
import "../globals.css";

export const metadata: Metadata = {
  title: {
    default: "Blackcrest — Cổng tài liệu đầu tư",
    template: "%s · Blackcrest",
  },
  description:
    "Cổng phân phối tài liệu đầu tư tư nhân, kiểm soát truy cập đến từng trang.",
  robots: { index: false, follow: false },
};

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
      <body className="min-h-screen bg-surface text-ink antialiased">
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
