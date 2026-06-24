"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Dialog, InlineAlert, Input, Select, Toast } from "@/components/ui";
import { Icon } from "@/components/icon";
import { setReportSymbols } from "@/server/report-actions";
import { ATTACHMENT_ACCEPT } from "@/lib/attachment-validate";
import {
  uploadFileChunked,
  UploadCanceledError,
  MAX_UPLOAD_BYTES,
  type UploadState,
  type UploadMeta,
} from "@/lib/chunked-upload";

/**
 * Admin "upload report" dialog — resumable chunked upload (Upload Flow).
 * Supports MULTIPLE PDFs in one go (each becomes its own DRAFT report; the title
 * is taken from the file name in batch mode), an OPTIONAL category (empty =
 * "Chưa phân loại"), and OPTIONAL Excel/Word attachments when a single PDF is
 * uploaded. Each file is hashed (SHA-256), chunked, integrity-verified
 * server-side, then the Report is created.
 */
export function UploadReportDialog({
  categories,
}: {
  categories: { id: string; label: string }[];
}) {
  const t = useTranslations("Admin");
  const tActions = useTranslations("Actions");
  const tAccess = useTranslations("Access");
  const router = useRouter();

  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [phase, setPhase] = React.useState<UploadState | "idle">("idle");
  const [progress, setProgress] = React.useState(0);
  const [fileIndex, setFileIndex] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<{ file?: string; titleVi?: string }>({});
  const [files, setFiles] = React.useState<File[]>([]);
  const [attachments, setAttachments] = React.useState<File[]>([]);
  const [title, setTitle] = React.useState("");
  const [toast, setToast] = React.useState<{ title: string } | null>(null);

  const formRef = React.useRef<HTMLFormElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const multi = files.length > 1;

  function reset() {
    setBusy(false);
    setPhase("idle");
    setProgress(0);
    setFileIndex(0);
    setError(null);
    setFieldErrors({});
    abortRef.current = null;
  }

  function close() {
    if (busy) return;
    setOpen(false);
    setFiles([]);
    setAttachments([]);
    setTitle("");
    reset();
  }

  function mapError(code: string): string {
    switch (code) {
      case "size":
      case "size_mismatch":
        return t("uploadTooLarge");
      case "not_pdf":
      case "corrupt_pdf":
        return t("uploadNotPdf");
      case "checksum_mismatch":
        return t("uploadCorrupted");
      case "category":
      case "meta":
        return t("uploadInvalidData");
      default:
        return t("uploadFailed");
    }
  }

  /** Upload the optional Excel/Word attachments to a freshly-created report.
   *  Best-effort — a failure is surfaced as a "secondary step failed" toast,
   *  never as an upload failure (the PDF report already exists). */
  async function uploadAttachments(reportId: string, signal: AbortSignal): Promise<boolean> {
    let ok = true;
    for (const att of attachments) {
      try {
        const af = new FormData();
        af.set("file", att);
        af.set("audience", "CLIENT");
        const res = await fetch(`/api/reports/${reportId}/attachments`, {
          method: "POST",
          body: af,
          signal,
        });
        if (!res.ok) ok = false;
      } catch {
        ok = false;
      }
    }
    return ok;
  }

  async function start() {
    const formEl = formRef.current;
    if (!formEl || busy) return;

    const fd = new FormData(formEl);
    const titleVi = String(fd.get("titleVi") ?? "").trim();
    const categoryId = String(fd.get("categoryId") ?? "");
    const accessLevel = String(fd.get("accessLevel") ?? "RESTRICTED");
    const summaryVi = String(fd.get("summaryVi") ?? "").trim() || undefined;
    const authorVi = String(fd.get("authorVi") ?? "").trim() || undefined;
    const tickers = String(fd.get("tickers") ?? "")
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    // Client-side validation (the server re-validates everything).
    const fErrs: { file?: string; titleVi?: string } = {};
    if (files.length === 0) {
      fErrs.file = t("uploadFileRequired");
    } else {
      const tooBig = files.find((f) => f.size > MAX_UPLOAD_BYTES);
      const notPdf = files.find((f) => f.type && f.type !== "application/pdf");
      if (tooBig) fErrs.file = t("uploadTooLarge");
      else if (notPdf) fErrs.file = t("uploadNotPdf");
    }
    // A title is only required in single-file mode; batch mode derives it per file.
    if (!multi && !titleVi) fErrs.titleVi = t("fieldRequired");
    if (Object.keys(fErrs).length > 0) {
      setFieldErrors(fErrs);
      setError(null);
      return;
    }
    setFieldErrors({});

    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError(null);
    setProgress(0);

    const total = files.length;
    let anyDuplicate = false;
    let secondaryFailed = false; // ticker-tag or attachment upload failed (non-fatal)

    try {
      for (let i = 0; i < total; i++) {
        setFileIndex(i);
        const f = files[i];
        const meta: UploadMeta = {
          categoryId,
          accessLevel,
          // Batch: each report's title is its file name (sans extension).
          titleVi: multi ? f.name.replace(/\.[^.]+$/, "").slice(0, 300) : titleVi,
          summaryVi: multi ? undefined : summaryVi,
          authorVi: multi ? undefined : authorVi,
        };
        const result = await uploadFileChunked(f, meta, {
          signal: controller.signal,
          onState: setPhase,
          onProgress: (fr) => setProgress((i + fr) / total),
        });
        if (result.duplicate) anyDuplicate = true;

        // Tag tickers (shared across the batch) — best-effort.
        if (tickers.length && result.reportId) {
          try {
            const res = await setReportSymbols({ reportId: result.reportId, tickers });
            if (!res.ok) secondaryFailed = true;
          } catch (err) {
            console.error("[upload] tagging tickers failed:", err);
            secondaryFailed = true;
          }
        }

        // Attachments apply only to a single-PDF upload.
        if (!multi && attachments.length && result.reportId) {
          const ok = await uploadAttachments(result.reportId, controller.signal);
          if (!ok) secondaryFailed = true;
        }
      }

      setOpen(false);
      setFiles([]);
      setAttachments([]);
      setTitle("");
      reset();
      setToast({
        title: secondaryFailed
          ? t("uploadTagFailed")
          : anyDuplicate
            ? t("uploadDuplicate")
            : multi
              ? t("uploadSuccessMulti", { n: total })
              : t("uploadSuccess"),
      });
      router.refresh();
    } catch (err) {
      if (err instanceof UploadCanceledError) {
        setError(t("uploadCanceled"));
      } else {
        setError(mapError(err instanceof Error ? err.message : "unknown"));
      }
      setBusy(false);
      setPhase("error");
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  const phaseLabel =
    phase === "hashing"
      ? t("uploadHashing")
      : phase === "uploading"
        ? t("uploadProgress", { percent: Math.round(progress * 100) })
        : phase === "finalizing"
          ? t("uploadVerifying")
          : "";

  return (
    <>
      <Button
        variant="primary"
        leadingIcon={<Icon name="upload" size={16} />}
        onClick={() => {
          reset();
          setFiles([]);
          setAttachments([]);
          setOpen(true);
        }}
      >
        {tActions("upload")}
      </Button>

      <Dialog
        open={open}
        onClose={close}
        title={t("uploadTitle")}
        description={t("uploadSubtitle")}
        width={560}
        footer={
          busy ? (
            <Button variant="ghost" onClick={cancel} leadingIcon={<Icon name="x" size={16} />}>
              {t("uploadCancel")}
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={close}>
                {tActions("cancel")}
              </Button>
              <Button variant="primary" onClick={start} leadingIcon={<Icon name="upload" size={16} />}>
                {phase === "error" ? t("uploadRetry") : t("submitUpload")}
              </Button>
            </>
          )
        }
      >
        <form ref={formRef} className="flex flex-col gap-[14px]">
          {/* PDF file(s) — one or many */}
          <div className="flex flex-col gap-[7px]">
            <label
              htmlFor="bc-upload-file"
              className="text-micro font-semibold uppercase tracking-[0.07em] text-ink-3"
            >
              {t("uploadFile")}
              <span className="text-danger"> *</span>
            </label>
            <input
              id="bc-upload-file"
              type="file"
              name="file"
              accept="application/pdf,.pdf"
              multiple
              required
              disabled={busy}
              onChange={(e) => {
                const picked = Array.from(e.currentTarget.files ?? []);
                setFiles(picked);
                // Single file → auto-fill the title from the file name if empty.
                if (picked.length === 1 && !title.trim()) {
                  setTitle(picked[0].name.replace(/\.[^.]+$/, ""));
                }
                setFieldErrors((p) => ({ ...p, file: undefined, titleVi: undefined }));
                setError(null);
                setPhase("idle");
              }}
              className={
                "rounded-control border bg-surface text-small text-ink-2 file:mr-3 file:cursor-pointer file:border-0 file:border-r file:border-line file:bg-surface-1 file:px-3 file:py-2 file:text-mini file:font-medium file:text-ink hover:border-line-3 disabled:opacity-60 " +
                (fieldErrors.file ? "border-danger" : "border-line-2")
              }
            />
            {fieldErrors.file ? (
              <span className="text-mini text-danger">{fieldErrors.file}</span>
            ) : multi ? (
              <span className="text-mini text-ink-3">{t("uploadMultiNote", { n: files.length })}</span>
            ) : (
              <span className="text-mini text-ink-3">{t("uploadFileHint")}</span>
            )}
          </div>

          {/* Per-report fields — only meaningful for a single PDF; batch derives them. */}
          {!multi && (
            <>
              <Input
                label={t("fieldTitleVi")}
                name="titleVi"
                required
                disabled={busy}
                value={title}
                error={fieldErrors.titleVi}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setFieldErrors((p) => ({ ...p, titleVi: undefined }));
                }}
              />
              <Input label={t("fieldSummary")} name="summaryVi" disabled={busy} />
              <Input label={t("fieldAuthor")} name="authorVi" disabled={busy} />
            </>
          )}

          <Input
            label={t("fieldTickers")}
            name="tickers"
            placeholder="VCB, FPT, HPG"
            disabled={busy}
          />

          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
            <Select
              label={t("fieldCategory")}
              name="categoryId"
              defaultValue=""
              disabled={busy}
            >
              {/* Selectable (not disabled): leaving this = "Chưa phân loại" (UNKNOWN) */}
              <option value="">{t("fieldCategoryNone")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
            <Select label={t("fieldAccess")} name="accessLevel" defaultValue="RESTRICTED" disabled={busy}>
              <option value="RESTRICTED">{tAccess("restricted")}</option>
              <option value="PUBLIC">{tAccess("public")}</option>
            </Select>
          </div>

          {/* Optional Excel/Word attachments — single-PDF upload only. */}
          {!multi && (
            <div className="flex flex-col gap-[7px]">
              <label
                htmlFor="bc-upload-attachments"
                className="text-micro font-semibold uppercase tracking-[0.07em] text-ink-3"
              >
                {t("uploadAttachments")}
              </label>
              <input
                id="bc-upload-attachments"
                type="file"
                accept={ATTACHMENT_ACCEPT}
                multiple
                disabled={busy}
                onChange={(e) => setAttachments(Array.from(e.currentTarget.files ?? []))}
                className="rounded-control border border-line-2 bg-surface text-small text-ink-2 file:mr-3 file:cursor-pointer file:border-0 file:border-r file:border-line file:bg-surface-1 file:px-3 file:py-2 file:text-mini file:font-medium file:text-ink hover:border-line-3 disabled:opacity-60"
              />
              <span className="text-mini text-ink-3">
                {attachments.length > 0
                  ? t("uploadAttachmentsCount", { n: attachments.length })
                  : t("uploadAttachmentsHint")}
              </span>
            </div>
          )}

          {/* Uploads always start as DRAFT — publishing is a separate APPROVER step. */}
          <p className="text-mini text-ink-3">{t("uploadDraftNote")}</p>

          {/* Progress */}
          {busy && (
            <div className="flex flex-col gap-[7px]" aria-live="polite">
              <div className="flex items-center justify-between text-mini text-ink-2">
                <span className="flex items-center gap-[7px]">
                  <Icon name="loader" size={14} className="animate-spin" />
                  {multi ? `${t("uploadFileCounter", { i: fileIndex + 1, n: files.length })} · ${phaseLabel}` : phaseLabel}
                </span>
                <span data-numeric className="font-mono tabular-nums text-ink-3">
                  {Math.round(progress * 100)}%
                </span>
              </div>
              <div className="h-[6px] w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-200"
                  style={{ width: `${Math.max(3, Math.round(progress * 100))}%` }}
                />
              </div>
            </div>
          )}

          {error && <InlineAlert>{error}</InlineAlert>}
        </form>
      </Dialog>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[200]">
          <Toast
            tone="success"
            icon={<Icon name="check-circle" size={18} />}
            title={toast.title}
            onClose={() => setToast(null)}
            duration={4000}
          />
        </div>
      )}
    </>
  );
}
