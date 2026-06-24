import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSession } from "@/auth";
import { Badge, type BadgeTone, Card, EmptyState, StatCard } from "@/components/ui";
import { Icon } from "@/components/icon";
import { Link } from "@/i18n/navigation";
import { listVisibleReports } from "@/lib/authz";
import { categoryName } from "@/server/reports";
import { REPORT_STATUS } from "@/lib/status";
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

  const session = await getSession();
  const user = session!.user;

  const [t, tStatus, tRoles] = await Promise.all([
    getTranslations("Portal"),
    getTranslations("Status"),
    getTranslations("Roles"),
  ]);

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

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-7">
      {/* Greeting */}
      <div className="mb-[26px]">
        <h2 className="bc-display text-[28px] text-ink">
          {t("greeting", { name: userName })}
        </h2>
        <p className="mt-[10px] max-w-[58ch] text-regular leading-relaxed text-ink-3">
          {t.rich("recentSummary", {
            count: newCount,
            b: (chunks) => <b className="font-semibold text-ink-2">{chunks}</b>,
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
          <div className="text-large font-semibold tracking-tight text-ink">
            {t("recentDocuments")}
          </div>
          <Link
            href="/reports"
            className="inline-flex items-center gap-[6px] text-small font-medium text-ink-3 transition-colors hover:text-accent"
          >
            {t("viewAll")}
            <Icon name="arrow-right" size={15} />
          </Link>
        </div>

        {/* Column header — hidden on phones where rows collapse to a title list */}
        <div className="hidden grid-cols-[2fr_1.1fr_1fr_0.9fr_36px] gap-3 border-b border-line px-[18px] pb-[8px] pt-[2px] text-micro font-medium uppercase tracking-[0.04em] text-ink-4 sm:grid">
          <span>{t("colDocument")}</span>
          <span>{t("colType")}</span>
          <span>{t("colStatus")}</span>
          <span>{t("colPublishedDate")}</span>
          <span />
        </div>

        {newCount === 0 ? (
          <EmptyState icon="file-text" title={t("emptyRecent")} />
        ) : (
          items.map((d) => (
            <Link
              key={d.id}
              href={`/reports/${d.slug}`}
              className="group grid grid-cols-[1fr_auto] items-center gap-3 border-b border-line px-[16px] py-3 transition-colors last:border-b-0 hover:bg-surface-hover sm:grid-cols-[2fr_1.1fr_1fr_0.9fr_36px]"
            >
              <div className="flex min-w-0 items-center gap-[11px]">
                <span className="flex size-[34px] flex-none items-center justify-center rounded-card border border-line bg-surface-2">
                  <Icon name="file-text" size={18} className="text-ink-3" />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-regular font-medium text-ink">
                    {d.title}
                  </div>
                  {d.author && (
                    <div className="truncate text-mini text-ink-3">{d.author}</div>
                  )}
                </div>
              </div>
              <span className="hidden truncate text-small text-ink-2 sm:block">
                {categoryName(d.category, locale)}
              </span>
              <span className="hidden sm:block">
                <Badge tone={REPORT_STATUS[d.status].tone} dot size="sm">
                  {tStatus(REPORT_STATUS[d.status].key)}
                </Badge>
              </span>
              <span
                data-numeric
                className="hidden font-mono text-small text-ink-3 sm:block"
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
  );
}
