"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/icon";
import { Badge, ClientTable, EmptyState, type Column } from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/format";
import { REPORT_STATUS, ACCESS_LEVEL_KEY } from "@/lib/status";
import type { listAdminReports } from "@/server/reports";

type ReportRow = Awaited<ReturnType<typeof listAdminReports>>[number];

export function ReportsTable({
  rows,
  locale,
  actions,
}: {
  rows: ReportRow[];
  locale: string;
  actions?: React.ReactNode;
}) {
  const tNav = useTranslations("Nav");
  const tStatus = useTranslations("Status");
  const tAccess = useTranslations("Access");
  const tAdmin = useTranslations("Admin");
  const tCommon = useTranslations("Common");

  const columns: Column<ReportRow>[] = [
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
            <span data-numeric className="font-mono text-[11px] text-ink-4">
              {r.slug}
            </span>
          </span>
        </Link>
      ),
    },
    {
      header: tAdmin("colFund"),
      cell: (r) => <span className="text-[13px] text-ink-2">{r.categoryLabel}</span>,
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
      cellClassName: "font-mono text-[13px] tabular-nums text-ink-2",
      cell: (r) => (r.pageCount != null ? formatNumber(r.pageCount, locale, 0) : "—"),
    },
    {
      header: tCommon("updatedAt"),
      cellClassName: "font-mono text-[13px] tabular-nums text-ink-3",
      cell: (r) => formatDate(r.publishedAt ?? r.updatedAt, locale),
    },
  ];

  const statusOptions = (
    ["DRAFT", "REVIEW", "APPROVED", "PUBLISHED", "REJECTED", "ARCHIVED"] as const
  ).map((s) => ({ value: s, label: tStatus(REPORT_STATUS[s].key) }));

  return (
    <ClientTable<ReportRow>
      rows={rows}
      getRowKey={(r) => r.id}
      columns={columns}
      searchText={(r) => `${r.title} ${r.slug} ${r.author ?? ""} ${r.categoryLabel}`}
      filter={{ get: (r) => r.status, options: statusOptions }}
      minWidth={840}
      pageSize={8}
      title={
        <h2 className="text-[16px] font-semibold tracking-[-0.012em]">
          {tAdmin("reportsCardTitle")}
        </h2>
      }
      actions={actions}
      empty={<EmptyState icon="file-stack" title={tAdmin("emptyReports")} />}
    />
  );
}
