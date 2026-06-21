"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Dialog, InlineAlert, Input, Select, Toast } from "@/components/ui";
import { Icon } from "@/components/icon";
import { setReportSymbols } from "@/server/report-actions";
import {
  uploadFileChunked,
  UploadCanceledError,
  MAX_UPLOAD_BYTES,
  type UploadState,
  type UploadMeta,
} from "@/lib/chunked-upload";

/**
 * Admin "upload report" dialog — resumable chunked upload (Upload Flow).
 * The file is hashed (SHA-256), split into chunks, and sent to the chunked
 * upload endpoints with progress, cancellation, retry and dedup. The session
 * is reassembled + integrity-verified server-side before the Report is created.
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
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<{
    file?: string;
    titleVi?: string;
    categoryId?: string;
  }>({});
  const [file, setFile] = React.useState<File | null>(null);
  const [title, setTitle] = React.useState("");
  const [toast, setToast] = React.useState<{ title: string } | null>(null);

  const formRef = React.useRef<HTMLFormElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  function reset() {
    setBusy(false);
    setPhase("idle");
    setProgress(0);
    setError(null);
    setFieldErrors({});
    abortRef.current = null;
  }

  function close() {
    if (busy) return;
    setOpen(false);
    setFile(null);
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

  async function start() {
    const formEl = formRef.current;
    if (!formEl || busy) return;

    const fd = new FormData(formEl);
    const picked = fd.get("file");
    const f = picked instanceof File && picked.size > 0 ? picked : file;
    const titleVi = String(fd.get("titleVi") ?? "").trim();
    const categoryId = String(fd.get("categoryId") ?? "");

    // Client-side validation (the server re-validates everything). Collect
    // per-field errors so each problem is shown next to its own field.
    const fErrs: { file?: string; titleVi?: string; categoryId?: string } = {};
    if (!f) fErrs.file = t("uploadFileRequired");
    else if (f.size > MAX_UPLOAD_BYTES) fErrs.file = t("uploadTooLarge");
    else if (f.type && f.type !== "application/pdf") fErrs.file = t("uploadNotPdf");
    if (!titleVi) fErrs.titleVi = t("fieldRequired");
    if (!categoryId) fErrs.categoryId = t("fieldRequired");
    if (Object.keys(fErrs).length > 0) {
      setFieldErrors(fErrs);
      setError(null);
      return;
    }
    setFieldErrors({});
    if (!f) return; // narrowing for TS — unreachable after the check above

    const meta: UploadMeta = {
      categoryId,
      accessLevel: String(fd.get("accessLevel") ?? "RESTRICTED"),
      titleVi,
      summaryVi: String(fd.get("summaryVi") ?? "").trim() || undefined,
      authorVi: String(fd.get("authorVi") ?? "").trim() || undefined,
    };

    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError(null);
    setProgress(0);

    try {
      const result = await uploadFileChunked(f, meta, {
        signal: controller.signal,
        onState: setPhase,
        onProgress: setProgress,
      });
      // Tag tickers (optional) on the freshly-created report so it's findable by
      // ticker + can trigger watchlist alerts. Best-effort: a tag failure must not
      // fail the upload that already succeeded.
      const tickers = String(fd.get("tickers") ?? "")
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (tickers.length && result.reportId) {
        try {
          await setReportSymbols({ reportId: result.reportId, tickers });
        } catch {
          /* non-fatal — staff can re-tag from the reports table */
        }
      }
      setOpen(false);
      setFile(null);
      reset();
      setToast({ title: result.duplicate ? t("uploadDuplicate") : t("uploadSuccess") });
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
          setFile(null);
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
            <Button
              variant="ghost"
              onClick={cancel}
              leadingIcon={<Icon name="x" size={16} />}
            >
              {t("uploadCancel")}
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={close}>
                {tActions("cancel")}
              </Button>
              <Button
                variant="primary"
                onClick={start}
                leadingIcon={<Icon name="upload" size={16} />}
              >
                {phase === "error" ? t("uploadRetry") : t("submitUpload")}
              </Button>
            </>
          )
        }
      >
        <form ref={formRef} className="flex flex-col gap-[14px]">
          {/* File */}
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
              required
              disabled={busy}
              onChange={(e) => {
                const picked = e.currentTarget.files?.[0] ?? null;
                setFile(picked);
                // Auto-fill the title from the file name (without extension) when
                // the title is still empty, so the admin rarely has to retype it.
                if (picked && !title.trim()) {
                  setTitle(picked.name.replace(/\.[^.]+$/, ""));
                  setFieldErrors((p) => ({ ...p, file: undefined, titleVi: undefined }));
                } else {
                  setFieldErrors((p) => ({ ...p, file: undefined }));
                }
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
            ) : (
              <span className="text-mini text-ink-3">{t("uploadFileHint")}</span>
            )}
          </div>

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
              required
              defaultValue=""
              disabled={busy}
              error={fieldErrors.categoryId}
              onChange={() =>
                setFieldErrors((p) => ({ ...p, categoryId: undefined }))
              }
            >
              <option value="" disabled>
                {t("selectPlaceholder")}
              </option>
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

          {/* Uploads always start as DRAFT — publishing is a separate APPROVER step. */}
          <p className="text-mini text-ink-3">{t("uploadDraftNote")}</p>

          {/* Progress */}
          {busy && (
            <div className="flex flex-col gap-[7px]" aria-live="polite">
              <div className="flex items-center justify-between text-mini text-ink-2">
                <span className="flex items-center gap-[7px]">
                  <Icon name="loader" size={14} className="animate-spin" />
                  {phaseLabel}
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
