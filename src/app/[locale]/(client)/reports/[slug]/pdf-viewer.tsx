"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/icon";
import { requestDownloadUrl } from "@/server/download-actions";
import { reviewReport } from "@/server/report-actions";
import { REPORT_STATUS } from "@/lib/status";
import { nextForwardDecision, canReject } from "@/lib/report-transitions";
import {
  Badge,
  Button,
  Dialog,
  IconButton,
  Input,
  Tabs,
  Toast,
  Tooltip,
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
  /** Staff — shows the approval workflow timeline (vs the confidential note). */
  canViewWorkflow: boolean;
  /** APPROVER/SUPER_ADMIN — shows the lifecycle action buttons (matches the
   * server gate in reviewReport, so EDITOR never sees a button that 403s). */
  canReview: boolean;
  /** Where the back button returns to — /admin/reports for staff, /reports for
   * clients — so staff keep their admin route instead of landing in the library. */
  backHref: string;
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
  canViewWorkflow,
  canReview,
  backHref,
  viewUrl,
  reviewerName,
}: PdfViewerProps) {
  const [zoom, setZoom] = React.useState(0.92);
  const [current, setCurrent] = React.useState(1);
  // Closed by default (canvas full-width); opened in-flow on desktop after mount.
  // SSR + first client render agree on `false`, so there is no hydration mismatch.
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [dialog, setDialog] = React.useState<
    "submit" | "approve" | "reject" | "publish" | null
  >(null);
  const [toast, setToast] = React.useState<
    "submitted" | "approved" | "rejected" | "published" | null
  >(null);
  const [downloading, setDownloading] = React.useState(false);
  const [downloadErr, setDownloadErr] = React.useState<string | null>(null);
  // Identity-watermark notice shown before the actual download (TRUST).
  const [downloadConfirm, setDownloadConfirm] = React.useState(false);
  // Transient success notice (e.g. "link copied").
  const [notice, setNotice] = React.useState<string | null>(null);
  const [reviewNote, setReviewNote] = React.useState("");
  const [reviewing, setReviewing] = React.useState(false);
  const router = useRouter();
  const t = useTranslations("Viewer");
  const tStatus = useTranslations("Status");

  // Copy a shareable deep-link to this report (entitlement still gates access).
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNotice(t("linkCopied"));
    } catch {
      setDownloadErr(t("linkCopyError"));
    }
  };

  // Open the info panel in-flow on desktop (lg+) once mounted; on phones/tablets
  // it stays an on-demand overlay drawer so it never crushes the canvas.
  React.useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) setPanelOpen(true);
  }, []);

  // Persist an approve/reject decision via the real Server Action, then refresh
  // so the status badge reflects the new state (no more fake confirmation).
  const handleReview = async (
    decision: "submit" | "approve" | "reject" | "publish",
  ) => {
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
        const TOAST = {
          submit: "submitted",
          approve: "approved",
          publish: "published",
          reject: "rejected",
        } as const;
        setToast(TOAST[decision]);
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
  // Page width (CSS px @ scale 1) — drives true fit-to-width / mobile auto-fit.
  const [pageBaseWidth, setPageBaseWidth] = React.useState<number | null>(null);

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
        const firstPage = await loaded.getPage(1);
        if (cancelled) return;
        setPageBaseWidth(firstPage.getViewport({ scale: 1 }).width);
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
    setZoom((z) => Math.min(2, Math.max(0.4, Math.round((z + d) * 100) / 100)));

  // True fit-to-width: scale a page to the current canvas viewport width.
  const fitToWidth = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el || !pageBaseWidth) return;
    const z = (el.clientWidth - 40) / pageBaseWidth;
    setZoom(Math.min(2, Math.max(0.4, Math.round(z * 100) / 100)));
  }, [pageBaseWidth]);

  // On phones, auto-fit pages to the viewport (initial + on rotate/resize) so they
  // never need horizontal scrolling. Desktop keeps the comfortable 0.92 default.
  React.useEffect(() => {
    if (!pageBaseWidth) return;
    const fitIfNarrow = () => {
      if (window.innerWidth < 768) fitToWidth();
    };
    fitIfNarrow();
    window.addEventListener("resize", fitIfNarrow);
    return () => window.removeEventListener("resize", fitIfNarrow);
  }, [pageBaseWidth, fitToWidth]);

  return (
    <div className="flex h-[100dvh] flex-col bg-surface font-sans">
      {/* ── Top toolbar ───────────────────────────────────────────────── */}
      <header className="flex h-[56px] flex-none items-center gap-2 border-b border-line bg-surface pl-3 pr-[14px] md:gap-[14px]">
        <Tooltip content={t("backToLibrary")} side="bottom">
          <Link href={backHref} className="inline-flex">
            <IconButton label={t("backToLibrary")}>
              <Icon name="arrow-left" size={18} />
            </IconButton>
          </Link>
        </Tooltip>
        <span className="hidden h-6 w-px flex-none bg-line sm:block" />
        <span className="hidden h-9 w-[30px] flex-none items-center justify-center rounded-card border border-line bg-surface-2 sm:flex">
          <Icon name="file-text" size={16} className="text-ink-3" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-[9px]">
            <span className="truncate text-regular font-semibold tracking-[-0.01em] text-ink">
              {report.title}
            </span>
            <Badge tone={REPORT_STATUS[report.status].tone} dot>
              {tStatus(STATUS_LABEL[report.status])}
            </Badge>
          </div>
          <div className="hidden text-mini text-ink-4 sm:block">
            {report.categoryLabel} ·{" "}
            <span className="font-mono">{report.slug}</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-[6px]">
          <Tooltip content={t("download")} side="bottom">
            <IconButton
              label={t("download")}
              onClick={() => setDownloadConfirm(true)}
              disabled={downloading || !report.hasFile}
            >
              <Icon name="download" size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip content={t("print")} side="bottom">
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
          <span className="hidden md:inline-flex">
            <Tooltip content={t("share")} side="bottom">
              <IconButton label={t("share")} onClick={handleShare}>
                <Icon name="share-2" size={18} />
              </IconButton>
            </Tooltip>
          </span>
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
        {/* Thumbnail rail — hidden on phones (the floating page-nav covers navigation there) */}
        <aside className="hidden w-[168px] flex-none overflow-auto border-r border-line-2 bg-surface-2 py-4 md:block">
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
                      "mt-[7px] font-mono text-mini " +
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
        <div className="relative flex min-w-0 flex-1">
          <div
            ref={scrollRef}
            className="flex-1 overflow-auto bg-canvas-reading"
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
                    className={
                      "overflow-hidden rounded-page bg-white " +
                      (current === i + 1 ? "shadow-page-active" : "shadow-page")
                    }
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
            className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-card-lg border border-line bg-surface-card p-[6px] shadow-float-lit"
          >
            <Tooltip content={t("previousPage")}>
              <IconButton label={t("previousPage")} size="sm" onClick={() => step(-1)}>
                <Icon name="chevron-up" size={17} />
              </IconButton>
            </Tooltip>
            <div className="flex items-center gap-[5px] px-[6px] font-mono text-small text-ink-3">
              <input
                key={current}
                defaultValue={current}
                inputMode="numeric"
                aria-label={t("goToPage")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                onBlur={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!Number.isNaN(n))
                    jump(Math.min(total - 1, Math.max(0, n - 1)));
                }}
                className="h-[22px] w-[30px] rounded-[2px] border border-line-2 bg-surface-input text-center font-mono text-small font-medium text-ink outline-none transition-colors focus:border-accent focus:bg-surface-card"
                data-numeric
              />
              <span className="text-ink-4" data-numeric>
                / {total}
              </span>
            </div>
            <Tooltip content={t("nextPage")}>
              <IconButton label={t("nextPage")} size="sm" onClick={() => step(1)}>
                <Icon name="chevron-down" size={17} />
              </IconButton>
            </Tooltip>
            <span className="mx-1 h-5 w-px bg-line" />
            <Tooltip content={t("zoomOut")}>
              <IconButton
                label={t("zoomOut")}
                size="sm"
                onClick={() => changeZoom(-0.1)}
              >
                <Icon name="zoom-out" size={16} />
              </IconButton>
            </Tooltip>
            <span
              className="min-w-[44px] text-center font-mono text-small text-ink-3"
              data-numeric
            >
              {Math.round(zoom * 100)}%
            </span>
            <Tooltip content={t("zoomIn")}>
              <IconButton
                label={t("zoomIn")}
                size="sm"
                onClick={() => changeZoom(0.1)}
              >
                <Icon name="zoom-in" size={16} />
              </IconButton>
            </Tooltip>
            <span className="mx-1 h-5 w-px bg-line" />
            <Tooltip content={t("fitToWidth")}>
              <IconButton label={t("fitToWidth")} size="sm" onClick={fitToWidth}>
                <Icon name="maximize" size={15} />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        {/* Right side-panel — in-flow column on lg+, overlay drawer (with scrim) on mobile */}
        {panelOpen && (
          <>
            <button
              type="button"
              aria-label={t("hidePanel")}
              onClick={() => setPanelOpen(false)}
              className="fixed inset-0 z-30 bg-overlay backdrop-blur-[1px] lg:hidden"
            />
            <SidePanel
              report={report}
              locale={locale}
              canViewWorkflow={canViewWorkflow}
              canReview={canReview}
              reviewerName={reviewerName}
              onSubmit={() => {
                setReviewNote("");
                setDialog("submit");
              }}
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
          </>
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

      <Dialog
        open={dialog === "submit"}
        onClose={() => setDialog(null)}
        title={t("submitDialogTitle")}
        description={t("submitDialogDescription")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="primary"
              loading={reviewing}
              onClick={() => handleReview("submit")}
            >
              {t("submit")}
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

      {/* Identity-watermark notice before download (private-banking reassurance). */}
      <Dialog
        open={downloadConfirm}
        onClose={() => setDownloadConfirm(false)}
        title={t("downloadNoticeTitle")}
        description={t("downloadNoticeBody")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDownloadConfirm(false)}>
              {t("cancel")}
            </Button>
            <Button
              variant="primary"
              loading={downloading}
              leadingIcon={<Icon name="download" size={16} />}
              onClick={() => {
                setDownloadConfirm(false);
                void handleDownload();
              }}
            >
              {t("download")}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-[10px] rounded-card border border-line bg-surface-1 p-3">
          <Icon
            name="shield-check"
            size={18}
            className="mt-[1px] flex-none text-ink-2"
          />
          <p className="text-mini leading-normal text-ink-3">
            {t("downloadNoticeWatermark")}
          </p>
        </div>
      </Dialog>

      {notice && (
        <div className="fixed bottom-6 right-6 z-[200]">
          <Toast
            tone="success"
            icon={<Icon name="check-circle" size={18} />}
            message={notice}
            onClose={() => setNotice(null)}
            duration={3000}
          />
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[200]">
          {toast === "rejected" ? (
            <Toast
              tone="danger"
              icon={<Icon name="x-circle" size={18} />}
              title={t("rejectedToastTitle")}
              message={t("rejectedToastMessage")}
              onClose={() => setToast(null)}
              duration={4000}
            />
          ) : (
            <Toast
              tone="success"
              icon={<Icon name="check-circle" size={18} />}
              title={
                toast === "published"
                  ? t("publishedToastTitle")
                  : toast === "submitted"
                    ? t("submittedToastTitle")
                    : t("approvedToastTitle")
              }
              message={
                toast === "published"
                  ? t("publishedToastMessage")
                  : toast === "submitted"
                    ? t("submittedToastMessage")
                    : t("approvedToastMessage")
              }
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
 * Right side-panel — metadata + access for everyone; approval timeline for any
 * staff (canViewWorkflow); lifecycle ACTION buttons only for APPROVER/SUPER_ADMIN
 * (canReview) so EDITOR never sees a button reviewReport would reject.
 * ──────────────────────────────────────────────────────────────────────── */
function MetaRow({ k, v, mono = false }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line py-2">
      <span className="text-small text-ink-3">{k}</span>
      <span
        className={
          "text-right text-small font-medium text-ink " +
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
  canViewWorkflow,
  canReview,
  reviewerName,
  onSubmit,
  onApprove,
  onReject,
  onPublish,
}: {
  report: ViewerReport;
  locale: string;
  canViewWorkflow: boolean;
  canReview: boolean;
  reviewerName: string;
  onSubmit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onPublish: () => void;
}) {
  const [tab, setTab] = React.useState("info");
  const t = useTranslations("Viewer");
  const tStatus = useTranslations("Status");

  // Status-aware lifecycle progress. Each step is "done" / "current" / "todo"
  // relative to the report's ACTUAL status (no longer always-all-done). REJECTED
  // shows the kickback as a danger node in place of approve/publish.
  const publishedDate = report.publishedAt
    ? formatDate(report.publishedAt, locale)
    : "—";
  const ORDER: Record<ReportStatus, number> = {
    DRAFT: 0,
    REVIEW: 1,
    APPROVED: 2,
    PUBLISHED: 3,
    ARCHIVED: 3,
    REJECTED: 1,
  };
  const idx = ORDER[report.status];
  type Step = {
    label: string;
    by: string;
    date: string;
    state: "done" | "current" | "todo" | "rejected";
  };
  const stepState = (i: number): Step["state"] =>
    i < idx ? "done" : i === idx ? "current" : "todo";
  const baseSteps: Step[] = [
    {
      label: t("stepCreateDraft"),
      by: report.author ?? t("editor"),
      date: "—",
      state: stepState(0),
    },
    {
      label: t("stepSubmitApproval"),
      by: report.author ?? t("editor"),
      date: "—",
      state: stepState(1),
    },
    {
      label: t("stepApprove"),
      by: reviewerName,
      date: report.status === "APPROVED" || idx >= 2 ? publishedDate : "—",
      state: stepState(2),
    },
    {
      label: t("stepPublish"),
      by: t("system"),
      date: report.status === "PUBLISHED" ? publishedDate : "—",
      state: stepState(3),
    },
  ];
  // On a REJECTED report the draft was submitted (steps 0–1 done) and then sent
  // back — replace the approve/publish tail with a single rejected node.
  const timeline: Step[] =
    report.status === "REJECTED"
      ? [
          { ...baseSteps[0], state: "done" },
          { ...baseSteps[1], state: "done" },
          {
            label: tStatus("rejected"),
            by: reviewerName,
            date: "—",
            state: "rejected",
          },
        ]
      : baseSteps;

  const forward = nextForwardDecision(report.status as ReportStatus);
  const rejectable = canReject(report.status as ReportStatus);

  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-[320px] max-w-[86vw] flex-none flex-col overflow-hidden border-l border-line-2 bg-surface-card shadow-float lg:static lg:z-auto lg:max-w-none lg:shadow-none">
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

            {canViewWorkflow ? (
              <>
                <div className="bc-overline mb-3 text-micro font-semibold uppercase tracking-[0.1em] text-ink-3">
                  {t("approvalProcess")}
                </div>
                <div className="relative pl-1">
                  {timeline.map((step, i) => {
                    const last = i === timeline.length - 1;
                    // Node fill per state: done = completed (green / brand-black
                    // for the publish step), rejected = danger, current = empty
                    // accent ring, todo = muted empty circle.
                    const dotStyle =
                      step.state === "rejected"
                        ? { background: "var(--status-rejected)" }
                        : step.state === "done"
                          ? {
                              background:
                                i === 3
                                  ? "var(--status-published)"
                                  : "var(--status-approved)",
                            }
                          : step.state === "current"
                            ? {
                                background: "var(--color-surface)",
                                boxShadow: "inset 0 0 0 2px var(--color-accent)",
                              }
                            : {
                                background: "var(--color-surface)",
                                boxShadow:
                                  "inset 0 0 0 1px var(--color-border-secondary)",
                              };
                    return (
                      <div
                        key={i}
                        className="relative flex gap-3"
                        style={{ paddingBottom: last ? 0 : 18 }}
                      >
                        {!last && (
                          <span
                            className="absolute bottom-0 w-[2px] bg-line-2"
                            style={{ left: 7, top: 18 }}
                          />
                        )}
                        <span
                          className="z-[1] flex h-4 w-4 flex-none items-center justify-center rounded-pill"
                          style={dotStyle}
                        >
                          {step.state === "done" && (
                            <Icon name="check" size={10} className="text-white" />
                          )}
                          {step.state === "rejected" && (
                            <Icon name="x" size={10} className="text-white" />
                          )}
                          {step.state === "current" && (
                            <span
                              className="h-[6px] w-[6px] rounded-pill"
                              style={{ background: "var(--color-accent)" }}
                            />
                          )}
                        </span>
                        <div className="min-w-0">
                          <div
                            className={
                              "text-small font-semibold " +
                              (step.state === "todo" ? "text-ink-4" : "text-ink")
                            }
                          >
                            {step.label}
                          </div>
                          <div className="text-mini text-ink-4">
                            {step.by} ·{" "}
                            <span className="font-mono" data-numeric>
                              {step.date}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="rounded-card border border-line bg-surface-1 p-3">
                <div className="mb-[6px] flex items-center gap-2 text-ink-2">
                  <Icon name="lock" size={14} />
                  <span className="text-small font-medium">
                    {t("confidentialDocument")}
                  </span>
                </div>
                <p className="text-mini leading-normal text-ink-3">
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
                <span className="text-small font-medium">{t("accessPolicy")}</span>
              </div>
              <p className="text-mini leading-normal text-ink-3">
                {report.accessLevel === "PUBLIC"
                  ? t("accessPolicyPublic")
                  : t("accessPolicyRestricted")}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Approval actions — staff only, and ONLY the transition(s) valid from the
          current status (DRAFT/REJECTED → submit, REVIEW → approve/reject,
          APPROVED → publish/reject). PUBLISHED / ARCHIVED show no actions. */}
      {canReview && (forward || rejectable) && (
        <div className="flex-none border-t border-line bg-surface-1 p-[14px]">
          <div className="mb-[10px] text-micro font-semibold uppercase tracking-[0.1em] text-ink-3">
            {t("approvalActions")}
          </div>
          <div className="flex gap-2">
            {forward === "submit" && (
              <Button
                variant="primary"
                fullWidth
                leadingIcon={<Icon name="send" size={16} />}
                onClick={onSubmit}
              >
                {report.status === "REJECTED" ? t("resubmit") : t("submit")}
              </Button>
            )}
            {forward === "approve" && (
              <Button
                variant="primary"
                fullWidth
                leadingIcon={<Icon name="check" size={16} />}
                onClick={onApprove}
              >
                {t("approve")}
              </Button>
            )}
            {forward === "publish" && (
              <Button
                variant="primary"
                fullWidth
                leadingIcon={<Icon name="send" size={16} />}
                onClick={onPublish}
              >
                {t("publish")}
              </Button>
            )}
            {rejectable && (
              <Button
                variant="secondary"
                leadingIcon={<Icon name="x" size={16} />}
                onClick={onReject}
              >
                {t("reject")}
              </Button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
