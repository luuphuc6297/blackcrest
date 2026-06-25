import type { ReactNode } from "react";
import type { Recommendation } from "@prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSession } from "@/auth";
import { searchReports, listReportSections, type ReportSort } from "@/lib/authz";
import { listWatchableSymbols } from "@/server/watchlist";
import { LibraryGrid } from "./library-grid";
import { SectionsView, type ViewSection } from "./sections-view";

// Gated, per-user data — never prerender/cache.
export const dynamic = "force-dynamic";
// Safety margin for the cross-region DB hop (Vercel ↔ Supabase Tokyo). The query
// layer is round-trip-frugal (see listReportSections), but give the serverless
// function headroom over the 10s default so a cold start never trips the timeout.
export const maxDuration = 30;

const csv = (v: string | undefined) => (v ? v.split(",").filter(Boolean) : undefined);

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) as string | undefined;

  const session = await getSession();
  const user = session!.user;

  const filters = {
    q: one("q"),
    type: one("type"),
    rec: one("rec"),
    tier: one("tier"),
    symbol: one("symbol"),
  };
  // Default = the fast section/carousel landing. Any filter — or the explicit
  // "?all=1" (Browse all / View all) — switches to the full facet+grid view.
  const showGrid = !!(
    filters.q || filters.type || filters.rec || filters.tier || filters.symbol || one("all")
  );

  const shell = (body: ReactNode) => (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-7">{body}</div>
  );

  if (!showGrid) {
    const [sections, allSymbols, tLib, tType] = await Promise.all([
      listReportSections({ userId: user.id, role: user.role, locale }),
      listWatchableSymbols(),
      getTranslations("Library"),
      getTranslations("ReportType"),
    ]);
    const typeLabel = (rt: string) => {
      try {
        return tType(rt);
      } catch {
        return rt;
      }
    };
    const view: ViewSection[] = sections.map((s) => ({
      key: s.key,
      title: s.reportType ? typeLabel(s.reportType) : tLib("sectionLatest"),
      href: s.reportType ? `/reports?type=${s.reportType}` : "/reports?all=1",
      reports: s.reports,
    }));
    const symbols = allSymbols.map((s) => ({ ticker: s.ticker, nameVi: s.nameVi }));
    // Quick-filter chips: report types present in the recent pool (data-driven,
    // no extra query) + the actionable recommendation ratings.
    const reportTypes: string[] = [];
    for (const s of sections) if (s.reportType) reportTypes.push(s.reportType);
    // Typed against the Prisma enum so a renamed/removed value fails the build
    // instead of silently rendering a dead ?rec= chip.
    const recommendations: Recommendation[] = ["BUY", "ADD", "HOLD"];
    return shell(
      <SectionsView
        sections={view}
        symbols={symbols}
        reportTypes={reportTypes}
        recommendations={recommendations}
        locale={locale}
      />,
    );
  }

  // "Load more" grows ?take (accumulate from the top). Clamp to a sane ceiling.
  const take = Math.min(Math.max(Number(one("take")) || 24, 24), 480);
  const sortParam = one("sort");
  const sort: ReportSort = (["date", "date-asc", "az", "za"] as const).includes(
    sortParam as ReportSort,
  )
    ? (sortParam as ReportSort)
    : "date";

  const { items, facets, total, hasMore, capped } = await searchReports({
    userId: user.id,
    role: user.role,
    locale,
    q: filters.q,
    reportType: csv(filters.type),
    recommendation: csv(filters.rec),
    tier: filters.tier,
    symbol: filters.symbol,
    take,
    sort,
  });

  return shell(
    <LibraryGrid
      items={items}
      facets={facets}
      total={total}
      capped={capped}
      hasMore={hasMore}
      shown={items.length}
      params={filters}
      sort={sort}
      locale={locale}
    />,
  );
}
