"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Badge, Card, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icon";
import { formatDate } from "@/lib/format";
import type { SearchedReport, ReportFacets } from "@/lib/authz";

// MVP display labels (Vietnamese-first; EN/zh keys are a fast-follow).
const TYPE_VI: Record<string, string> = {
  EARNINGS: "Kết quả KD", RESULT: "Kết quả", AGM: "ĐHCĐ", AGM_EXTRA: "ĐHCĐ bất thường",
  INVESTOR_MEETING: "Gặp gỡ NĐT", COMPANY: "Báo cáo công ty", COMPANY_VISIT: "Thăm DN",
  INITIATION: "Lần đầu", LISTING: "Niêm yết", IPO: "IPO", BOND: "Trái phiếu",
  DROP_COVERAGE: "Ngưng theo dõi", VIEW: "Quan điểm", PHTT: "PHTT",
};
const REC_VI: Record<string, string> = { BUY: "MUA", HOLD: "GIỮ", SELL: "BÁN", REDUCE: "GIẢM", ADD: "THÊM" };
const TIER_VI: Record<string, string> = { FULL: "Báo cáo", FLASH: "Nhận định nhanh" };
const recTone = (r: string | null) =>
  r === "BUY" || r === "ADD" ? "success" : r === "SELL" || r === "REDUCE" ? "danger" : "neutral";

type Params = {
  q?: string; type?: string; rec?: string; tier?: string; symbol?: string;
};

export function LibraryGrid({
  items, facets, total, capped, nextCursor, params, locale,
}: {
  items: SearchedReport[];
  facets: ReportFacets;
  total: number;
  capped: boolean;
  nextCursor: string | null;
  params: Params;
  locale: string;
}) {
  const t = useTranslations("Library");
  const tc = useTranslations("Common");
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = React.useTransition();

  // Build a new URL from the current query string + a patch (null deletes).
  const apply = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === "") next.delete(k);
        else next.set(k, v);
      }
      next.delete("cursor"); // any filter change resets pagination
      start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
    },
    [sp, pathname, router],
  );

  const toggleCsv = (key: keyof Params, value: string) => {
    const cur = (params[key] ?? "").split(",").filter(Boolean);
    const has = cur.includes(value);
    const nextVals = has ? cur.filter((x) => x !== value) : [...cur, value];
    apply({ [key]: nextVals.join(",") || null });
  };

  // Debounced free-text search.
  const [text, setText] = React.useState(params.q ?? "");
  React.useEffect(() => setText(params.q ?? ""), [params.q]);
  React.useEffect(() => {
    const id = setTimeout(() => {
      if ((text.trim() || null) !== (params.q?.trim() || null)) apply({ q: text.trim() || null });
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const activeType = (params.type ?? "").split(",").filter(Boolean);
  const activeRec = (params.rec ?? "").split(",").filter(Boolean);
  const anyFilter = !!(params.q || params.type || params.rec || params.tier || params.symbol);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      {/* ── Facet rail ── */}
      <aside className="flex-none lg:w-[210px]">
        <div className="flex items-center gap-[6px] rounded-control border border-line-2 bg-surface-input px-[10px] shadow-well focus-within:border-accent focus-within:bg-surface-card focus-within:shadow-[0_0_0_3px_var(--color-focus-ring)]">
          <Icon name="search" size={15} className="flex-none text-ink-3" />
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={tc("searchPlaceholder")}
            aria-label={tc("search")}
            className="min-w-0 flex-1 border-none bg-transparent py-[7px] font-sans text-[14px] text-ink outline-none placeholder:text-ink-4"
          />
        </div>

        {params.symbol && (
          <button
            type="button"
            onClick={() => apply({ symbol: null })}
            className="mt-3 inline-flex items-center gap-[6px] rounded-control border border-accent bg-accent px-[10px] py-[5px] text-mini font-medium text-on-accent"
          >
            <Icon name="x" size={12} /> {params.symbol}
          </button>
        )}

        <FacetGroup title={t("facetType")} values={facets.reportType} active={activeType} labels={TYPE_VI} onToggle={(v) => toggleCsv("type", v)} />
        <FacetGroup title={t("facetRec")} values={facets.recommendation} active={activeRec} labels={REC_VI} onToggle={(v) => toggleCsv("rec", v)} />
        <FacetGroup
          title={t("facetTier")}
          values={facets.tier}
          active={params.tier ? [params.tier] : []}
          labels={TIER_VI}
          onToggle={(v) => apply({ tier: params.tier === v ? null : v })}
        />
      </aside>

      {/* ── Results ── */}
      <div className="min-w-0 flex-1">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="bc-display text-[26px] text-ink">{t("title")}</h2>
            <p className="mt-[6px] text-small text-ink-3">{t("description")}</p>
          </div>
          <span data-numeric className="flex-none rounded-control border border-line bg-surface-card px-[10px] py-[5px] font-mono text-mini text-ink-3 shadow-soft">
            {pending ? "…" : capped ? t("documentCountCapped", { n: total }) : t("documentCount", { n: total })}
          </span>
        </div>

        {items.length === 0 ? (
          <Card padding={0}>
            <EmptyState icon="file-text" title={anyFilter ? t("emptyFiltered") : t("emptyAll")} />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 xl:grid-cols-3">
            {items.map((d) => (
              <Card key={d.id} padding={18} className="flex h-full flex-col">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-[5px]">
                    {d.tickers.slice(0, 2).map((tk) => (
                      <button
                        key={tk}
                        type="button"
                        onClick={() => apply({ symbol: tk })}
                        className="rounded-control border border-line bg-surface-2 px-[7px] py-[2px] font-mono text-micro font-medium text-ink-2 transition-colors hover:border-accent hover:text-accent"
                      >
                        {tk}
                      </button>
                    ))}
                    {d.tier && (
                      <span className="text-[10px] font-medium uppercase tracking-caps text-ink-4">
                        {TIER_VI[d.tier]}
                      </span>
                    )}
                  </div>
                  {d.recommendation && (
                    <Badge tone={recTone(d.recommendation)} size="sm">
                      {REC_VI[d.recommendation] ?? d.recommendation}
                    </Badge>
                  )}
                </div>

                <Link href={`/reports/${d.slug}`} className="group flex flex-1 flex-col">
                  <div className="flex items-start gap-3">
                    <span className="flex size-[42px] flex-none items-center justify-center rounded-card border border-line bg-surface-2">
                      <Icon name="file-text" size={19} className="text-ink-3" />
                    </span>
                    <div className="min-w-0 flex-1">
                      {d.reportType && (
                        <span className="text-[10px] font-medium uppercase tracking-caps text-ink-4">
                          {TYPE_VI[d.reportType] ?? d.reportType}
                        </span>
                      )}
                      <div className="line-clamp-2 text-regular font-semibold leading-[1.3] tracking-[-0.01em] text-ink transition-colors group-hover:text-accent">
                        {d.title}
                      </div>
                    </div>
                  </div>
                  {d.summary && (
                    <p className="mt-3 line-clamp-2 text-small leading-normal text-ink-3">{d.summary}</p>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3 text-mini text-ink-3">
                    <span data-numeric className="font-mono">{formatDate(d.reportDate ?? d.publishedAt, locale)}</span>
                    {d.pageCount != null && (
                      <span data-numeric className="inline-flex items-center gap-[5px] font-mono">
                        <Icon name="files" size={13} className="text-ink-4" />
                        {t("pageCount", { n: d.pageCount })}
                      </span>
                    )}
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        )}

        {nextCursor && !params.q && (
          <div className="mt-7 flex justify-center">
            <button
              type="button"
              onClick={() => apply({ cursor: nextCursor })}
              className="rounded-control border border-line-2 bg-surface-card px-4 py-2 text-small font-medium text-ink-2 shadow-soft transition-colors hover:border-line-3 hover:text-ink"
            >
              {t("loadMore")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FacetGroup({
  title, values, active, labels, onToggle,
}: {
  title: string;
  values: { value: string; count: number }[];
  active: string[];
  labels: Record<string, string>;
  onToggle: (v: string) => void;
}) {
  if (values.length === 0) return null;
  return (
    <div className="mt-5">
      <div className="mb-[6px] text-[10px] font-semibold uppercase tracking-caps text-ink-4">{title}</div>
      <div className="flex flex-col gap-[3px]">
        {values.map((f) => {
          const on = active.includes(f.value);
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(f.value)}
              className={
                "flex items-center justify-between gap-2 rounded-control px-[9px] py-[5px] text-mini transition-colors " +
                (on ? "bg-accent font-medium text-on-accent" : "text-ink-2 hover:bg-surface-hover hover:text-ink")
              }
            >
              <span className="truncate">{labels[f.value] ?? f.value}</span>
              <span data-numeric className={on ? "font-mono text-micro text-on-accent/75" : "font-mono text-micro text-ink-4"}>
                {f.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
