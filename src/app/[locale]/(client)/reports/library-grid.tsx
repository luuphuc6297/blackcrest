"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge, Card, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icon";
import { REPORT_STATUS } from "@/lib/status";
import { formatDate } from "@/lib/format";

type LibReport = {
  id: string;
  slug: string;
  status: keyof typeof REPORT_STATUS;
  publishedAt: Date | string | null;
  pageCount: number | null;
  category: { id: string; nameVi: string; nameEn: string; nameZh: string; slug: string };
  title: string;
  summary: string | null;
  author: string | null;
};

/** Investor library — instant in-memory category filter + search over the
 * already entitlement-filtered set the server provided. No server round-trips. */
export function LibraryGrid({
  reports,
  categories,
  locale,
}: {
  reports: LibReport[];
  categories: { id: string; slug: string; label: string }[];
  locale: string;
}) {
  const t = useTranslations("Library");
  const tc = useTranslations("Common");
  const tStatus = useTranslations("Status");

  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState<string | null>(null);

  const searched = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return reports;
    return reports.filter((r) =>
      `${r.title} ${r.summary ?? ""} ${r.author ?? ""}`.toLowerCase().includes(term),
    );
  }, [reports, q]);

  const counts = React.useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of searched) c[r.category.slug] = (c[r.category.slug] ?? 0) + 1;
    return c;
  }, [searched]);

  const items = React.useMemo(
    () => (cat ? searched.filter((r) => r.category.slug === cat) : searched),
    [searched, cat],
  );

  const catLabel = (c: LibReport["category"]) =>
    locale === "en" ? c.nameEn : locale === "zh" ? c.nameZh : c.nameVi;

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-[24px] font-semibold tracking-[-0.015em] text-ink">
            {t("title")}
          </h2>
          <p className="mt-[6px] text-[15px] text-ink-3">{t("description")}</p>
        </div>
        <span data-numeric className="font-mono text-[13px] text-ink-3">
          {t("documentCount", { n: items.length })}
        </span>
      </div>

      {/* Filter + search */}
      <div className="mb-6 flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-[6px]">
          <Icon name="filter" size={15} className="mr-1 flex-none text-ink-4" />
          <Chip active={!cat} onClick={() => setCat(null)} label={t("filterAll")} count={searched.length} />
          {categories.map((c) => (
            <Chip
              key={c.id}
              active={cat === c.slug}
              onClick={() => setCat(c.slug)}
              label={c.label}
              count={counts[c.slug] ?? 0}
            />
          ))}
        </div>
        <div className="flex h-[32px] w-full items-center gap-[8px] rounded-control border border-line-2 bg-surface px-[10px] transition-[border-color,box-shadow] duration-[180ms] hover:border-line-3 focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--color-focus-ring)] sm:w-[240px]">
          <Icon name="search" size={15} className="flex-none text-ink-3" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tc("searchPlaceholder")}
            aria-label={tc("search")}
            className="min-w-0 flex-1 border-none bg-transparent font-sans text-[14px] text-ink outline-none placeholder:text-ink-4"
          />
        </div>
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <Card padding={0}>
          <EmptyState icon="file-text" title={t("emptyFiltered")} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3">
          {items.map((d, i) => (
            <Link
              key={d.id}
              href={`/reports/${d.slug}`}
              className="group bc-rise"
              style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
            >
              <Card
                padding={18}
                className="flex h-full flex-col transition-[box-shadow,transform] group-hover:-translate-y-px group-hover:shadow-card"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="truncate text-[10px] font-medium uppercase tracking-[0.06em] text-ink-4">
                    {catLabel(d.category)}
                  </span>
                  <Badge tone={REPORT_STATUS[d.status].tone} dot size="sm">
                    {tStatus(REPORT_STATUS[d.status].key)}
                  </Badge>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-[52px] w-[42px] flex-none items-center justify-center rounded-card border border-line bg-surface-2">
                    <Icon name="file-text" size={20} className="text-ink-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-[15px] font-semibold leading-[1.3] tracking-[-0.01em] text-ink">
                      {d.title}
                    </div>
                    {d.author && (
                      <div className="mt-1 truncate text-[12px] text-ink-3">{d.author}</div>
                    )}
                  </div>
                </div>
                {d.summary && (
                  <p className="mt-3 line-clamp-2 text-[13px] leading-[1.5] text-ink-3">
                    {d.summary}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3 text-[12px] text-ink-3">
                  <span data-numeric className="font-mono">
                    {formatDate(d.publishedAt, locale)}
                  </span>
                  <span className="flex items-center gap-3">
                    {d.pageCount != null && (
                      <span data-numeric className="inline-flex items-center gap-[5px] font-mono">
                        <Icon name="files" size={13} className="text-ink-4" />
                        {t("pageCount", { n: d.pageCount })}
                      </span>
                    )}
                    <Icon
                      name="arrow-up-right"
                      size={15}
                      className="text-ink-4 transition-colors group-hover:text-accent"
                    />
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function Chip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "inline-flex items-center gap-[6px] rounded-control border border-accent bg-accent px-[11px] py-[5px] text-[12px] font-medium text-on-accent"
          : "inline-flex items-center gap-[6px] rounded-control border border-line bg-surface px-[11px] py-[5px] text-[12px] font-medium text-ink-2 transition-colors hover:bg-surface-hover hover:text-ink"
      }
    >
      {label}
      <span
        data-numeric
        className={active ? "font-mono text-[11px] text-on-accent/75" : "font-mono text-[11px] text-ink-4"}
      >
        {count}
      </span>
    </button>
  );
}
