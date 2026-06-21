"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui";
import { ATTACHMENT_ACCEPT, MAX_ATTACHMENT_BYTES, extOf } from "@/lib/attachment-validate";

type Attachment = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  audience: "CLIENT" | "INTERNAL";
  createdAt: string | Date;
};

const ALLOWED_EXT = new Set(["xlsx", "xls", "docx", "doc"]);

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

// Map a server error code → i18n key.
const ERR_KEY: Record<string, string> = {
  macro: "errMacro",
  type: "errType",
  size: "errSize",
  magic: "errMagic",
  empty: "errEmpty",
  forbidden: "errForbidden",
};

/**
 * F3 attachments (Excel/Word, download-only). Lists CLIENT files to every
 * entitled viewer; staff also see INTERNAL files (badged) and get an upload +
 * delete control. Mutations hit the authed routes, then router.refresh() re-pulls
 * the RSC list. Client-side ext/size check is courtesy only — the server route
 * (magic-bytes + macro block + entitlement) is authoritative.
 */
export function AttachmentsPanel({
  reportId,
  attachments,
  canManage,
}: {
  reportId: string;
  attachments: Attachment[];
  canManage: boolean;
}) {
  const t = useTranslations("Attachments");
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [audience, setAudience] = React.useState<"CLIENT" | "INTERNAL">("CLIENT");
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [confirmId, setConfirmId] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setErr(null);
    setInfo(null);
    if (!ALLOWED_EXT.has(extOf(f.name))) {
      setErr(t("errType"));
      e.target.value = "";
      return;
    }
    if (f.size > MAX_ATTACHMENT_BYTES) {
      setErr(t("errSize"));
      e.target.value = "";
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("audience", audience);
      const res = await fetch(`/api/reports/${reportId}/attachments`, { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { error?: string; duplicate?: boolean };
      if (!res.ok) setErr(t(ERR_KEY[data.error ?? ""] ?? "errGeneric"));
      else if (data.duplicate) setInfo(t("infoDuplicate"));
      else router.refresh();
    } catch {
      setErr(t("errGeneric"));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onDelete = async (id: string) => {
    setErr(null);
    setInfo(null);
    setConfirmId(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/reports/${reportId}/attachments/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
      else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(t(ERR_KEY[data.error ?? ""] ?? "errDeleteFailed"));
      }
    } catch {
      setErr(t("errDeleteFailed"));
    } finally {
      setDeletingId(null);
    }
  };

  if (attachments.length === 0 && !canManage) return null;

  return (
    <div className="rounded-card border border-line bg-surface-1 p-3">
      <div className="mb-2 flex items-center gap-2 text-ink-2">
        <Icon name="files" size={14} />
        <span className="text-small font-medium">{t("title")}</span>
      </div>

      {attachments.length === 0 ? (
        <p className="text-mini text-ink-3">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-[6px]">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2 rounded-control border border-line bg-surface-card px-[9px] py-[7px]"
            >
              <Icon name="file-text" size={15} className="flex-none text-ink-3" />
              <a
                href={`/api/reports/${reportId}/attachments/${a.id}`}
                download
                className="group min-w-0 flex-1"
              >
                <div className="truncate text-mini font-medium text-ink group-hover:text-accent">
                  {a.fileName}
                </div>
                <div data-numeric className="font-mono text-micro text-ink-4">
                  {fmtSize(a.fileSize)}
                </div>
              </a>
              {a.audience === "INTERNAL" && (
                <Badge tone="warning" size="sm">
                  {t("internal")}
                </Badge>
              )}
              <a
                href={`/api/reports/${reportId}/attachments/${a.id}`}
                download
                aria-label={t("download")}
                title={t("download")}
                className="flex-none rounded-control p-1 text-ink-4 transition-colors hover:bg-surface-hover hover:text-accent"
              >
                <Icon name="download" size={14} />
              </a>
              {canManage &&
                (confirmId === a.id ? (
                  <span className="flex flex-none items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onDelete(a.id)}
                      disabled={deletingId === a.id}
                      className="rounded-control border border-danger px-[7px] py-[2px] text-micro font-medium text-danger transition-colors hover:bg-danger hover:text-on-accent disabled:opacity-50"
                    >
                      {t("confirmYes")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="rounded-control px-[6px] py-[2px] text-micro text-ink-3 hover:text-ink"
                    >
                      {t("confirmNo")}
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmId(a.id)}
                    disabled={deletingId === a.id}
                    aria-label={t("delete")}
                    title={t("delete")}
                    className="flex-none rounded-control p-1 text-ink-4 transition-colors hover:bg-surface-hover hover:text-danger disabled:opacity-50"
                  >
                    <Icon name="trash-2" size={14} />
                  </button>
                ))}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <div className="mt-3 border-t border-line pt-3">
          <div className="mb-2 flex items-center gap-2">
            <label htmlFor="att-audience" className="text-mini text-ink-3">
              {t("audienceLabel")}
            </label>
            <select
              id="att-audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value as "CLIENT" | "INTERNAL")}
              disabled={busy}
              className="rounded-control border border-line-2 bg-surface px-[8px] py-[3px] text-mini text-ink outline-none focus:border-accent"
            >
              <option value="CLIENT">{t("audienceClient")}</option>
              <option value="INTERNAL">{t("audienceInternal")}</option>
            </select>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={ATTACHMENT_ACCEPT}
            disabled={busy}
            onChange={onPick}
            aria-label={t("title")}
            aria-describedby="att-hint"
            className="w-full rounded-control border border-line-2 bg-surface text-mini text-ink-2 file:mr-3 file:cursor-pointer file:border-0 file:border-r file:border-line file:bg-surface-1 file:px-3 file:py-2 file:text-mini file:font-medium file:text-ink hover:border-line-3 disabled:opacity-60"
          />
          {busy && <p className="mt-1 text-micro text-ink-4">{t("uploading")}</p>}
          {err && (
            <p className="mt-1 text-micro text-danger" role="alert">
              {err}
            </p>
          )}
          {info && !err && <p className="mt-1 text-micro text-ink-3">{info}</p>}
          <p id="att-hint" className="mt-1 text-micro text-ink-4">
            {t("hint")}
          </p>
        </div>
      )}
    </div>
  );
}
