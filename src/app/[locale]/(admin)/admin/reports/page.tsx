import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import {
  Badge,
  type BadgeTone,
  DataTable,
  EmptyState,
  FilterTabs,
  Pagination,
  SearchBox,
  StatCard,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { Link } from "@/i18n/navigation";
import { adminNav } from "@/lib/nav";
import { formatDate, formatNumber } from "@/lib/format";
import { REPORT_STATUS, ACCESS_LEVEL_KEY } from "@/lib/status";
import {
  listAdminReports,
  listCategories,
  categoryName,
  getReportStatusCounts,
} from "@/server/reports";
import { UploadReportDialog } from "./upload-dialog";

// Gated, per-user data — never prerender/cache.
export const dynamic = "force-dynamic";

export default async function AdminReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q, status, page } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);

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

  const [result, categories, counts] = await Promise.all([
    listAdminReports(locale, { q, status, page: pageNum }),
    listCategories(),
    getReportStatusCounts(),
  ]);
  const reports = result.items;
  const categoryOptions = categories.map((c) => ({
    id: c.id,
    label: categoryName(c, locale),
  }));

  const stats: { label: string; value: number; tone: BadgeTone }[] = [
    { label: tAdmin("totalReports"), value: counts.total, tone: "neutral" },
    { label: tStatus("review"), value: counts.REVIEW ?? 0, tone: "review" },
    { label: tStatus("published"), value: counts.PUBLISHED ?? 0, tone: "published" },
    { label: tStatus("draft"), value: counts.DRAFT ?? 0, tone: "draft" },
  ];

  const statusOptions = (
    ["DRAFT", "REVIEW", "APPROVED", "PUBLISHED", "REJECTED", "ARCHIVED"] as const
  ).map((s) => ({ value: s, label: tStatus(REPORT_STATUS[s].key) }));

  type ReportRow = (typeof result.items)[number];

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
          <div className="flex flex-col gap-3 px-[18px] py-[14px] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-[16px] font-semibold tracking-[-0.012em]">
                {tAdmin("reportsCardTitle")}
              </h2>
              <span
                data-numeric
                className="font-mono text-[12px] tabular-nums text-ink-3"
              >
                {formatNumber(result.total, locale, 0)}
              </span>
            </div>
            <SearchBox className="sm:w-[240px]" />
          </div>
          <div className="flex flex-wrap items-center gap-[6px] border-t border-line px-[18px] py-3">
            <FilterTabs paramKey="status" options={statusOptions} />
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
          {result.totalPages > 1 && (
            <div className="px-[18px] pb-3">
              <Pagination page={result.page} totalPages={result.totalPages} />
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
