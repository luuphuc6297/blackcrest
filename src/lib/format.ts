/**
 * Vietnamese-locale formatters (blueprint CONTENT FUNDAMENTALS): dot thousands
 * separators, comma decimals, `−` for negatives, Asia/Ho_Chi_Minh dates. Pair
 * with `font-mono` + `data-numeric` so all figures use tabular numerals.
 */
const TZ = "Asia/Ho_Chi_Minh";

export function formatVND(amount: number): string {
  return "₫ " + new Intl.NumberFormat("vi-VN").format(Math.round(amount));
}

/** Compact VND for dense KPI cards: ₫ 1,28 tỷ · ₫ 320 tr. */
export function formatVNDCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "−" : "";
  if (abs >= 1e9) return `${sign}₫ ${(abs / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tỷ`;
  if (abs >= 1e6) return `${sign}₫ ${(abs / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} tr`;
  return `${sign}₫ ${abs.toLocaleString("vi-VN")}`;
}

export function formatPercent(value: number, digits = 2): string {
  const s = new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: "always",
  }).format(value);
  return s.replace("-", "−") + "%";
}

export function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatDate(
  date: Date | string | null,
  locale = "vi",
): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TZ,
  }).format(new Date(date));
}

export function formatDateTime(
  date: Date | string | null,
  locale = "vi",
): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(date));
}
