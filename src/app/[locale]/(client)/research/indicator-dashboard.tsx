"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, Badge, StatCard } from "@/components/ui";
import { Icon } from "@/components/icon";
import type { IndicatorDashboard, IndicatorRange, IndicatorSeries } from "@/lib/indicators-types";
import { INDICATOR_RANGES } from "@/lib/indicators-types";

const fmt = (locale: string, n: number, d = 0) =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: d, minimumFractionDigits: d }).format(n);
const fmtDay = (locale: string, iso: string) =>
  new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit" }).format(new Date(iso));

export function IndicatorDashboardView({
  data,
  locale,
}: {
  data: IndicatorDashboard;
  locale: string;
}) {
  const t = useTranslations("Research");
  const seriesByKey = Object.fromEntries(data.series.map((s) => [s.key, s]));

  return (
    <div className="flex flex-col gap-6">
      {/* header: title + freshness + range toggle */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="bc-display text-[26px] text-ink">{t("title")}</h1>
          <p className="mt-[6px] max-w-[60ch] text-small leading-relaxed text-ink-3">{t("description")}</p>
        </div>
        <RangeToggle current={data.range} />
      </div>

      {data.source === "mock" && (
        <div className="flex items-center gap-[8px] rounded-control border border-warning/30 bg-warning/5 px-[12px] py-[8px] text-mini text-ink-2">
          <Icon name="info" size={14} className="flex-none text-warning" />
          {t("mockNotice")}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {data.kpis.map((k) => (
          <StatCard
            key={k.key}
            label={t(`kpi.${k.key}`)}
            value={
              <span data-numeric>
                {fmt(locale, k.value, k.key === "pe" ? 1 : k.unit ? 0 : 2)}
                {k.unit && <span className="ml-1 text-[13px] font-normal text-ink-3">{k.unit}</span>}
              </span>
            }
            sub={
              k.changePct != null
                ? `${k.changePct >= 0 ? "▲" : "▼"} ${fmt(locale, Math.abs(k.changePct), 2)}%`
                : undefined
            }
            subTone={k.changePct == null ? "neutral" : k.changePct >= 0 ? "success" : "danger"}
          />
        ))}
      </div>

      {/* VN-Index line */}
      <ChartCard title={t("series.vnindex")} unit={seriesByKey.vnindex?.unit}>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={seriesByKey.vnindex?.points} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
            <Grid />
            <Axes locale={locale} />
            <Tip locale={locale} label={t("series.vnindex")} />
            <Line
              type="monotone"
              dataKey="v"
              stroke="var(--color-accent)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Liquidity area */}
        <ChartCard title={t("series.liquidity")} unit={seriesByKey.liquidity?.unit}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={seriesByKey.liquidity?.points} margin={{ top: 8, right: 12, bottom: 0, left: -4 }}>
              <defs>
                <linearGradient id="liqFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <Grid />
              <Axes locale={locale} />
              <Tip locale={locale} label={t("series.liquidity")} unit={seriesByKey.liquidity?.unit} />
              <Area type="monotone" dataKey="v" stroke="var(--color-accent)" strokeWidth={1.5} fill="url(#liqFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Foreign net flow bars (green positive / red negative) */}
        <ChartCard title={t("series.foreignNet")} unit={seriesByKey.foreignNet?.unit}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={seriesByKey.foreignNet?.points} margin={{ top: 8, right: 12, bottom: 0, left: -4 }}>
              <Grid />
              <Axes locale={locale} />
              <Tip locale={locale} label={t("series.foreignNet")} unit={seriesByKey.foreignNet?.unit} />
              <Bar dataKey="v" radius={[2, 2, 0, 0]}>
                {(seriesByKey.foreignNet?.points ?? []).map((p, i) => (
                  <Cell key={i} fill={p.v >= 0 ? "var(--color-success)" : "var(--color-danger)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <p className="text-mini text-ink-4">
        {t("asOf", { date: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.asOf)) })}
        {" · "}
        {t("sourceLabel", { source: data.source })}
      </p>
    </div>
  );
}

function RangeToggle({ current }: { current: IndicatorRange }) {
  const t = useTranslations("Research");
  return (
    <div className="inline-flex flex-none rounded-control border border-line-2 bg-surface-card p-[3px] shadow-soft">
      {INDICATOR_RANGES.map((r) => {
        const on = r === current;
        return (
          <Link
            key={r}
            href={`/research?range=${r}`}
            scroll={false}
            className={
              "rounded-[6px] px-[12px] py-[5px] text-mini font-medium no-underline transition-colors " +
              (on ? "bg-accent text-on-accent" : "text-ink-2 hover:text-ink")
            }
          >
            {t(`range.${r}`)}
          </Link>
        );
      })}
    </div>
  );
}

function ChartCard({ title, unit, children }: { title: string; unit?: string; children: React.ReactNode }) {
  return (
    <Card padding={18}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-regular font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        {unit && (
          <Badge tone="neutral" size="sm">
            {unit}
          </Badge>
        )}
      </div>
      {children}
    </Card>
  );
}

// Shared recharts sub-elements, themed via CSS tokens (CSP allows inline styles).
function Grid() {
  return <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" vertical={false} />;
}
function Axes({ locale }: { locale: string }) {
  const tick = { fill: "var(--color-ink-4)", fontSize: 11 };
  return (
    <>
      <XAxis
        dataKey="t"
        tick={tick}
        tickLine={false}
        axisLine={{ stroke: "var(--color-line)" }}
        minTickGap={36}
        tickFormatter={(v: string) => fmtDay(locale, v)}
      />
      <YAxis tick={tick} tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => fmt(locale, v)} />
    </>
  );
}
function Tip({ locale, label, unit }: { locale: string; label: string; unit?: string }) {
  return (
    <Tooltip
      cursor={{ stroke: "var(--color-line-3)", strokeWidth: 1 }}
      contentStyle={{
        background: "var(--color-surface-card)",
        border: "1px solid var(--color-line-2)",
        borderRadius: 8,
        fontSize: 12,
        boxShadow: "var(--shadow-soft-lit)",
      }}
      labelFormatter={(v) => fmtDay(locale, String(v))}
      formatter={(value) => {
        const num = Array.isArray(value) ? Number(value[0]) : Number(value);
        return [`${fmt(locale, num, 2)}${unit ? " " + unit : ""}`, label];
      }}
    />
  );
}
