"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/icon";
import { type Column, DataTable } from "./data-table";

/**
 * Client-side table chrome: instant in-memory search + filter (with live counts
 * in the tabs) + pagination, wrapped around the shared DataTable. The server
 * page passes ALL rows once; filtering never round-trips (no jank). Search field
 * mirrors the design-system Input (h-[32px], border-line-2, accent focus ring).
 */
export interface ClientTableProps<T> {
  rows: T[];
  getRowKey: (r: T) => string;
  columns: Column<T>[];
  /** Concatenated searchable text for a row. */
  searchText: (r: T) => string;
  /** Optional filter dimension rendered as counted tabs. */
  filter?: { get: (r: T) => string; options: { value: string; label: string }[] };
  pageSize?: number;
  minWidth?: number;
  empty?: React.ReactNode;
  /** Left side of the toolbar (title + count). */
  title?: React.ReactNode;
  /** Right side of the toolbar, after the search field (e.g. an action button). */
  actions?: React.ReactNode;
}

export function ClientTable<T>({
  rows,
  getRowKey,
  columns,
  searchText,
  filter,
  pageSize = 8,
  minWidth,
  empty,
  title,
  actions,
}: ClientTableProps<T>) {
  const tc = useTranslations("Common");
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);

  React.useEffect(() => setPage(1), [q, active]);

  // Rows matching the search term only (drives tab counts).
  const searched = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => searchText(r).toLowerCase().includes(term));
  }, [rows, q, searchText]);

  // Then apply the active filter tab.
  const filtered = React.useMemo(() => {
    if (!active || !filter) return searched;
    return searched.filter((r) => filter.get(r) === active);
  }, [searched, active, filter]);

  const counts = React.useMemo(() => {
    const c: Record<string, number> = {};
    if (filter) {
      for (const o of filter.options) c[o.value] = 0;
      for (const r of searched) {
        const v = filter.get(r);
        if (v in c) c[v] += 1;
      }
    }
    return c;
  }, [searched, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface-card shadow-soft-lit">
      <div className="flex flex-col gap-3 px-[18px] py-[14px] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">{title}</div>
        <div className="flex items-center gap-2">
          <SearchField value={q} onChange={setQ} placeholder={tc("searchPlaceholder")} />
          {actions}
        </div>
      </div>

      {filter && (
        <div className="flex flex-wrap items-center gap-[6px] border-t border-line px-[18px] py-[10px]">
          <FilterChip
            active={!active}
            onClick={() => setActive(null)}
            label={tc("all")}
            count={searched.length}
          />
          {filter.options.map((o) => (
            <FilterChip
              key={o.value}
              active={active === o.value}
              onClick={() => setActive(o.value)}
              label={o.label}
              count={counts[o.value] ?? 0}
            />
          ))}
        </div>
      )}

      <DataTable<T>
        rows={pageRows}
        getRowKey={getRowKey}
        columns={columns}
        minWidth={minWidth}
        empty={empty}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 border-t border-line px-[18px] py-3 text-small">
          <span className="text-ink-4">
            {tc("pageOf", { page: safePage, total: totalPages })}
          </span>
          <div className="flex items-center gap-2">
            <PagerButton
              label={tc("prevPage")}
              icon="chevron-left"
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
            />
            <PagerButton
              label={tc("nextPage")}
              icon="chevron-right"
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex h-[32px] w-full items-center gap-[8px] rounded-control border border-line-2 bg-surface-input px-[10px] shadow-well transition-[border-color,box-shadow] duration-[180ms] hover:border-line-3 focus-within:border-accent focus-within:bg-surface-card focus-within:shadow-[0_0_0_3px_var(--color-focus-ring)] sm:w-[230px]">
      <Icon name="search" size={15} className="flex-none text-ink-3" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 border-none bg-transparent font-sans text-[14px] text-ink outline-none placeholder:text-ink-4"
      />
    </div>
  );
}

function FilterChip({
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
          ? "inline-flex items-center gap-[6px] rounded-control border border-accent bg-accent px-[10px] py-[5px] text-mini font-medium text-on-accent"
          : "inline-flex items-center gap-[6px] rounded-control border border-line bg-surface-card px-[10px] py-[5px] text-mini font-medium text-ink-2 transition-colors hover:bg-surface-hover hover:text-ink"
      }
    >
      {label}
      <span
        data-numeric
        className={
          active
            ? "font-mono text-micro text-on-accent/75"
            : "font-mono text-micro text-ink-4"
        }
      >
        {count}
      </span>
    </button>
  );
}

function PagerButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: "chevron-left" | "chevron-right";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-[28px] items-center justify-center rounded-control border border-line text-ink-3 transition-colors hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon name={icon} size={16} />
    </button>
  );
}
