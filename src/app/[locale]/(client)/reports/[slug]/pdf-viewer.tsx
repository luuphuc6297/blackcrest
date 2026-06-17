"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/icon";
import { requestDownloadUrl } from "@/server/download-actions";
import { reviewReport } from "@/server/report-actions";
import { REPORT_STATUS } from "@/lib/status";
import {
  Badge,
  Button,
  Dialog,
  IconButton,
  Input,
  Tabs,
  Toast,
  Tooltip,
  type BadgeTone,
} from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { PDFDocumentProxy } from "pdfjs-dist";

/* ─────────────────────────────────────────────────────────────────────────
 * Types — plain serializable props from the RSC page.
 * ──────────────────────────────────────────────────────────────────────── */
type ReportStatus =
  | "DRAFT"
  | "REVIEW"
  | "APPROVED"
  | "PUBLISHED"
  | "REJECTED"
  | "ARCHIVED";

type AccessLevel = "PUBLIC" | "RESTRICTED";

export interface ViewerReport {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: ReportStatus;
  accessLevel: AccessLevel;
  categoryLabel: string;
  coverLabel: string | null;
  author: string | null;
  publishedAt: string | null;
  pageCount: number | null;
  hasFile: boolean;
}

export interface PdfViewerProps {
  report: ViewerReport;
  locale: string;
  canApprove: boolean;
  /** Inline view/print endpoint (download uses the one-time token flow). */
  viewUrl: string;
  reviewerName: string;
}

/* Status → Status.* i18n key (resolved via the Status namespace t()). */
const STATUS_LABEL: Record<ReportStatus, string> = {
  DRAFT: "draft",
  REVIEW: "review",
  APPROVED: "approved",
  PUBLISHED: "published",
  REJECTED: "rejected",
  ARCHIVED: "archived",
};
/* Tone comes from the shared @/lib/status REPORT_STATUS map (single source). */

/* ─────────────────────────────────────────────────────────────────────────
 * Real PDF rendering via pdf.js. The worker is SELF-HOSTED (/public, copied by
 * the pdf:worker script) — no external CDN (data-localization). Bytes come from
 * the authed /view endpoint and are already per-user watermarked server-side.
 * Renders to <canvas> at devicePixelRatio × zoom (crisp; replaces the old,
 * non-standard CSS `zoom`).
 * ──────────────────────────────────────────────────────────────────────── */
function PdfPageCanvas({
  doc,
  pageNumber,
  scale,
  className,
}: {
  doc: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  className?: string;
}) {
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [visible, setVisible] = React.useState(false);
  const [dims, setDims] = React.useState<{ w: number; h: number } | null>(null);

  // Lazy: only render pages near the viewport. A 24-page document rendered all
  // at once would saturate the main thread (PERF).
  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisible(true);
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  React.useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<unknown> } | null = null;
    (async () => {
      const page = await doc.getPage(pageNumber);
      if (cancelled) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const viewport = page.getViewport({ scale: scale * dpr });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const cssW = Math.floor(viewport.width / dpr);
      const cssH = Math.floor(viewport.height / dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      setDims({ w: cssW, h: cssH });
      task = page.render({ canvasContext: ctx, viewport });
      try {
        await task.promise;
      } catch {
        /* render cancelled by a zoom change / unmount — safe to ignore */
      }
    })();
    return () => {
      cancelled = true;
      try {
        task?.cancel();
      } catch {
        /* noop */
      }
    };
  }, [doc, pageNumber, scale, visible]);

  // Placeholder keeps scroll layout stable before a page renders (≈ Letter).
  const phW = dims?.w ?? Math.round(612 * scale);
  const phH = dims?.h ?? Math.round(792 * scale);

  return (
    <div
      ref={wrapRef}
      className="flex items-center justify-center"
      style={{ width: phW, minHeight: phH }}
    >
      <canvas
        ref={canvasRef}
        className={className}
        role="img"
        aria-label={`Trang ${pageNumber}`}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Main viewer island.
 * ──────────────────────────────────────────────────────────────────────── */
export function PdfViewer({
  report,
  locale,
  canApprove,
  viewUrl,
  reviewerName,
}: PdfViewerProps) {
  const [zoom, setZoom] = React.useState(0.92);
  const [current, setCurrent] = React.useState(1);
  const [panelOpen, setPanelOpen] = React.useState(true);
  const [dialog, setDialog] = React.useState<
    "approve" | "reject" | "publish" | null
  >(null);
  const [toast, setToast] = React.useState<
    "approved" | "rejected" | "published" | null
  >(null);
  const [downloading, setDownloading] = React.useState(false);
  const [downloadErr, setDownloadErr] = React.useState<string | null>(null);
  const [reviewNote, setReviewNote] = React.useState("");
  const [reviewing, setReviewing] = React.useState(false);
  const router = useRouter();
  const t = useTranslations("Viewer");
  const tStatus = useTranslations("Status");

  // Persist an approve/reject decision via the real Server Action, then refresh
  // so the status badge reflects the new state (no more fake confirmation).
  const handleReview = async (decision: "approve" | "reject" | "publish") => {
    if (reviewing) return;
    setReviewing(true);
    try {
      const res = await reviewReport({
        reportId: report.id,
        decision,
        note: reviewNote || undefined,
      });
      setDialog(null);
      setReviewNote("");
      if (res.ok) {
        setToast(
          decision === "approve"
            ? "approved"
            : decision === "publish"
              ? "published"
              : "rejected",
        );
        router.refresh();
      } else {
        setDownloadErr(res.error);
      }
    } catch {
      setDownloadErr(t("reviewError"));
    } finally {
      setReviewing(false);
    }
  };

  // Mint a one-time, short-lived, watermarked download URL then navigate to it
  // (blueprint §F1) — never link straight to storage.
  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadErr(null);
    try {
      const res = await requestDownloadUrl(report.id);
      if ("url" in res) window.location.href = res.url;
      else setDownloadErr(res.error);
    } catch {
      setDownloadErr(t("downloadLinkError"));
    } finally {
      setDownloading(false);
    }
  };

  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const pageRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  // Real PDF document, loaded lazily on the client. pdf.js is browser-only, so
  // the dynamic import keeps it out of SSR; the worker is self-hosted (/public).
  const [doc, setDoc] = React.useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = React.useState(report.pageCount ?? 0);
  const [pdfLoading, setPdfLoading] = React.useState(true);
  const [pdfError, setPdfError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!report.hasFile) {
      setPdfLoading(false);
      return;
    }
    let cancelled = false;
    let loaded: PDFDocumentProxy | null = null;
    setPdfLoading(true);
    setPdfError(null);
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        loaded = await pdfjs.getDocument({ url: viewUrl, withCredentials: true })
          .promise;
        if (cancelled) {
          void loaded.destroy();
          return;
        }
        setDoc(loaded);
        setNumPages(loaded.numPages);
        setPdfLoading(false);
      } catch {
        if (!cancelled) {
          setPdfError(t("renderError"));
          setPdfLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      void loaded?.destroy();
    };
    // `t` intentionally excluded — only the document source should re-trigger a
    // load; re-running on every translations-fn identity change would cancel an
    // in-flight getDocument.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewUrl, report.hasFile]);

  // `total` aliases numPages so the existing page-nav / IntersectionObserver
  // (keyed on total) keep working unchanged.
  const total = numPages;

  // Track the current page via IntersectionObserver (mirror PdfViewer.jsx).
  React.useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const p = (e.target as HTMLElement).dataset.page;
            if (p) setCurrent(Number(p));
          }
        });
      },
      { root, threshold: 0.5 },
    );
    pageRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [total]);

  const jump = (i: number) => {
    const el = pageRefs.current[i];
    const root = scrollRef.current;
    if (el && root) root.scrollTo({ top: el.offsetTop - 24, behavior: "smooth" });
  };
  const step = (d: number) =>
    jump(Math.min(total - 1, Math.max(0, current - 1 + d)));
  const changeZoom = (d: number) =>
    setZoom((z) => Math.min(2, Math.max(0.5, Math.round((z + d) * 100) / 100)));
  const fit = () => setZoom(0.92);

  return (
    <div
      className="flex flex-col bg-surface font-sans"
      style={{ height: "100vh" }}
    >
      {/* ── Top toolbar ───────────────────────────────────────────────── */}
      <header className="flex h-[56px] flex-none items-center gap-[14px] border-b border-line bg-surface pl-3 pr-[14px]">
        <Link href="/reports" className="inline-flex">
          <IconButton label={t("backToLibrary")}>
            <Icon name="arrow-left" size={18} />
          </IconButton>
        </Link>
        <span className="h-6 w-px flex-none bg-line" />
        <span className="flex h-9 w-[30px] flex-none items-center justify-center rounded-card border border-line bg-surface-2">
          <Icon name="file-text" size={16} className="text-ink-3" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-[9px]">
            <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">
              {report.title}
            </span>
            <Badge tone={REPORT_STATUS[report.status].tone} dot>
              {tStatus(STATUS_LABEL[report.status])}
            </Badge>
          </div>
          <div className="text-[12px] text-ink-4">
            {report.categoryLabel} ·{" "}
            <span className="font-mono">{report.slug}</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-[6px]">
          <Tooltip content={t("searchInDocument")}>
            <IconButton label={t("search")}>
              <Icon name="search" size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip content={t("download")}>
            <IconButton
              label={t("download")}
              onClick={handleDownload}
              disabled={downloading || !report.hasFile}
            >
              <Icon name="download" size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip content={t("print")}>
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <IconButton label={t("print")}>
                <Icon name="printer" size={18} />
              </IconButton>
            </a>
          </Tooltip>
          <Tooltip content={t("share")}>
            <IconButton label={t("share")}>
              <Icon name="share-2" size={18} />
            </IconButton>
          </Tooltip>
          <span className="mx-[2px] h-6 w-px flex-none bg-line" />
          <Tooltip content={panelOpen ? t("hidePanel") : t("showPanel")} side="bottom">
            <IconButton
              label={t("infoPanel")}
              active={panelOpen}
              onClick={() => setPanelOpen((v) => !v)}
            >
              <Icon name="panel-left" size={18} className="scale-x-[-1]" />
            </IconButton>
          </Tooltip>
        </div>
      </header>

      {/* ── Body: rail · canvas · side-panel ──────────────────────────── */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Thumbnail rail */}
        <aside className="w-[168px] flex-none overflow-auto border-r border-line bg-surface-1 py-4">
          {doc &&
            Array.from({ length: numPages }).map((_, i) => {
              const active = current === i + 1;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => jump(i)}
                  className="block w-full cursor-pointer border-none bg-transparent pb-[14px] pt-[6px]"
                >
                  <div
                    className="relative mx-auto flex items-center justify-center overflow-hidden rounded-page bg-white"
                    style={{
                      width: 96,
                      minHeight: 120,
                      outline: active
                        ? "2px solid var(--color-accent)"
                        : "1px solid var(--color-border-secondary)",
                      boxShadow: active
                        ? "var(--shadow-medium)"
                        : "var(--shadow-low)",
                    }}
                  >
                    <PdfPageCanvas
                      doc={doc}
                      pageNumber={i + 1}
                      scale={0.16}
                      className="block"
                    />
                  </div>
                  <div
                    className={
                      "mt-[7px] font-mono text-[12px] " +
                      (active
                        ? "font-semibold text-accent"
                        : "font-medium text-ink-4")
                    }
                    data-numeric
                  >
                    {i + 1}
                  </div>
                </button>
              );
            })}
        </aside>

        {/* Canvas */}
        <div className="relative flex flex-1">
          <div
            ref={scrollRef}
            className="flex-1 overflow-auto bg-surface-2"
            style={{ padding: "32px 0 120px" }}
          >
            <div className="flex flex-col items-center gap-6">
              {pdfError ? (
                <div className="mt-24 flex flex-col items-center gap-3 text-center">
                  <Icon name="alert-circle" size={22} className="text-danger" />
                  <p className="max-w-[280px] text-[14px] text-ink-2">{pdfError}</p>
                </div>
              ) : !report.hasFile ? (
                <div className="mt-24 flex flex-col items-center gap-3 text-center">
                  <Icon name="file-text" size={22} className="text-ink-4" />
                  <p className="text-[14px] text-ink-3">{t("emptyDocument")}</p>
                </div>
              ) : pdfLoading || !doc ? (
                <div className="mt-24 flex items-center gap-[9px] text-ink-3">
                  <Icon name="loader" size={18} className="animate-spin" />
                  <span className="text-[14px]">{t("loadingDocument")}</span>
                </div>
              ) : (
                Array.from({ length: numPages }).map((_, i) => (
                  <div
                    key={i}
                    ref={(el) => {
                      pageRefs.current[i] = el;
                    }}
                    data-page={i + 1}
                    className="overflow-hidden rounded-page bg-white shadow-stack"
                  >
                    <PdfPageCanvas
                      doc={doc}
                      pageNumber={i + 1}
                      scale={zoom}
                      className="block"
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Floating page-nav / zoom toolbar */}
          <div
            className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-card-lg border border-line bg-surface p-[6px] shadow-float"
          >
            <IconButton label={t("previousPage")} size="sm" onClick={() => step(-1)}>
              <Icon name="chevron-up" size={17} />
            </IconButton>
            <div className="flex items-center gap-[5px] px-[6px] font-mono text-[13px] text-ink-3">
              <span className="font-medium text-ink" data-numeric>
                {current}
              </span>
              <span className="text-ink-4" data-numeric>
                / {total}
              </span>
            </div>
            <IconButton label={t("nextPage")} size="sm" onClick={() => step(1)}>
              <Icon name="chevron-down" size={17} />
            </IconButton>
            <span className="mx-1 h-5 w-px bg-line" />
            <IconButton
              label={t("zoomOut")}
              size="sm"
              onClick={() => changeZoom(-0.1)}
            >
              <Icon name="zoom-out" size={16} />
            </IconButton>
            <span
              className="min-w-[44px] text-center font-mono text-[13px] text-ink-3"
              data-numeric
            >
              {Math.round(zoom * 100)}%
            </span>
            <IconButton
              label={t("zoomIn")}
              size="sm"
              onClick={() => changeZoom(0.1)}
            >
              <Icon name="zoom-in" size={16} />
            </IconButton>
            <span className="mx-1 h-5 w-px bg-line" />
            <Tooltip content={t("fitToWidth")}>
              <IconButton label={t("fitToWidth")} size="sm" onClick={fit}>
                <Icon name="maximize" size={15} />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        {/* Right side-panel */}
        {panelOpen && (
          <SidePanel
            report={report}
            locale={locale}
            canApprove={canApprove}
            reviewerName={reviewerName}
            onApprove={() => {
              setReviewNote("");
              setDialog("approve");
            }}
            onReject={() => {
              setReviewNote("");
              setDialog("reject");
            }}
            onPublish={() => {
              setReviewNote("");
              setDialog("publish");
            }}
          />
        )}
      </div>

      {/* ── Approval dialogs (staff only) ─────────────────────────────── */}
      <Dialog
        open={dialog === "approve"}
        onClose={() => setDialog(null)}
        title={t("approveDialogTitle")}
        description={t("approveDialogDescription")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="primary"
              loading={reviewing}
              onClick={() => handleReview("approve")}
            >
              {t("approve")}
            </Button>
          </>
        }
      >
        <Input
          label={t("approveNoteLabel")}
          placeholder={t("approveNotePlaceholder")}
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
        />
      </Dialog>

      <Dialog
        open={dialog === "reject"}
        onClose={() => setDialog(null)}
        title={t("rejectDialogTitle")}
        description={t("rejectDialogDescription")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="danger"
              loading={reviewing}
              onClick={() => handleReview("reject")}
            >
              {t("reject")}
            </Button>
          </>
        }
      >
        <Input
          label={t("rejectNoteLabel")}
          placeholder={t("rejectNotePlaceholder")}
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
        />
      </Dialog>

      <Dialog
        open={dialog === "publish"}
        onClose={() => setDialog(null)}
        title={t("publishDialogTitle")}
        description={t("publishDialogDescription")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="primary"
              loading={reviewing}
              onClick={() => handleReview("publish")}
            >
              {t("publish")}
            </Button>
          </>
        }
      >
        <Input
          label={t("approveNoteLabel")}
          placeholder={t("approveNotePlaceholder")}
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
        />
      </Dialog>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[200]">
          {toast === "approved" || toast === "published" ? (
            <Toast
              tone="success"
              icon={<Icon name="check-circle" size={18} />}
              title={
                toast === "published"
                  ? t("publishedToastTitle")
                  : t("approvedToastTitle")
              }
              message={
                toast === "published"
                  ? t("publishedToastMessage")
                  : t("approvedToastMessage")
              }
              onClose={() => setToast(null)}
              duration={4000}
            />
          ) : (
            <Toast
              tone="danger"
              icon={<Icon name="x-circle" size={18} />}
              title={t("rejectedToastTitle")}
              message={t("rejectedToastMessage")}
              onClose={() => setToast(null)}
              duration={4000}
            />
          )}
        </div>
      )}

      {downloadErr && (
        <div className="fixed bottom-6 right-6 z-[200]">
          <Toast
            tone="danger"
            icon={<Icon name="alert-circle" size={18} />}
            title={t("downloadErrorTitle")}
            message={downloadErr}
            onClose={() => setDownloadErr(null)}
            duration={5000}
          />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Right side-panel — metadata + access for everyone; approval timeline +
 * actions ONLY when canApprove.
 * ──────────────────────────────────────────────────────────────────────── */
function MetaRow({ k, v, mono = false }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line py-2">
      <span className="text-[13px] text-ink-3">{k}</span>
      <span
        className={
          "text-right text-[13px] font-medium text-ink " +
          (mono ? "font-mono" : "")
        }
        data-numeric={mono ? "" : undefined}
      >
        {v}
      </span>
    </div>
  );
}

function SidePanel({
  report,
  locale,
  canApprove,
  reviewerName,
  onApprove,
  onReject,
  onPublish,
}: {
  report: ViewerReport;
  locale: string;
  canApprove: boolean;
  reviewerName: string;
  onApprove: () => void;
  onReject: () => void;
  onPublish: () => void;
}) {
  const [tab, setTab] = React.useState("info");
  const t = useTranslations("Viewer");
  const tStatus = useTranslations("Status");

  const timeline: [string, string, string, BadgeTone][] = [
    [t("stepCreateDraft"), report.author ?? t("editor"), "—", "approved"],
    [t("stepSubmitApproval"), report.author ?? t("editor"), "—", "approved"],
    [
      t("stepApprove"),
      reviewerName,
      report.publishedAt ? formatDate(report.publishedAt, locale) : "—",
      "approved",
    ],
    [
      t("stepPublish"),
      t("system"),
      report.publishedAt ? formatDate(report.publishedAt, locale) : "—",
      "published",
    ],
  ];

  return (
    <aside className="flex w-[320px] flex-none flex-col overflow-hidden border-l border-line bg-surface">
      <div className="px-4">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "info", label: t("tabInfo") },
            { value: "access", label: t("tabAccess") },
          ]}
        />
      </div>

      <div className="flex-1 overflow-auto p-4">
        {tab === "info" ? (
          <>
            <div style={{ marginBottom: 22 }}>
              <MetaRow k={t("fieldCategory")} v={report.categoryLabel} />
              <MetaRow k={t("fieldAuthor")} v={report.author ?? "—"} />
              <MetaRow
                k={t("fieldStatus")}
                v={
                  <Badge tone={REPORT_STATUS[report.status].tone} size="sm">
                    {tStatus(STATUS_LABEL[report.status])}
                  </Badge>
                }
              />
              <MetaRow
                k={t("fieldPublishedAt")}
                v={formatDate(report.publishedAt, locale)}
                mono
              />
              <MetaRow k={t("fieldPageCount")} v={report.pageCount ?? "—"} mono />
              <MetaRow k={t("fieldDocumentId")} v={report.slug} mono />
            </div>

            {canApprove ? (
              <>
                <div className="bc-overline mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                  {t("approvalProcess")}
                </div>
                <div className="relative pl-1">
                  {timeline.map((t, i) => (
                    <div
                      key={i}
                      className="relative flex gap-3"
                      style={{
                        paddingBottom: i < timeline.length - 1 ? 18 : 0,
                      }}
                    >
                      {i < timeline.length - 1 && (
                        <span
                          className="absolute bottom-0 w-[2px] bg-line-2"
                          style={{ left: 7, top: 18 }}
                        />
                      )}
                      <span
                        className="z-[1] flex h-4 w-4 flex-none items-center justify-center rounded-pill"
                        style={{ background: `var(--status-${t[3]})` }}
                      >
                        <Icon name="check" size={10} className="text-white" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-ink">
                          {t[0]}
                        </div>
                        <div className="text-[12px] text-ink-4">
                          {t[1]} ·{" "}
                          <span className="font-mono" data-numeric>
                            {t[2]}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-card border border-line bg-surface-1 p-3">
                <div className="mb-[6px] flex items-center gap-2 text-ink-2">
                  <Icon name="lock" size={14} />
                  <span className="text-[13px] font-medium">
                    {t("confidentialDocument")}
                  </span>
                </div>
                <p className="text-[12px] leading-[1.5] text-ink-3">
                  {t("confidentialDocumentNote")}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <MetaRow
              k={t("accessLevel")}
              v={
                <Badge
                  tone={report.accessLevel === "PUBLIC" ? "neutral" : "accent"}
                  size="sm"
                >
                  {report.accessLevel === "PUBLIC"
                    ? t("accessInternalPublic")
                    : t("accessRestricted")}
                </Badge>
              }
            />
            <MetaRow
              k={t("attachment")}
              v={report.hasFile ? t("attachmentUploaded") : t("attachmentNone")}
            />
            <div className="rounded-card border border-line bg-surface-1 p-3">
              <div className="mb-[6px] flex items-center gap-2 text-ink-2">
                <Icon name="shield-check" size={14} />
                <span className="text-[13px] font-medium">{t("accessPolicy")}</span>
              </div>
              <p className="text-[12px] leading-[1.5] text-ink-3">
                {report.accessLevel === "PUBLIC"
                  ? t("accessPolicyPublic")
                  : t("accessPolicyRestricted")}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Approval actions — staff only, and only when a transition is valid for
          the current status (REVIEW → approve/reject, APPROVED → publish/reject). */}
      {canApprove &&
        (report.status === "REVIEW" || report.status === "APPROVED") && (
          <div className="flex-none border-t border-line bg-surface-1 p-[14px]">
            <div className="mb-[10px] text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
              {t("approvalActions")}
            </div>
            <div className="flex gap-2">
              {report.status === "REVIEW" ? (
                <Button
                  variant="primary"
                  fullWidth
                  leadingIcon={<Icon name="check" size={16} />}
                  onClick={onApprove}
                >
                  {t("approve")}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  fullWidth
                  leadingIcon={<Icon name="send" size={16} />}
                  onClick={onPublish}
                >
                  {t("publish")}
                </Button>
              )}
              <Button
                variant="secondary"
                leadingIcon={<Icon name="x" size={16} />}
                onClick={onReject}
              >
                {t("reject")}
              </Button>
            </div>
          </div>
        )}
    </aside>
  );
}
