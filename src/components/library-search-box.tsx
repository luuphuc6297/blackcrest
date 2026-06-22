"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/icon";

export type SymbolOption = { ticker: string; nameVi: string };

/** Diacritic-fold + lowercase for accent-insensitive Vietnamese matching. */
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim();

/**
 * Library search with autocomplete. Suggestions are filtered CLIENT-SIDE over the
 * preloaded symbol catalogue (~250 rows — instant, no round-trips): ticker prefix
 * or accent-insensitive name match. Picking a symbol → /reports?symbol=TICKER;
 * the always-present "search for …" row (or Enter with no highlight) → /reports?q=
 * (full-text). Keyboard: ↑/↓ to move, Enter to choose, Esc to close.
 */
export function LibrarySearchBox({
  symbols,
  locale,
}: {
  symbols: SymbolOption[];
  locale: string;
}) {
  const tc = useTranslations("Common");
  const t = useTranslations("Library");
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const boxRef = React.useRef<HTMLDivElement | null>(null);

  const matches = React.useMemo(() => {
    const f = fold(q);
    if (!f) return [];
    return symbols
      .filter((s) => s.ticker.toLowerCase().startsWith(f) || fold(s.nameVi).includes(f))
      .sort((a, b) => {
        // Ticker-prefix matches first, then alphabetical.
        const ap = a.ticker.toLowerCase().startsWith(f) ? 0 : 1;
        const bp = b.ticker.toLowerCase().startsWith(f) ? 0 : 1;
        return ap - bp || a.ticker.localeCompare(b.ticker);
      })
      .slice(0, 8);
  }, [q, symbols]);

  // Row 0 = the free-text "search for q" action; rows 1..n = symbol matches.
  const rowCount = q.trim() ? matches.length + 1 : 0;

  React.useEffect(() => setActive(0), [q]);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const goSearch = (term: string) => router.push(`/${locale}/reports?q=${encodeURIComponent(term.trim())}`);
  const goSymbol = (ticker: string) => router.push(`/${locale}/reports?symbol=${encodeURIComponent(ticker)}`);

  const choose = (idx: number) => {
    if (idx <= 0) {
      if (q.trim()) goSearch(q);
      return;
    }
    const sym = matches[idx - 1];
    if (sym) goSymbol(sym.ticker);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, rowCount - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-[8px] rounded-control border border-line-2 bg-surface-input px-[12px] shadow-well focus-within:border-accent focus-within:bg-surface-card focus-within:shadow-[0_0_0_3px_var(--color-focus-ring)]">
        <Icon name="search" size={16} className="flex-none text-ink-3" />
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          role="combobox"
          aria-expanded={open && rowCount > 0}
          aria-controls="library-suggestions"
          aria-autocomplete="list"
          placeholder={tc("searchPlaceholder")}
          aria-label={tc("search")}
          className="min-w-0 flex-1 border-none bg-transparent py-[9px] font-sans text-[15px] text-ink outline-none placeholder:text-ink-4"
        />
      </div>

      {open && rowCount > 0 && (
        <ul
          id="library-suggestions"
          role="listbox"
          className="absolute z-30 mt-1 w-full overflow-hidden rounded-card border border-line bg-surface-card py-1 shadow-soft-lit"
        >
          <li role="option" aria-selected={active === 0}>
            <button
              type="button"
              onMouseEnter={() => setActive(0)}
              onClick={() => choose(0)}
              className={
                "flex w-full items-center gap-[9px] px-[12px] py-[8px] text-left text-small " +
                (active === 0 ? "bg-surface-hover text-ink" : "text-ink-2")
              }
            >
              <Icon name="search" size={14} className="flex-none text-ink-4" />
              <span className="truncate">
                {t("searchForQuery", { q: q.trim() })}
              </span>
            </button>
          </li>
          {matches.map((s, i) => (
            <li key={s.ticker} role="option" aria-selected={active === i + 1}>
              <button
                type="button"
                onMouseEnter={() => setActive(i + 1)}
                onClick={() => choose(i + 1)}
                className={
                  "flex w-full items-center gap-[10px] px-[12px] py-[8px] text-left " +
                  (active === i + 1 ? "bg-surface-hover" : "")
                }
              >
                <span
                  data-numeric
                  className="flex-none rounded-control border border-line bg-surface-2 px-[7px] py-[2px] font-mono text-micro font-medium text-ink-2"
                >
                  {s.ticker}
                </span>
                <span className="truncate text-small text-ink-2">{s.nameVi}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
