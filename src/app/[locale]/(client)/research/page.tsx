import { setRequestLocale } from "next-intl/server";
import { getIndicatorDashboard } from "@/lib/indicators";
import { type IndicatorRange, INDICATOR_RANGES } from "@/lib/indicators-types";
import { IndicatorDashboard } from "./indicator-dashboard.client";

// Market data is global + cached in the seam (unstable_cache), but the page is a
// gated portal route — render per-request so auth always runs.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default async function ResearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const rangeParam = (Array.isArray(sp.range) ? sp.range[0] : sp.range) as IndicatorRange | undefined;
  const range: IndicatorRange = INDICATOR_RANGES.includes(rangeParam as IndicatorRange)
    ? (rangeParam as IndicatorRange)
    : "3M";

  const data = await getIndicatorDashboard(range);

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-7">
      <IndicatorDashboard data={data} locale={locale} />
    </div>
  );
}
