import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import {
  Badge,
  type BadgeTone,
  DataTable,
  EmptyState,
  StatCard,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { Link } from "@/i18n/navigation";
import { adminNav } from "@/lib/nav";
import { formatDate, formatNumber } from "@/lib/format";
import { REPORT_STATUS, ACCESS_LEVEL_KEY } from "@/lib/status";
import { listAdminReports, listCategories, categoryName } from "@/server/reports";
import { UploadReportDialog } from "./upload-dialog";

// Gated, per-user data — never prerender/cache.
export const dynamic = "force-dynamic";

export default async function AdminReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const user = session!.user;

  const [tNav, tStatus, tRoles, tAccess, tAdmin, tCommon] = await Promise.all([
    getTranslations("Nav"),
    getTranslations("Status"),
    getTranslations("Roles"),
    getTranslations("Access"),
    getTranslations("Admin"),
    getTranslations("Common"),
  ]);

  const [reports, categories] = await Promise.all([
    listAdminReports(locale),
    listCategories(),
  ]);
  const categoryOptions = categories.map((c) => ({
    id: c.id,
    label: categoryName(c, locale),
  }));

  const counts = reports.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const stats: { label: string; value: number; tone: BadgeTone }[] = [
    { label: tAdmin("totalReports"), value: reports.length, tone: "neutral" },
    { label: tStatus("review"), value: counts.REVIEW ?? 0, tone: "review" },
    { label: tStatus("published"), value: counts.PUBLISHED ?? 0, tone: "published" },
    { label: tStatus("draft"), value: counts.DRAFT ?? 0, tone: "draft" },
  ];

  type ReportRow = (typeof reports)[number];

  return (
    <AppShell
      nav={adminNav((k) => tNav(k))}
      activeKey="reports"
      user={{ name: user.name ?? "—", role: tRoles(user.role) }}
      title={tNav("reports")}
      actions={<UploadReportDialog categories={categoryOptions} />}
    >
      <div className="mx-auto max-w-[1180px] px-7 py-7">
        {/* Stat row */}
        <div className="mb-6 grid grid-cols-2 gap-[14px] lg:grid-cols-4">
          {stats.map((s) => (
            <StatCard
              key={s.label}
              label={s.label}
              value={formatNumber(s.value, locale, 0)}
              dot={s.tone}
            />
          ))}
        </div>

        {/* Table card */}
        <div className="overflow-hidden rounded-card border border-line bg-surface-1">
          <div className="flex items-center gap-3 px-[18px] py-4">
            <h2 className="text-[16px] font-semibold tracking-[-0.012em]">
              {tAdmin("reportsCardTitle")}
            </h2>
            <span
              data-numeric
              className="font-mono text-[12px] tabular-nums text-ink-3"
            >
              {formatNumber(reports.length, locale, 0)}
            </span>
          </div>

          <DataTable<ReportRow>
            minWidth={840}
            getRowKey={(r) => r.id}
            rows={reports}
            empty={<EmptyState icon="file-stack" title={tAdmin("emptyReports")} />}
            columns={[
              {
                header: tNav("documents"),
                cell: (r) => (
                  <Link
                    href={`/reports/${r.slug}`}
                    className="flex min-w-0 items-center gap-[11px] text-inherit no-underline"
                  >
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-card border border-line bg-surface-2">
                      <Icon name="file-text" size={16} className="text-ink-2" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium text-ink">
                        {r.title}
                      </span>
                      <span
                        data-numeric
                        className="font-mono text-[11px] text-ink-4"
                      >
                        {r.slug}
                      </span>
                    </span>
                  </Link>
                ),
              },
              {
                header: tAdmin("colFund"),
                cell: (r) => (
                  <span className="text-[13px] text-ink-2">{r.categoryLabel}</span>
                ),
              },
              {
                header: tAdmin("colStatus"),
                cell: (r) => (
                  <Badge tone={REPORT_STATUS[r.status].tone} dot>
                    {tStatus(REPORT_STATUS[r.status].key)}
                  </Badge>
                ),
              },
              {
                header: tAdmin("colAccess"),
                cell: (r) => (
                  <span className="text-[13px] text-ink-3">
                    {tAccess(ACCESS_LEVEL_KEY[r.accessLevel])}
                  </span>
                ),
              },
              {
                header: tAdmin("colPageCount"),
                align: "right",
                cellClassName:
                  "font-mono text-[13px] tabular-nums text-ink-2",
                cell: (r) =>
                  r.pageCount != null ? formatNumber(r.pageCount, locale, 0) : "—",
              },
              {
                header: tCommon("updatedAt"),
                cellClassName: "font-mono text-[13px] tabular-nums text-ink-3",
                cell: (r) => formatDate(r.publishedAt ?? r.updatedAt, locale),
              },
            ]}
          />
        </div>
      </div>
    </AppShell>
  );
}
