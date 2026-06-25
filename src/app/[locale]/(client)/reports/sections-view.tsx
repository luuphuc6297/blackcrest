"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/icon";
import { ReportCarousel } from "@/components/report-carousel";
import { LibraryBookingSearch, type SymbolOption } from "@/components/library-booking-search";
import { LandingQuickFilters } from "@/components/landing-quick-filters";
import type { SearchedReport } from "@/lib/authz";

export type ViewSection = {
  key: string;
  title: string;
  href: string; // "view all" target (locale added by <Link>)
  reports: SearchedReport[];
};

/**
 * Fast default library view: a search box + curated section carousels (Latest +
 * top report types). Each section is ~12 prefetched reports — no facet groupBy,
 * no full scan — so the route paints quickly. Searching or "view all" hands off
 * to the filtered grid (page.tsx switches views on the URL params).
 */
export function SectionsView({
  sections,
  symbols,
  reportTypes,
  recommendations,
  locale,
}: {
  sections: ViewSection[];
  symbols: SymbolOption[];
  reportTypes: string[];
  recommendations: string[];
  locale: string;
}) {
  const t = useTranslations("Library");

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="bc-display text-[26px] text-ink">{t("title")}</h1>
          <p className="mt-[6px] text-small text-ink-3">{t("description")}</p>
        </div>
        <Link
          href="/reports?all=1"
          className="flex-none rounded-control border border-line-2 bg-surface-card px-[12px] py-[7px] text-small font-medium text-ink-2 no-underline shadow-soft transition-colors hover:border-line-3 hover:text-ink"
        >
          {t("browseAll")}
        </Link>
      </div>

      <LibraryBookingSearch symbols={symbols} locale={locale} />
      <LandingQuickFilters reportTypes={reportTypes} recommendations={recommendations} locale={locale} />

      {sections.map((s) => (
        <section key={s.key} className="mt-9">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="text-medium font-semibold tracking-[-0.01em] text-ink">{s.title}</h2>
            <Link
              href={s.href}
              className="inline-flex flex-none items-center gap-[3px] text-mini font-medium text-ink-3 no-underline transition-colors hover:text-accent"
            >
              {t("viewAll")}
              <Icon name="chevron-right" size={14} />
            </Link>
          </div>
          <ReportCarousel reports={s.reports} locale={locale} />
        </section>
      ))}
    </div>
  );
}
