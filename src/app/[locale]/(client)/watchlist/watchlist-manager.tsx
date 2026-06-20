"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/icon";
import { Card, EmptyState } from "@/components/ui";
import { setWatch } from "@/server/watchlist-actions";

type Sym = {
  id: string;
  ticker: string;
  nameVi: string;
  nameEn: string | null;
  nameZh: string | null;
};
type Watched = Sym & { reportCount: number };

/**
 * Watchlist management (F2): an add-picker (client-filtered over the preloaded
 * active-symbol catalogue — instant, no round-trips) + the watched list with a
 * per-row remove. Mutations go through the setWatch server action, which
 * revalidates this page so the server-rendered list reflects the change.
 */
export function WatchlistManager({
  watched,
  allSymbols,
  locale,
}: {
  watched: Watched[];
  allSymbols: Sym[];
  locale: string;
}) {
  const t = useTranslations("Watchlist");
  const [pending, start] = React.useTransition();
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const pickerRef = React.useRef<HTMLDivElement | null>(null);

  // Dismiss the suggestion list on outside-click / Escape (mirrors the
  // language-switcher pattern) — typing alone shouldn't trap a stale list open.
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const name = (s: Sym) =>
    locale === "en" ? s.nameEn ?? s.nameVi : locale === "zh" ? s.nameZh ?? s.nameVi : s.nameVi;

  const watchedIds = new Set(watched.map((w) => w.id));
  const term = q.trim().toUpperCase();
  const matches = term
    ? allSymbols
        .filter(
          (s) =>
            !watchedIds.has(s.id) &&
            (s.ticker.includes(term) || name(s).toUpperCase().includes(term)),
        )
        .slice(0, 8)
    : [];
  const showList = open && term.length > 0;

  const act = (symbolId: string, watching: boolean) => {
    setBusyId(symbolId);
    start(async () => {
      await setWatch({ symbolId, watching });
      setBusyId(null);
      if (watching) {
        setQ("");
        setOpen(false);
      }
    });
  };

  return (
    <>
      {/* Add picker */}
      <div className="mb-6">
        <label htmlFor="wl-add" className="mb-[6px] block text-mini font-medium text-ink-2">
          {t("addLabel")}
        </label>
        <div ref={pickerRef} className="relative max-w-[420px]">
          <div className="flex h-[38px] items-center gap-[8px] rounded-control border border-line-2 bg-surface-input px-[10px] shadow-well focus-within:border-accent focus-within:bg-surface-card focus-within:shadow-[0_0_0_3px_var(--color-focus-ring)]">
            <Icon name="search" size={15} className="flex-none text-ink-3" />
            <input
              id="wl-add"
              type="search"
              role="combobox"
              aria-expanded={showList}
              aria-controls="wl-results"
              aria-autocomplete="list"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder={t("addPlaceholder")}
              autoComplete="off"
              className="min-w-0 flex-1 border-none bg-transparent font-sans text-[14px] text-ink outline-none placeholder:text-ink-4"
            />
          </div>
          {showList && (
            <div
              id="wl-results"
              role="listbox"
              className="absolute z-20 mt-1 w-full overflow-hidden rounded-card border border-line bg-surface-card shadow-card"
            >
              {matches.length === 0 ? (
                <p className="px-3 py-[9px] text-mini text-ink-3">{t("noMatches")}</p>
              ) : (
                matches.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    disabled={pending}
                    onClick={() => act(s.id, true)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-[9px] text-left transition-colors hover:bg-surface-hover disabled:opacity-60"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="font-mono text-small font-semibold text-ink">{s.ticker}</span>
                      <span className="truncate text-mini text-ink-3">{name(s)}</span>
                    </span>
                    <Icon name="bell" size={14} className="flex-none text-ink-4" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Watched list */}
      {watched.length === 0 ? (
        <Card padding={0}>
          <EmptyState icon="bell" title={t("empty")} description={t("emptyHint")} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2">
          {watched.map((w) => (
            <Card key={w.id} padding={16} className="flex items-center justify-between gap-3">
              <Link href={`/reports?symbol=${w.ticker}`} className="group min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-regular font-semibold text-ink transition-colors group-hover:text-accent">
                    {w.ticker}
                  </span>
                  <span className="truncate text-mini text-ink-3">{name(w)}</span>
                </div>
                <div data-numeric className="mt-1 font-mono text-mini text-ink-4">
                  {t("reportCount", { n: w.reportCount })}
                </div>
              </Link>
              <button
                type="button"
                disabled={pending && busyId === w.id}
                onClick={() => act(w.id, false)}
                aria-label={t("removeFromWatchlist")}
                title={t("removeFromWatchlist")}
                className="inline-flex size-8 flex-none items-center justify-center rounded-control border border-line text-ink-3 transition-colors hover:border-danger hover:text-danger disabled:opacity-60"
              >
                <Icon name="x" size={15} />
              </button>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
