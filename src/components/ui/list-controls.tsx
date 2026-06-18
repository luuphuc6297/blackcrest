"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/icon";

/**
 * URL-param list controls (search / filter / pagination). State lives in the
 * query string so the server pages stay server-rendered (the DataTable keeps its
 * cell render functions) and the data layer filters/paginates per request.
 * usePathname() already carries the locale prefix, so pushes preserve locale.
 */
function useQueryPush() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return React.useCallback(
    (mutate: (p: URLSearchParams) => void, opts?: { replace?: boolean }) => {
      const next = new URLSearchParams(params.toString());
      mutate(next);
      const qs = next.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      if (opts?.replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [router, pathname, params],
  );
}

/** Debounced search box bound to a query param (default `q`). */
export function SearchBox({
  paramKey = "q",
  placeholder,
  className,
}: {
  paramKey?: string;
  placeholder?: string;
  className?: string;
}) {
  const params = useSearchParams();
  const push = useQueryPush();
  const tc = useTranslations("Common");
  const [value, setValue] = React.useState(params.get(paramKey) ?? "");

  React.useEffect(() => {
    const id = setTimeout(() => {
      push((p) => {
        if (value) p.set(paramKey, value);
        else p.delete(paramKey);
        p.delete("page");
      }, { replace: true });
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={"relative " + (className ?? "")}>
      <Icon
        name="search"
        size={15}
        className="pointer-events-none absolute left-[10px] top-1/2 -translate-y-1/2 text-ink-4"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder ?? tc("searchPlaceholder")}
        aria-label={tc("search")}
        className="h-9 w-full rounded-control border border-line-2 bg-surface pl-[30px] pr-3 text-[13px] text-ink placeholder:text-ink-4 transition-colors hover:border-line-3 focus:border-accent focus:outline-none"
      />
    </div>
  );
}

/** Filter chips bound to a query param; the first chip clears it (= All). */
export function FilterTabs({
  paramKey,
  options,
  allLabel,
}: {
  paramKey: string;
  options: { value: string; label: string }[];
  allLabel?: string;
}) {
  const params = useSearchParams();
  const push = useQueryPush();
  const tc = useTranslations("Common");
  const current = params.get(paramKey);

  const set = (val: string | null) =>
    push((p) => {
      if (val) p.set(paramKey, val);
      else p.delete(paramKey);
      p.delete("page");
    });

  const chip = (active: boolean) =>
    active
      ? "rounded-control border border-accent bg-accent px-[11px] py-[5px] text-[12px] font-medium text-on-accent"
      : "rounded-control border border-line bg-surface px-[11px] py-[5px] text-[12px] font-medium text-ink-2 transition-colors hover:bg-surface-hover hover:text-ink";

  return (
    <div className="flex flex-wrap items-center gap-[6px]">
      <button type="button" onClick={() => set(null)} className={chip(!current)}>
        {allLabel ?? tc("all")}
      </button>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => set(o.value)}
          className={chip(current === o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Prev/next pager bound to the `page` query param (1-based). */
export function Pagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  const push = useQueryPush();
  const tc = useTranslations("Common");
  if (totalPages <= 1) return null;

  const go = (p: number) =>
    push((q) => {
      if (p <= 1) q.delete("page");
      else q.set("page", String(p));
    });

  const btn =
    "flex h-8 w-8 items-center justify-center rounded-control border border-line text-ink-2 transition-colors hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex items-center justify-end gap-2 pt-4 text-[13px]">
      <button
        type="button"
        aria-label={tc("prevPage")}
        disabled={page <= 1}
        onClick={() => go(page - 1)}
        className={btn}
      >
        <Icon name="chevron-left" size={16} />
      </button>
      <span data-numeric className="font-mono text-ink-3">
        {tc("pageOf", { page, total: totalPages })}
      </span>
      <button
        type="button"
        aria-label={tc("nextPage")}
        disabled={page >= totalPages}
        onClick={() => go(page + 1)}
        className={btn}
      >
        <Icon name="chevron-right" size={16} />
      </button>
    </div>
  );
}
