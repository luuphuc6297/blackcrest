"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Dialog, Input, Select, Toast } from "@/components/ui";
import { Icon } from "@/components/icon";
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
  const [file, setFile] = React.useState<File | null>(null);
  const [toast, setToast] = React.useState<{ title: string } | null>(null);

  const formRef = React.useRef<HTMLFormElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  function reset() {
    setBusy(false);
    setPhase("idle");
    setProgress(0);
    setError(null);
    abortRef.current = null;
  }

  function close() {
    if (busy) return;
    setOpen(false);
    setFile(null);
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
    if (!f) {
      setError(t("uploadFileRequired"));
      return;
    }
    // Client-side validation (the server re-validates everything).
    if (f.size > MAX_UPLOAD_BYTES) {
      setError(t("uploadTooLarge"));
      return;
    }
    if (f.type && f.type !== "application/pdf") {
      setError(t("uploadNotPdf"));
      return;
    }
    const titleVi = String(fd.get("titleVi") ?? "").trim();
    const categoryId = String(fd.get("categoryId") ?? "");
    if (!titleVi || !categoryId) {
      setError(t("uploadInvalidData"));
      return;
    }

    const meta: UploadMeta = {
      categoryId,
      accessLevel: String(fd.get("accessLevel") ?? "RESTRICTED"),
      titleVi,
      summaryVi: String(fd.get("summaryVi") ?? "").trim() || undefined,
      authorVi: String(fd.get("authorVi") ?? "").trim() || undefined,
      titleEn: String(fd.get("titleEn") ?? "").trim() || undefined,
      titleZh: String(fd.get("titleZh") ?? "").trim() || undefined,
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
              className="text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-3"
            >
              {t("uploadFile")}
            </label>
            <input
              id="bc-upload-file"
              type="file"
              name="file"
              accept="application/pdf,.pdf"
              disabled={busy}
              onChange={(e) => {
                setFile(e.currentTarget.files?.[0] ?? null);
                setError(null);
                setPhase("idle");
              }}
              className="rounded-control border border-line-2 bg-surface text-[13px] text-ink-2 file:mr-3 file:cursor-pointer file:border-0 file:border-r file:border-line file:bg-surface-1 file:px-3 file:py-2 file:text-[12px] file:font-medium file:text-ink hover:border-line-3 disabled:opacity-60"
            />
            <span className="text-[12px] text-ink-3">{t("uploadFileHint")}</span>
          </div>

          <Input label={t("fieldTitleVi")} name="titleVi" required disabled={busy} />

          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
            <Input label={t("fieldTitleEn")} name="titleEn" disabled={busy} />
            <Input label={t("fieldTitleZh")} name="titleZh" disabled={busy} />
          </div>

          <Input label={t("fieldSummary")} name="summaryVi" disabled={busy} />
          <Input label={t("fieldAuthor")} name="authorVi" disabled={busy} />

          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
            <Select label={t("fieldCategory")} name="categoryId" required defaultValue="" disabled={busy}>
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
          <p className="text-[12px] text-ink-3">{t("uploadDraftNote")}</p>

          {/* Progress */}
          {busy && (
            <div className="flex flex-col gap-[7px]" aria-live="polite">
              <div className="flex items-center justify-between text-[12px] text-ink-2">
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

          {error && (
            <p
              role="alert"
              className="flex items-center gap-[7px] rounded-control border border-danger/40 bg-danger-tint px-[10px] py-[8px] text-[13px] text-danger"
            >
              <Icon name="alert-circle" size={14} />
              {error}
            </p>
          )}
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
