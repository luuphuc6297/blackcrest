import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSession } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { portalNav } from "@/lib/nav";
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

  const session = await getSession();
  const user = session!.user;
  const userName = user.name ?? user.email ?? "Nhà đầu tư";

  const [tNav, tRoles, data] = await Promise.all([
    getTranslations("Nav"),
    getTranslations("Roles"),
    getIndicatorDashboard(range),
  ]);

  return (
    <AppShell
      nav={portalNav(tNav)}
      activeKey="research"
      user={{ name: userName, role: tRoles(user.role) }}
      title={tNav("research")}
      actions={<LanguageSwitcher />}
    >
      <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-7">
        <IndicatorDashboard data={data} locale={locale} />
      </div>
    </AppShell>
  );
}
