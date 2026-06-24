/**
 * Locale-aware formatters (vi/en/zh). Numbers/dates use Intl with the right
 * BCP-47 tag per locale; the currency stays VND (₫) everywhere — only the
 * grouping and the compact scale word localize (tỷ/tr · B/M · 亿/万). Pair with
 * `font-mono` + `data-numeric` so figures use tabular numerals.
 */
const TZ = "Asia/Ho_Chi_Minh";

const INTL_LOCALE: Record<string, string> = {
  vi: "vi-VN",
  en: "en-US",
  zh: "zh-CN",
};

function intl(locale: string): string {
  return INTL_LOCALE[locale] ?? INTL_LOCALE.vi;
}

// Intl.NumberFormat/DateTimeFormat construction is expensive (loads ICU data) and
// these run per-row in re-rendering client tables (reports/accounts/audit) — sorting
// or filtering an N-row table otherwise builds N fresh formatters every render.
// Cache by (locale, options); the key space is tiny (3 locales × a few option sets),
// so the Maps are effectively bounded.
const nfCache = new Map<string, Intl.NumberFormat>();
function nf(locale: string, opts?: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = intl(locale) + "|" + (opts ? JSON.stringify(opts) : "");
  let f = nfCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(intl(locale), opts);
    nfCache.set(key, f);
  }
  return f;
}

const dtfCache = new Map<string, Intl.DateTimeFormat>();
function dtf(locale: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = intl(locale) + "|" + JSON.stringify(opts);
  let f = dtfCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(intl(locale), opts);
    dtfCache.set(key, f);
  }
  return f;
}

export function formatVND(amount: number, locale = "vi"): string {
  return "₫ " + nf(locale).format(Math.round(amount));
}

/** Compact VND for dense KPI cards. ₫ stays; scale word follows the locale. */
export function formatVNDCompact(amount: number, locale = "vi"): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "−" : "";
  const L = intl(locale);
  if (locale === "zh") {
    if (abs >= 1e8) return `${sign}₫ ${(abs / 1e8).toLocaleString(L, { maximumFractionDigits: 2 })}亿`;
    if (abs >= 1e4) return `${sign}₫ ${(abs / 1e4).toLocaleString(L, { maximumFractionDigits: 0 })}万`;
  } else if (locale === "en") {
    if (abs >= 1e9) return `${sign}₫ ${(abs / 1e9).toLocaleString(L, { maximumFractionDigits: 2 })}B`;
    if (abs >= 1e6) return `${sign}₫ ${(abs / 1e6).toLocaleString(L, { maximumFractionDigits: 0 })}M`;
  } else {
    if (abs >= 1e9) return `${sign}₫ ${(abs / 1e9).toLocaleString(L, { maximumFractionDigits: 2 })} tỷ`;
    if (abs >= 1e6) return `${sign}₫ ${(abs / 1e6).toLocaleString(L, { maximumFractionDigits: 0 })} tr`;
  }
  return `${sign}₫ ${abs.toLocaleString(L)}`;
}

export function formatPercent(value: number, locale = "vi", digits = 2): string {
  const s = nf(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: "always",
  }).format(value);
  return s.replace("-", "−") + "%";
}

export function formatNumber(value: number, locale = "vi", digits = 2): string {
  return nf(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatDate(date: Date | string | null, locale = "vi"): string {
  if (!date) return "—";
  return dtf(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TZ,
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string | null, locale = "vi"): string {
  if (!date) return "—";
  return dtf(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(date));
}
