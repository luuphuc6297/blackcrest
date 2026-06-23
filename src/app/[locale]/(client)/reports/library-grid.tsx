"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Card, EmptyState, Select } from "@/components/ui";
import { Icon } from "@/components/icon";
import { ReportCard } from "@/components/report-card";
import type { SearchedReport, ReportFacets, ReportSort } from "@/lib/authz";

const PAGE = 24;

type Params = { q?: string; type?: string; rec?: string; tier?: string; symbol?: string };

export function LibraryGrid({
  items, facets, total, capped, hasMore, shown, params, sort, locale,
}: {
  items: SearchedReport[];
  facets: ReportFacets;
  total: number;
  capped: boolean;
  hasMore: boolean;
  shown: number;
  params: Params;
  sort: ReportSort;
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
          <div className="flex flex-none items-center gap-[10px]">
            <Select
              size="sm"
              aria-label={t("sortLabel")}
              value={sort}
              onChange={(e) => apply({ sort: e.target.value === "date" ? null : e.target.value })}
            >
              <option value="date">{t("sortDateDesc")}</option>
              <option value="date-asc">{t("sortDateAsc")}</option>
              <option value="az">{t("sortAZ")}</option>
              <option value="za">{t("sortZA")}</option>
            </Select>
            <span data-numeric className="rounded-control border border-line bg-surface-card px-[10px] py-[5px] font-mono text-mini text-ink-3 shadow-soft">
              {pending ? "…" : capped ? t("documentCountCapped", { n: total }) : t("documentCount", { n: total })}
            </span>
          </div>
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
            {items.map((d) => (
              <ReportCard key={d.id} report={d} locale={locale} />
            ))}
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
