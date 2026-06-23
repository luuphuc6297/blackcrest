/**
 * Shared Prop-Indicators types + constants — NO "server-only" here so both the
 * server seam (indicators.ts) and the client dashboard can import them. All the
 * provider/fetch/cache logic lives in indicators.ts (server-only).
 */

/** A single (date, value) sample. `t` is an ISO date so the UI formats per locale. */
export type IndicatorPoint = { t: string; v: number };

/** A named time series. `key` is canonical (the UI localizes via i18n); the http
 *  driver maps the provider's field names onto these keys. */
export type IndicatorSeries = {
  key: string;
  unit?: string;
  /** "line" | "area" | "bar" — a hint the dashboard uses to pick a chart. */
  kind: "line" | "area" | "bar";
  points: IndicatorPoint[];
};

/** A headline figure (latest value + change vs the start of the window). */
export type IndicatorKpi = {
  key: string;
  value: number;
  unit?: string;
  changePct?: number;
};

export type IndicatorRange = "1M" | "3M" | "1Y";
export const INDICATOR_RANGES: IndicatorRange[] = ["1M", "3M", "1Y"];
export const RANGE_DAYS: Record<IndicatorRange, number> = { "1M": 30, "3M": 90, "1Y": 365 };

export type IndicatorDashboard = {
  /** Provider freshness timestamp (ISO). */
  asOf: string;
  /** Provider label shown in the UI ("mock" until the real API is wired). */
  source: string;
  range: IndicatorRange;
  kpis: IndicatorKpi[];
  series: IndicatorSeries[];
};
