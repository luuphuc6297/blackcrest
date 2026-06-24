"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/skeleton";
import type { IndicatorDashboard } from "@/lib/indicators-types";

/**
 * Client boundary that code-splits the recharts-heavy dashboard off the /research
 * first-load JS. recharts + its d3 sub-packages (~90–130KB gz) are the single
 * largest dependency on this route and cannot meaningfully SSR (ResponsiveContainer
 * measures the DOM), so `ssr: false` is the correct split — they load only after
 * the route mounts, behind a skeleton. `next/dynamic({ ssr: false })` must live in
 * a Client Component, which is why this thin wrapper exists.
 */
const IndicatorDashboardView = dynamic(
  () => import("./indicator-dashboard").then((m) => m.IndicatorDashboardView),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col gap-6">
        <div className="flex items-end justify-between gap-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    ),
  },
);

export function IndicatorDashboard(props: {
  data: IndicatorDashboard;
  locale: string;
}) {
  return <IndicatorDashboardView {...props} />;
}
