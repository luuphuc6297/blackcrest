"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReportStatus, AccessLevel } from "@prisma/client";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/icon";
import {
  Badge,
  Button,
  ClientTable,
  Dialog,
  EmptyState,
  IconButton,
  Input,
  Toast,
  Tooltip,
  type Column,
} from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/format";
import { REPORT_STATUS, ACCESS_LEVEL_KEY } from "@/lib/status";
import { nextForwardDecision } from "@/lib/report-transitions";
import {
  reviewReport,
  setReportAccess,
  setReportSymbols,
  deleteReport,
} from "@/server/report-actions";
import type { listAdminReports } from "@/server/reports";

type ReportRow = Awaited<ReturnType<typeof listAdminReports>>[number];

/** Which row actions the current user may perform (computed from role server-side). */
export type ReportPerms = { advance: boolean; access: boolean; tag: boolean; del: boolean };

export function ReportsTable({
  rows,
  locale,
  perms,
  actions,
}: {
  rows: ReportRow[];
  locale: string;
  perms: ReportPerms;
  actions?: React.ReactNode;
}) {
  const tNav = useTranslations("Nav");
  const tStatus = useTranslations("Status");
  const tAccess = useTranslations("Access");
  const tAdmin = useTranslations("Admin");
  const tCommon = useTranslations("Common");

  const columns: Column<ReportRow>[] = React.useMemo(
    () => [
    {
      header: tNav("documents"),
      // Greedy column that shrink-wraps (w-full + max-w-0) so long titles
      // ellipsize instead of stretching the table (table-auto would otherwise
      // size this column to the longest title).
      cellClassName: "w-full max-w-0",
      cell: (r) => (
        <Link
          href={`/reports/${r.slug}`}
          className="flex min-w-0 items-center gap-[11px] text-inherit no-underline"
        >
          <span className="flex size-[34px] flex-none items-center justify-center rounded-card border border-line bg-surface-2">
            <Icon name="file-text" size={18} className="text-ink-2" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-medium text-ink">
              {r.title}
            </span>
            <span data-numeric className="block truncate font-mono text-micro text-ink-4">
              {r.slug}
            </span>
          </span>
        </Link>
      ),
    },
    {
      header: tAdmin("colFund"),
      cell: (r) => <span className="text-small text-ink-2">{r.categoryLabel}</span>,
    },
    {
      header: tAdmin("colStatus"),
      cell: (r) => (
        <Badge tone={REPORT_STATUS[r.status].tone} dot size="sm">
          {tStatus(REPORT_STATUS[r.status].key)}
        </Badge>
      ),
    },
    {
      header: tAdmin("colAccess"),
      cell: (r) => (
        <span className="text-small text-ink-3">
          {tAccess(ACCESS_LEVEL_KEY[r.accessLevel])}
        </span>
      ),
    },
    {
      header: tAdmin("colTickers"),
      cell: (r) =>
        r.tickers.length ? (
          <span className="flex flex-wrap gap-[3px]">
            {r.tickers.slice(0, 4).map((tk) => (
              <span key={tk} data-numeric className="rounded-control border border-line bg-surface-2 px-[6px] py-[1px] font-mono text-micro font-medium text-ink-2">
                {tk}
              </span>
            ))}
          </span>
        ) : (
          <span className="text-ink-4">—</span>
        ),
    },
    {
      header: tAdmin("colPageCount"),
      align: "right",
      cellClassName: "font-mono text-small tabular-nums text-ink-2",
      cell: (r) => (r.pageCount != null ? formatNumber(r.pageCount, locale, 0) : "—"),
    },
    {
      header: tCommon("updatedAt"),
      cellClassName: "font-mono text-small tabular-nums text-ink-3",
      cell: (r) => formatDate(r.publishedAt ?? r.updatedAt, locale),
    },
    ...(perms.advance || perms.access || perms.tag || perms.del
      ? [
          {
            header: tAdmin("colAction"),
            srHeader: true,
            align: "right" as const,
            cell: (r: ReportRow) => (
              <ReportRowActions
                report={{
                  id: r.id,
                  title: r.title,
                  status: r.status,
                  accessLevel: r.accessLevel,
                  tickers: r.tickers,
                }}
                perms={perms}
              />
            ),
          },
        ]
      : []),
    ],
    [tNav, tAdmin, tStatus, tAccess, tCommon, locale, perms],
  );

  const statusOptions = React.useMemo(
    () =>
      (
        ["DRAFT", "REVIEW", "APPROVED", "PUBLISHED", "REJECTED", "ARCHIVED"] as const
      ).map((s) => ({ value: s, label: tStatus(REPORT_STATUS[s].key) })),
    [tStatus],
  );

  const getRowKey = React.useCallback((r: ReportRow) => r.id, []);
  const searchText = React.useCallback(
    (r: ReportRow) => `${r.title} ${r.slug} ${r.author ?? ""} ${r.categoryLabel}`,
    [],
  );
  const filterGet = React.useCallback((r: ReportRow) => r.status, []);
  const filter = React.useMemo(
    () => ({ get: filterGet, options: statusOptions }),
    [filterGet, statusOptions],
  );

  return (
    <ClientTable<ReportRow>
      rows={rows}
      getRowKey={getRowKey}
      columns={columns}
      searchText={searchText}
      filter={filter}
      minWidth={980}
      pageSize={8}
      title={
        <h2 className="text-medium font-semibold tracking-tight">
          {tAdmin("reportsCardTitle")}
        </h2>
      }
      actions={actions}
      empty={<EmptyState icon="file-stack" title={tAdmin("emptyReports")} />}
    />
  );
}

/**
 * Per-row admin actions for a report: advance its lifecycle (submit → approve →
 * publish, whichever is valid for the CURRENT status), toggle access level
 * (PUBLIC ↔ RESTRICTED), and delete. Each button is gated by `perms` (computed
 * from the viewer's role server-side) AND the server action re-checks the role.
 * Forward / delete go through a confirm dialog; access toggle is instant.
 */
function ReportRowActions({
  report,
  perms,
}: {
  report: {
    id: string;
    title: string;
    status: ReportStatus;
    accessLevel: AccessLevel;
    tickers: string[];
  };
  perms: ReportPerms;
}) {
  const router = useRouter();
  const tAdmin = useTranslations("Admin");
  const tViewer = useTranslations("Viewer");
  const tActions = useTranslations("Actions");

  const [busy, setBusy] = React.useState(false);
  const [confirm, setConfirm] = React.useState<null | "advance" | "delete" | "tags">(null);
  const [tagsInput, setTagsInput] = React.useState(report.tickers.join(", "));
  const [toast, setToast] = React.useState<{
    tone: "success" | "danger";
    msg: string;
  } | null>(null);

  const forward = nextForwardDecision(report.status); // submit | approve | publish | null
  const decisionLabel = (d: "submit" | "approve" | "publish") =>
    d === "submit"
      ? tViewer("submit")
      : d === "approve"
        ? tViewer("approve")
        : tViewer("publish");

  const run = async (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    successMsg: string,
  ) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fn();
      if (res.ok) {
        setToast({ tone: "success", msg: successMsg });
        router.refresh();
      } else {
        setToast({ tone: "danger", msg: res.error ?? tAdmin("actionError") });
      }
    } catch {
      setToast({ tone: "danger", msg: tAdmin("actionError") });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const doAdvance = () =>
    forward &&
    run(
      () => reviewReport({ reportId: report.id, decision: forward }),
      tAdmin("toastUpdated"),
    );
  const doToggleAccess = () =>
    run(
      () =>
        setReportAccess({
          reportId: report.id,
          accessLevel: report.accessLevel === "PUBLIC" ? "RESTRICTED" : "PUBLIC",
        }),
      tAdmin("toastUpdated"),
    );
  const doDelete = () =>
    run(() => deleteReport({ reportId: report.id }), tAdmin("toastDeleted"));
  const doSaveTags = () =>
    run(
      () =>
        setReportSymbols({
          reportId: report.id,
          tickers: tagsInput.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean),
        }),
      tAdmin("toastUpdated"),
    );

  const isPublic = report.accessLevel === "PUBLIC";

  return (
    <div className="flex items-center justify-end gap-[2px]">
      {perms.advance && forward && (
        <Tooltip content={decisionLabel(forward)} side="left">
          <IconButton
            label={decisionLabel(forward)}
            size="sm"
            disabled={busy}
            onClick={() => setConfirm("advance")}
          >
            <Icon name={forward === "approve" ? "check" : "send"} size={16} />
          </IconButton>
        </Tooltip>
      )}
      {perms.access && (
        <Tooltip
          content={isPublic ? tAdmin("actionMakeRestricted") : tAdmin("actionMakePublic")}
          side="left"
        >
          <IconButton
            label={isPublic ? tAdmin("actionMakeRestricted") : tAdmin("actionMakePublic")}
            size="sm"
            disabled={busy}
            onClick={doToggleAccess}
          >
            <Icon name={isPublic ? "eye" : "lock"} size={16} />
          </IconButton>
        </Tooltip>
      )}
      {perms.tag && (
        <Tooltip content={tAdmin("actionTags")} side="left">
          <IconButton
            label={tAdmin("actionTags")}
            size="sm"
            disabled={busy}
            onClick={() => {
              setTagsInput(report.tickers.join(", "));
              setConfirm("tags");
            }}
          >
            <Icon name="building-2" size={16} />
          </IconButton>
        </Tooltip>
      )}
      {perms.del && (
        <Tooltip content={tAdmin("actionDelete")} side="left">
          <IconButton
            label={tAdmin("actionDelete")}
            size="sm"
            disabled={busy}
            className="text-ink-3 hover:bg-danger-tint hover:text-danger"
            onClick={() => setConfirm("delete")}
          >
            <Icon name="trash-2" size={16} />
          </IconButton>
        </Tooltip>
      )}

      <Dialog
        open={confirm === "advance"}
        onClose={() => !busy && setConfirm(null)}
        title={forward ? decisionLabel(forward) : ""}
        description={tAdmin("actionAdvanceBody")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)} disabled={busy}>
              {tActions("cancel")}
            </Button>
            <Button variant="primary" loading={busy} onClick={doAdvance}>
              {forward ? decisionLabel(forward) : ""}
            </Button>
          </>
        }
      />

      <Dialog
        open={confirm === "delete"}
        onClose={() => !busy && setConfirm(null)}
        title={tAdmin("actionDeleteTitle")}
        description={tAdmin("actionDeleteBody", { title: report.title })}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)} disabled={busy}>
              {tActions("cancel")}
            </Button>
            <Button variant="danger" loading={busy} onClick={doDelete}>
              {tAdmin("actionDelete")}
            </Button>
          </>
        }
      />

      <Dialog
        open={confirm === "tags"}
        onClose={() => !busy && setConfirm(null)}
        title={tAdmin("actionTagsTitle")}
        description={tAdmin("actionTagsBody")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)} disabled={busy}>
              {tActions("cancel")}
            </Button>
            <Button variant="primary" loading={busy} onClick={doSaveTags}>
              {tActions("save")}
            </Button>
          </>
        }
      >
        <Input
          label={tAdmin("colTickers")}
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="VCB, FPT, HPG"
          disabled={busy}
          autoFocus
        />
      </Dialog>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[200]">
          <Toast
            tone={toast.tone}
            icon={
              <Icon
                name={toast.tone === "success" ? "check-circle" : "alert-circle"}
                size={18}
              />
            }
            message={toast.msg}
            onClose={() => setToast(null)}
            duration={3500}
          />
        </div>
      )}
    </div>
  );
}
