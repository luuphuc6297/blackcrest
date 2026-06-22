"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Badge, Card, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icon";
import { formatDate } from "@/lib/format";
import type { SearchedReport, ReportFacets } from "@/lib/authz";

const PAGE = 24;
const recTone = (r: string | null) =>
  r === "BUY" || r === "ADD" ? "success" : r === "SELL" || r === "REDUCE" ? "danger" : "neutral";

type Params = { q?: string; type?: string; rec?: string; tier?: string; symbol?: string };

export function LibraryGrid({
  items, facets, total, capped, hasMore, shown, params, locale,
}: {
  items: SearchedReport[];
  facets: ReportFacets;
  total: number;
  capped: boolean;
  hasMore: boolean;
  shown: number;
  params: Params;
  locale: string;
}) {
  const t = useTranslations("Library");
  const tc = useTranslations("Common");
  const tType = useTranslations("ReportType");
  const tRec = useTranslations("Recommendation");
  const tTier = useTranslations("ReportTier");
  // next-intl throws on a missing key; fall back to the raw enum value.
  const safe = (tr: (k: string) => string) => (v: string) => {
    try { return tr(v); } catch { return v; }
  };
  const typeLabel = safe(tType);
  const recLabel = safe(tRec);
  const tierLabel = safe(tTier);

  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = React.useTransition();
  // Optimistic filter state so a facet/chip click reflects as SELECTED instantly
  // (before the server round-trip lands) — the click never looks dead.
  const [optimistic, setOptimistic] = React.useOptimistic<Params>(params);

  // Apply a filter patch. Any filter change resets pagination back to the first page.
  const apply = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === "") next.delete(k);
        else next.set(k, v);
      }
      next.delete("take");
      start(() => {
        // Reflect the new filter set immediately; useOptimistic re-syncs to the
        // real `params` once the transition (RSC re-fetch) completes.
        setOptimistic((prev) => {
          const m: Params = { ...prev };
          for (const [k, v] of Object.entries(patch)) m[k as keyof Params] = v ?? undefined;
          return m;
        });
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [sp, pathname, router, setOptimistic],
  );

  // "Load more" grows ?take WITHOUT resetting it (accumulate).
  const loadMore = () => {
    const next = new URLSearchParams(sp.toString());
    next.set("take", String(shown + PAGE));
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  const toggleCsv = (key: keyof Params, value: string) => {
    const cur = (optimistic[key] ?? "").split(",").filter(Boolean);
    const has = cur.includes(value);
    apply({ [key]: (has ? cur.filter((x) => x !== value) : [...cur, value]).join(",") || null });
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

  const activeType = (optimistic.type ?? "").split(",").filter(Boolean);
  const activeRec = (optimistic.rec ?? "").split(",").filter(Boolean);
  const anyFilter = !!(optimistic.q || optimistic.type || optimistic.rec || optimistic.tier || optimistic.symbol);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
      {/* ── Facet rail ── */}
      <aside className="flex-none lg:w-[230px]">
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

        {optimistic.symbol && (
          <button
            type="button"
            onClick={() => apply({ symbol: null })}
            className="mt-3 inline-flex items-center gap-[6px] rounded-control border border-accent bg-accent px-[10px] py-[5px] text-mini font-medium text-on-accent"
          >
            <Icon name="x" size={12} /> {optimistic.symbol}
          </button>
        )}

        <FacetGroup title={t("facetType")} values={facets.reportType} active={activeType} label={typeLabel} onToggle={(v) => toggleCsv("type", v)} />
        <FacetGroup title={t("facetRec")} values={facets.recommendation} active={activeRec} label={recLabel} onToggle={(v) => toggleCsv("rec", v)} />
        <FacetGroup
          title={t("facetTier")}
          values={facets.tier}
          active={optimistic.tier ? [optimistic.tier] : []}
          label={tierLabel}
          onToggle={(v) => apply({ tier: optimistic.tier === v ? null : v })}
        />
      </aside>

      {/* ── Results ── */}
      <div className="min-w-0 flex-1">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="bc-display text-[26px] text-ink">{t("title")}</h2>
            <p className="mt-[6px] text-small text-ink-3">{t("description")}</p>
          </div>
          <span data-numeric className="flex-none rounded-control border border-line bg-surface-card px-[10px] py-[5px] font-mono text-mini text-ink-3 shadow-soft">
            {pending ? "…" : capped ? t("documentCountCapped", { n: total }) : t("documentCount", { n: total })}
          </span>
        </div>

        <div className="relative" aria-busy={pending}>
          {pending && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-2">
              <span className="inline-flex items-center gap-[7px] rounded-pill border border-line bg-surface-card px-[14px] py-[6px] text-mini font-medium text-ink-3 shadow-soft-lit">
                <Icon name="refresh-cw" size={13} className="animate-spin" />
                {tc("loading")}
              </span>
            </div>
          )}
          <div className={pending ? "opacity-45 transition-opacity duration-200" : "transition-opacity duration-200"}>
        {items.length === 0 ? (
          <Card padding={0}>
            <EmptyState icon="file-text" title={anyFilter ? t("emptyFiltered") : t("emptyAll")} />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((d) => {
              const kicker = d.reportType ? typeLabel(d.reportType) : d.tier ? tierLabel(d.tier) : "";
              return (
                <Card key={d.id} padding={18} className="flex h-full min-h-[148px] flex-col transition-[transform,box-shadow] duration-150 hover:-translate-y-px hover:shadow-soft-lit active:scale-[0.99]">
                  {/* top: tickers + recommendation */}
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-[5px]">
                      {d.tickers.slice(0, 3).map((tk) => (
                        <button
                          key={tk}
                          type="button"
                          onClick={() => apply({ symbol: tk })}
                          className="rounded-control border border-line bg-surface-2 px-[7px] py-[2px] font-mono text-micro font-medium text-ink-2 transition-colors hover:border-accent hover:text-accent"
                        >
                          {tk}
                        </button>
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
                        {/* kicker: always one reserved line so cards stay aligned */}
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
              );
            })}
          </div>
        )}
          </div>
        </div>

        {hasMore && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={pending}
              className="rounded-control border border-line-2 bg-surface-card px-5 py-2 text-small font-medium text-ink-2 shadow-soft transition-colors hover:border-line-3 hover:text-ink disabled:opacity-60"
            >
              {pending ? "…" : t("loadMore")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FacetGroup({
  title, values, active, label, onToggle,
}: {
  title: string;
  values: { value: string; count: number }[];
  active: string[];
  label: (v: string) => string;
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
                "flex items-center justify-between gap-2 rounded-control px-[9px] py-[6px] text-mini transition-colors " +
                (on ? "bg-accent font-medium text-on-accent" : "text-ink-2 hover:bg-surface-hover hover:text-ink")
              }
            >
              <span className="truncate text-left">{label(f.value)}</span>
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
