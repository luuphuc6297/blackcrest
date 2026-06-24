"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge, Card } from "@/components/ui";
import { Icon } from "@/components/icon";
import { formatDate } from "@/lib/format";
import type { SearchedReport } from "@/lib/authz";

const recTone = (r: string | null) =>
  r === "BUY" || r === "ADD" ? "success" : r === "SELL" || r === "REDUCE" ? "danger" : "neutral";

/**
 * One report tile — shared by the library grid and the section carousels. The
 * card links to the report; ticker chips link to the filtered library
 * (?symbol=TK), so the same card works in a server (sections) or client (grid)
 * tree without a callback. `safe()` falls back to the raw enum if a label key is
 * missing (next-intl throws on missing keys).
 */
// memo: the library grid re-renders on every search keystroke / filter toggle,
// but each card's props (report object ref, locale) are stable across .filter(),
// so unchanged tiles skip re-render. (Full RSC conversion is a follow-up — the
// card is shared by both the client grid and the server carousels.)
export const ReportCard = memo(function ReportCard({
  report: d,
  locale,
}: {
  report: SearchedReport;
  locale: string;
}) {
  const t = useTranslations("Library");
  const tType = useTranslations("ReportType");
  const tRec = useTranslations("Recommendation");
  const tTier = useTranslations("ReportTier");
  const safe = (tr: (k: string) => string) => (v: string) => {
    try {
      return tr(v);
    } catch {
      return v;
    }
  };
  const typeLabel = safe(tType);
  const recLabel = safe(tRec);
  const tierLabel = safe(tTier);
  const kicker = d.reportType ? typeLabel(d.reportType) : d.tier ? tierLabel(d.tier) : "";

  return (
    <Card
      padding={18}
      className="flex h-full min-h-[148px] flex-col transition-[transform,box-shadow] duration-150 hover:-translate-y-px hover:shadow-soft-lit active:scale-[0.99]"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-[5px]">
          {d.tickers.slice(0, 3).map((tk) => (
            <Link
              key={tk}
              href={`/reports?symbol=${encodeURIComponent(tk)}`}
              className="rounded-control border border-line bg-surface-2 px-[7px] py-[2px] font-mono text-micro font-medium text-ink-2 no-underline transition-colors hover:border-accent hover:text-accent"
            >
              {tk}
            </Link>
          ))}
        </div>
        {d.recommendation && (
          <Badge tone={recTone(d.recommendation)} size="sm">
            {recLabel(d.recommendation)}
          </Badge>
        )}
      </div>

      <Link href={`/reports/${d.slug}`} className="group flex flex-1 flex-col">
        <div className="flex items-start gap-3">
          <span className="flex size-[42px] flex-none items-center justify-center rounded-card border border-line bg-surface-2">
            <Icon name="file-text" size={19} className="text-ink-3" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="h-[15px] truncate text-mini font-medium text-ink-4">{kicker}</div>
            <div className="mt-[3px] line-clamp-2 min-h-[2.5em] text-regular font-semibold leading-[1.25] tracking-[-0.01em] text-ink transition-colors group-hover:text-accent">
              {d.title}
            </div>
          </div>
        </div>
        {d.summary && (
          <p className="mt-3 line-clamp-2 text-small leading-normal text-ink-3">{d.summary}</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3 text-mini text-ink-3">
          <span data-numeric className="font-mono">
            {formatDate(d.reportDate ?? d.publishedAt, locale)}
          </span>
          {d.pageCount != null && (
            <span data-numeric className="inline-flex items-center gap-[5px] font-mono">
              <Icon name="files" size={13} className="text-ink-4" />
              {t("pageCount", { n: d.pageCount })}
            </span>
          )}
        </div>
      </Link>
    </Card>
  );
});
