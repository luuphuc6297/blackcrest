"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/components/icon";
import { fold } from "@/lib/fold";
import { suggestReports, type ReportSuggestion } from "@/server/search-actions";

export type SymbolOption = { ticker: string; nameVi: string };

/** All report-type enum values — labels are localized via the ReportType
 * namespace, so the type group matches the user's language (e.g. "kết quả" →
 * "Kết quả kinh doanh"). Stable set; mirrors prisma `enum ReportType`. */
const REPORT_TYPES = [
  "EARNINGS", "RESULT", "AGM", "AGM_EXTRA", "INVESTOR_MEETING", "COMPANY",
  "COMPANY_VISIT", "INITIATION", "LISTING", "IPO", "BOND", "DROP_COVERAGE",
  "VIEW", "PHTT",
] as const;

type Flat =
  | { kind: "query" }
  | { kind: "symbol"; ticker: string; name: string }
  | { kind: "report"; slug: string; title: string; sub: string }
  | { kind: "type"; value: string; label: string };

/**
 * Booking.com-style library search: one prominent input that opens a grouped,
 * multi-column suggestion overlay (Mã chứng khoán · Báo cáo · Loại báo cáo).
 *
 * Latency-tiered: symbols (preloaded catalogue) and report types (i18n enum
 * labels) match CLIENT-SIDE and paint instantly; report TITLES come from a
 * 250ms-debounced server action (suggestReports) that honors entitlement.
 * Keyboard: ↑/↓ across all groups, Enter to choose, Esc to close. Selecting a
 * symbol → ?symbol=, a type → ?type=, a report → the viewer, free-text → ?q=.
 */
export function LibraryBookingSearch({
  symbols,
  locale,
}: {
  symbols: SymbolOption[];
  locale: string;
}) {
  const tc = useTranslations("Common");
  const t = useTranslations("Library");
  const tType = useTranslations("ReportType");
  const typeLabel = (v: string) => {
    try {
      return tType(v);
    } catch {
      return v;
    }
  };

  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [reports, setReports] = React.useState<ReportSuggestion[]>([]);
  const [pending, start] = React.useTransition();
  const boxRef = React.useRef<HTMLDivElement | null>(null);
  const seq = React.useRef(0);

  const term = q.trim();
  const f = fold(q);

  // Instant client-side groups (no round-trip).
  const symbolRows = React.useMemo(() => {
    if (!f) return [];
    return symbols
      .filter((s) => s.ticker.toLowerCase().startsWith(f) || fold(s.nameVi).includes(f))
      .sort((a, b) => {
        const ap = a.ticker.toLowerCase().startsWith(f) ? 0 : 1;
        const bp = b.ticker.toLowerCase().startsWith(f) ? 0 : 1;
        return ap - bp || a.ticker.localeCompare(b.ticker);
      })
      .slice(0, 6);
  }, [f, symbols]);

  const typeRows = React.useMemo(() => {
    if (!f) return [];
    return REPORT_TYPES.map((v) => ({ value: v, label: typeLabel(v) }))
      .filter((x) => fold(x.label).includes(f))
      .slice(0, 5);
    // typeLabel is a stable closure over t; q drives the filter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f]);

  // Debounced server fetch (report titles only) with a race guard.
  React.useEffect(() => {
    if (term.length < 2) {
      setReports([]);
      return;
    }
    const mySeq = ++seq.current;
    const id = setTimeout(() => {
      start(async () => {
        const r = await suggestReports({ q: term, locale });
        if (mySeq === seq.current) setReports(r);
      });
    }, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, locale]);

  // Flattened, ordered selectable list for keyboard navigation.
  const flat = React.useMemo<Flat[]>(() => {
    const arr: Flat[] = [];
    if (term) arr.push({ kind: "query" });
    symbolRows.forEach((s) => arr.push({ kind: "symbol", ticker: s.ticker, name: s.nameVi }));
    reports.forEach((r) =>
      arr.push({
        kind: "report",
        slug: r.slug,
        title: r.title,
        sub: [r.ticker, r.reportType ? typeLabel(r.reportType) : null].filter(Boolean).join(" · "),
      }),
    );
    typeRows.forEach((x) => arr.push({ kind: "type", value: x.value, label: x.label }));
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, symbolRows, reports, typeRows]);

  const rowCount = flat.length;
  React.useEffect(() => setActive(0), [q]);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };
  const choose = (idx: number) => {
    const item = flat[idx];
    if (!item || item.kind === "query") {
      if (term) go(`/reports?q=${encodeURIComponent(term)}`);
      return;
    }
    if (item.kind === "symbol") go(`/reports?symbol=${encodeURIComponent(item.ticker)}`);
    else if (item.kind === "report") go(`/reports/${item.slug}`);
    else if (item.kind === "type") go(`/reports?type=${encodeURIComponent(item.value)}`);
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

  // Flat-index offsets for the active highlight inside each group.
  const symStart = term ? 1 : 0;
  const repStart = symStart + symbolRows.length;
  const typeStart = repStart + reports.length;

  const hasGroups = symbolRows.length + reports.length + typeRows.length > 0;
  const showPanel = open && !!term;

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-[10px] rounded-control border border-line-2 bg-surface-input px-[14px] shadow-well focus-within:border-accent focus-within:bg-surface-card focus-within:shadow-[0_0_0_3px_var(--color-focus-ring)]">
        <Icon name="search" size={18} className="flex-none text-ink-3" />
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
          aria-expanded={showPanel}
          aria-controls="library-suggest-panel"
          aria-autocomplete="list"
          placeholder={t("searchRichPlaceholder")}
          aria-label={tc("search")}
          className="min-w-0 flex-1 border-none bg-transparent py-[12px] font-sans text-[16px] text-ink outline-none placeholder:text-ink-4"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setReports([]);
            }}
            aria-label={tc("closeMenu")}
            className="flex-none text-ink-4 transition-colors hover:text-ink"
          >
            <Icon name="x-circle" size={17} />
          </button>
        )}
      </div>

      {showPanel && (
        <div
          id="library-suggest-panel"
          role="listbox"
          aria-label={tc("search")}
          className="absolute z-30 mt-1 w-full overflow-hidden rounded-card border border-line bg-surface-card shadow-soft-lit"
        >
          {term && (
            <button
              type="button"
              role="option"
              aria-selected={active === 0}
              onMouseEnter={() => setActive(0)}
              onClick={() => choose(0)}
              className={
                "flex w-full items-center gap-[9px] border-b border-line-2 px-[14px] py-[10px] text-left text-small " +
                (active === 0 ? "bg-surface-hover text-ink" : "text-ink-2")
              }
            >
              <Icon name="search" size={14} className="flex-none text-ink-4" />
              <span className="truncate">{t("searchForQuery", { q: term })}</span>
            </button>
          )}

          {hasGroups ? (
            <div className="grid grid-cols-1 gap-x-5 gap-y-1 p-[10px] sm:grid-cols-2 lg:grid-cols-3">
              <Group title={t("groupSymbols")} labelId="lbs-group-symbols" icon="building-2" show={symbolRows.length > 0}>
                {symbolRows.map((s, i) => {
                  const idx = symStart + i;
                  return (
                    <Row key={"s" + s.ticker} active={active === idx} onEnter={() => setActive(idx)} onClick={() => choose(idx)}>
                      <span
                        data-numeric
                        className="flex-none rounded-control border border-line bg-surface-2 px-[7px] py-[2px] font-mono text-micro font-medium text-ink-2"
                      >
                        {s.ticker}
                      </span>
                      <span className="truncate text-small text-ink-2">{s.nameVi}</span>
                    </Row>
                  );
                })}
              </Group>

              <Group title={t("groupReports")} labelId="lbs-group-reports" icon="file-text" show={reports.length > 0}>
                {reports.map((r, i) => {
                  const idx = repStart + i;
                  return (
                    <Row key={"r" + r.slug} active={active === idx} onEnter={() => setActive(idx)} onClick={() => choose(idx)}>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-small text-ink">{r.title}</span>
                        {(r.ticker || r.reportType) && (
                          <span className="block truncate text-micro text-ink-4">
                            {[r.ticker, r.reportType ? typeLabel(r.reportType) : null].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </span>
                    </Row>
                  );
                })}
              </Group>

              <Group title={t("groupTypes")} labelId="lbs-group-types" icon="folder-open" show={typeRows.length > 0}>
                {typeRows.map((x, i) => {
                  const idx = typeStart + i;
                  return (
                    <Row key={"t" + x.value} active={active === idx} onEnter={() => setActive(idx)} onClick={() => choose(idx)}>
                      <span className="truncate text-small text-ink-2">{x.label}</span>
                    </Row>
                  );
                })}
              </Group>
            </div>
          ) : pending ? (
            <div className="flex items-center gap-[8px] px-[14px] py-[11px] text-small text-ink-4">
              <Icon name="refresh-cw" size={13} className="animate-spin" />
              {tc("loading")}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Group({
  title,
  labelId,
  icon,
  show,
  children,
}: {
  title: string;
  labelId: string;
  icon: IconName;
  show: boolean;
  children: React.ReactNode;
}) {
  if (!show) return null;
  return (
    <div className="min-w-0">
      <div
        id={labelId}
        className="mb-[3px] mt-[6px] flex items-center gap-[6px] px-[6px] text-[10px] font-semibold uppercase tracking-caps text-ink-4"
      >
        <Icon name={icon} size={12} className="flex-none" />
        {title}
      </div>
      {/* group → option is the WAI-ARIA "grouped listbox" pattern; aria-labelledby
          names each group so screen readers announce which section is in focus. */}
      <ul role="group" aria-labelledby={labelId} className="flex flex-col">
        {children}
      </ul>
    </div>
  );
}

function Row({
  active,
  onEnter,
  onClick,
  children,
}: {
  active: boolean;
  onEnter: () => void;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <li role="option" aria-selected={active}>
      <button
        type="button"
        onMouseEnter={onEnter}
        onClick={onClick}
        className={
          "flex w-full items-center gap-[9px] rounded-control px-[6px] py-[7px] text-left transition-colors " +
          (active ? "bg-surface-hover" : "hover:bg-surface-hover")
        }
      >
        {children}
      </button>
    </li>
  );
}
