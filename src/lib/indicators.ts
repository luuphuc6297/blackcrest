import "server-only";
import { unstable_cache } from "next/cache";
import {
  type IndicatorDashboard,
  type IndicatorPoint,
  type IndicatorRange,
  type IndicatorSeries,
  RANGE_DAYS,
} from "@/lib/indicators-types";

/**
 * The IndicatorSource seam (blueprint §F4 "Prop Indicators"). One place where the
 * market-data provider lives, so it can be swapped wholesale without touching the
 * dashboard UI. Shared types/constants live in indicators-types.ts (client-safe);
 * everything here is server-only (fetch + cache).
 *
 * Driver is chosen by INDICATOR_DRIVER ("mock" default | "http"):
 *  - mock: deterministic, generated VN-market-style series. Lets the whole
 *    dashboard ship + be designed/reviewed before the real API exists. Data is a
 *    pure function of the day index, so it doesn't flicker between renders.
 *  - http: server-side fetch from the client's cloud API (INDICATOR_API_URL).
 *    SERVER-ONLY ON PURPOSE — the app CSP forbids browser→external calls and
 *    external images, and data-localization forbids leaking user identifiers
 *    upstream, so the browser never talks to the provider; this proxy does, and
 *    only market data (no user id) crosses the boundary. Fill in `mapUpstream`
 *    once the payload shape is known.
 *
 * Market data is GLOBAL (identical for every authenticated user), so the read is
 * wrapped in unstable_cache (revalidate 300s, tag "indicators") — one upstream
 * hit warms the cache for everyone, and it survives brief provider outages.
 */

export interface IndicatorSource {
  getDashboard(opts: { range: IndicatorRange }): Promise<IndicatorDashboard>;
}

// ── mock driver ──────────────────────────────────────────────────────────────
// A cheap deterministic PRNG (mulberry-ish) so the generated series look organic
// but are stable for a given index — no Math.random, no per-render flicker.
function noise(i: number, salt: number): number {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x) - 0.5; // ∈ [-0.5, 0.5)
}

function series(
  key: string,
  kind: IndicatorSeries["kind"],
  n: number,
  fn: (i: number) => number,
  unit?: string,
): IndicatorSeries {
  // Walk backwards from "today" so the last point is the most recent day.
  const today = new Date();
  const points: IndicatorPoint[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (n - 1 - i));
    points.push({ t: d.toISOString().slice(0, 10), v: Math.round(fn(i) * 100) / 100 });
  }
  return { key, kind, unit, points };
}

const mock: IndicatorSource = {
  async getDashboard({ range }) {
    const n = RANGE_DAYS[range];
    const vnindex = series("vnindex", "line", n, (i) => 1180 + 0.35 * i + 55 * Math.sin(i / 9) + 14 * noise(i, 1));
    const liquidity = series(
      "liquidity",
      "area",
      n,
      (i) => 17500 + 4800 * Math.sin(i / 6 + 1) + 2200 * noise(i, 2) + 12 * i,
      "tỷ ₫",
    );
    const foreignNet = series("foreignNet", "bar", n, (i) => 900 * Math.sin(i / 5) + 600 * noise(i, 3), "tỷ ₫");

    const last = (s: IndicatorSeries) => s.points[s.points.length - 1].v;
    const first = (s: IndicatorSeries) => s.points[0].v;
    const pct = (s: IndicatorSeries) => ((last(s) - first(s)) / first(s)) * 100;

    return {
      asOf: new Date().toISOString(),
      source: "mock",
      range,
      kpis: [
        { key: "vnindex", value: last(vnindex), changePct: pct(vnindex) },
        { key: "liquidity", value: last(liquidity), unit: "tỷ ₫", changePct: pct(liquidity) },
        { key: "foreignNet", value: last(foreignNet), unit: "tỷ ₫" },
        { key: "pe", value: Math.round((13 + 2 * Math.sin(n / 30)) * 10) / 10 },
      ],
      series: [vnindex, liquidity, foreignNet],
    };
  },
};

// ── http driver (real cloud API) ─────────────────────────────────────────────
const http: IndicatorSource = {
  async getDashboard({ range }) {
    const base = process.env.INDICATOR_API_URL;
    if (!base) {
      throw new Error(
        "INDICATOR_DRIVER=http but INDICATOR_API_URL is unset — set the cloud API base URL (and INDICATOR_API_KEY if required).",
      );
    }
    // SERVER → provider only. No user identifiers in the request (data-localization).
    const res = await fetch(`${base.replace(/\/$/, "")}/dashboard?range=${range}`, {
      headers: process.env.INDICATOR_API_KEY ? { authorization: `Bearer ${process.env.INDICATOR_API_KEY}` } : {},
      // Cache at the fetch layer too; the unstable_cache wrapper is the primary cache.
      next: { revalidate: 300, tags: ["indicators"] },
    });
    if (!res.ok) throw new Error(`indicator API responded ${res.status}`);
    return mapUpstream(await res.json(), range);
  },
};

/**
 * Map the provider's payload onto IndicatorDashboard. Implement once the client
 * confirms the API shape — until then the http driver is unreachable (mock is the
 * default), so this stub is never executed. Keep the canonical keys
 * (vnindex/liquidity/foreignNet/pe) so the UI + i18n stay stable across providers.
 */
function mapUpstream(_raw: unknown, range: IndicatorRange): IndicatorDashboard {
  throw new Error(
    `indicator http driver: mapUpstream() not implemented for range=${range} — wire the provider payload mapping when the API spec is available.`,
  );
}

function getIndicatorSource(): IndicatorSource {
  return process.env.INDICATOR_DRIVER === "http" ? http : mock;
}

/**
 * The cached read used by the dashboard page. Market data is global, so one cache
 * entry per range serves all users (revalidate 300s). Revalidate on demand later
 * with `revalidateTag("indicators")` if a push/webhook is added.
 */
export const getIndicatorDashboard = unstable_cache(
  async (range: IndicatorRange): Promise<IndicatorDashboard> => getIndicatorSource().getDashboard({ range }),
  ["indicator-dashboard"],
  { revalidate: 300, tags: ["indicators"] },
);
