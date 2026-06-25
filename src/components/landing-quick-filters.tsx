"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/icon";

/**
 * Always-on quick-filter chips for the library landing — visible BEFORE any
 * search so the filter axes (report type + recommendation) are discoverable
 * without typing. Each chip is a locale-aware <Link> to ?type= / ?rec=; page.tsx
 * sees the filter param and switches to the grid + facet sidebar (no client
 * state — navigation alone drives the view). Report types are data-driven (only
 * those present in the recent pool); recommendations are the actionable ratings.
 */
export function LandingQuickFilters({
  reportTypes,
  recommendations,
  locale,
}: {
  reportTypes: string[];
  recommendations: string[];
  locale: string;
}) {
  const t = useTranslations("Library");
  const tType = useTranslations("ReportType");
  const tRec = useTranslations("Recommendation");
  const safe = (tr: (k: string) => string) => (v: string) => {
    try {
      return tr(v);
    } catch {
      return v;
    }
  };
  const typeLabel = safe(tType);
  const recLabel = safe(tRec);

  if (reportTypes.length === 0 && recommendations.length === 0) return null;

  const chip =
    "inline-flex items-center gap-[6px] rounded-pill border border-line-2 bg-surface-card px-[12px] py-[6px] text-mini font-medium text-ink-2 no-underline shadow-soft transition-colors hover:border-line-3 hover:text-ink";

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2" aria-label={t("quickFilters")}>
      {reportTypes.map((rt) => (
        <Link key={"t" + rt} href={`/reports?type=${encodeURIComponent(rt)}`} className={chip}>
          {typeLabel(rt)}
        </Link>
      ))}
      {recommendations.map((r) => (
        <Link key={"r" + r} href={`/reports?rec=${encodeURIComponent(r)}`} className={chip}>
          <Icon name="trending-up" size={12} className="flex-none text-ink-4" />
          {recLabel(r)}
        </Link>
      ))}
    </div>
  );
}
