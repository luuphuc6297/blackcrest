import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Badge, type BadgeTone, Card, EmptyState, StatCard } from "@/components/ui";
import { Icon } from "@/components/icon";
import { Link } from "@/i18n/navigation";
import { listVisibleReports } from "@/lib/authz";
import { categoryName } from "@/server/reports";
import { portalNav } from "@/lib/nav";
import { isStaff } from "@/lib/rbac";
import { REPORT_STATUS } from "@/lib/status";
import type { NavEntry } from "@/components/app-shell";
import {
  formatDate,
  formatNumber,
  formatPercent,
  formatVNDCompact,
} from "@/lib/format";

// Gated, per-user data — never prerender/cache.
export const dynamic = "force-dynamic";

export default async function PortalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const user = session!.user;

  const t = await getTranslations("Portal");
  const tNav = await getTranslations("Nav");
  const tStatus = await getTranslations("Status");
  const tRoles = await getTranslations("Roles");

  const userName = user.name ?? user.email ?? tRoles("CLIENT");

  /**
   * Representative private-wealth KPIs. The schema has no portfolio, so these
   * are deliberately ILLUSTRATIVE figures — kept in font-mono via formatters.
   */
  const KPIS: {
    label: string;
    value: string;
    sub: string;
    tone: BadgeTone;
  }[] = [
    {
      label: t("kpiNavLabel"),
      value: formatVNDCompact(1_280_000_000, locale),
      sub: formatPercent(2.4, locale) + " " + t("kpiNavSub"),
      tone: "success",
    },
    {
      label: t("kpiNavPerUnitLabel"),
      value: formatNumber(12847, locale, 0),
      sub: formatPercent(8.42, locale) + " " + t("kpiNavPerUnitSub"),
      tone: "success",
    },
    {
      label: t("kpiNetFlowLabel"),
      value: formatVNDCompact(186_000_000, locale),
      sub: formatPercent(-1.1, locale) + " " + t("kpiNetFlowSub"),
      tone: "warning",
    },
    {
      label: t("kpiUncalledLabel"),
      value: formatVNDCompact(320_000_000, locale),
      sub: t("kpiUncalledSub", { count: 3 }),
      tone: "neutral",
    },
  ];

  const { items } = await listVisibleReports({
    userId: user.id,
    role: user.role,
    locale,
    take: 6,
  });

  const newCount = items.length;

  // Staff get a link into the admin area (clients never see it).
  const footerNav: NavEntry[] | undefined = isStaff(user.role)
    ? [{ key: "admin", label: tNav("admin"), icon: "shield-check", href: "/admin/reports" }]
    : undefined;

  return (
    <AppShell
      nav={portalNav(tNav)}
      activeKey="overview"
      user={{ name: userName, role: tRoles(user.role) }}
      title={tNav("overview")}
      actions={<LanguageSwitcher />}
      footerNav={footerNav}
    >
      <div className="mx-auto max-w-[1180px] px-7 py-7">
        {/* Greeting */}
        <div className="mb-[22px]">
          <h2 className="font-serif text-[27px] font-semibold tracking-[-0.015em] text-ink">
            {t("greeting", { name: userName })}
          </h2>
          <p className="mt-[6px] text-[15px] text-ink-3">
            {t.rich("recentSummary", {
              count: newCount,
              b: (chunks) => (
                <b className="font-semibold text-ink-2">{chunks}</b>
              ),
            })}
          </p>
        </div>

        {/* KPI cards */}
        <div className="mb-[26px] grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-4">
          {KPIS.map((k) => (
            <StatCard
              key={k.label}
              label={k.label}
              value={k.value}
              sub={k.sub}
              subTone={k.tone}
            />
          ))}
        </div>

        {/* Recent documents */}
        <Card padding={0}>
          <div className="flex items-center justify-between px-[18px] pb-3 pt-4">
            <div className="text-[18px] font-semibold tracking-[-0.012em] text-ink">
              {t("recentDocuments")}
            </div>
            <Link
              href="/reports"
              className="inline-flex items-center gap-[6px] text-[13px] font-medium text-ink-3 transition-colors hover:text-accent"
            >
              {t("viewAll")}
              <Icon name="arrow-right" size={15} />
            </Link>
          </div>

          {/* Column header */}
          <div className="grid grid-cols-[2fr_1.1fr_1fr_0.9fr_36px] gap-3 border-b border-line px-[18px] pb-[8px] pt-[2px] text-[11px] font-medium uppercase tracking-[0.04em] text-ink-4">
            <span>{t("colDocument")}</span>
            <span>{t("colType")}</span>
            <span>{t("colStatus")}</span>
            <span>{t("colPublishedDate")}</span>
            <span />
          </div>

          {newCount === 0 ? (
            <EmptyState
              icon="file-text"
              title={t("emptyRecent")}
            />
          ) : (
            items.map((d) => (
              <Link
                key={d.id}
                href={`/reports/${d.slug}`}
                className="group grid grid-cols-[2fr_1.1fr_1fr_0.9fr_36px] items-center gap-3 border-b border-line px-[16px] py-3 transition-colors last:border-b-0 hover:bg-surface-hover"
              >
                <div className="flex min-w-0 items-center gap-[11px]">
                  <span className="flex h-[38px] w-[32px] flex-none items-center justify-center rounded-card border border-line bg-surface-2">
                    <Icon
                      name="file-text"
                      size={16}
                      className="text-ink-3"
                    />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-medium text-ink">
                      {d.title}
                    </div>
                    {d.author && (
                      <div className="truncate text-[12px] text-ink-3">
                        {d.author}
                      </div>
                    )}
                  </div>
                </div>
                <span className="truncate text-[13px] text-ink-2">
                  {categoryName(d.category, locale)}
                </span>
                <span>
                  <Badge tone={REPORT_STATUS[d.status].tone} dot>
                    {tStatus(REPORT_STATUS[d.status].key)}
                  </Badge>
                </span>
                <span
                  data-numeric
                  className="font-mono text-[13px] text-ink-3"
                >
                  {formatDate(d.publishedAt, locale)}
                </span>
                <span className="flex justify-end text-ink-4 transition-colors group-hover:text-accent">
                  <Icon name="arrow-up-right" size={16} />
                </span>
              </Link>
            ))
          )}
        </Card>
      </div>
    </AppShell>
  );
}
