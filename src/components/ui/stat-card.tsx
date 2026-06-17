import * as React from "react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Blackcrest StatCard — a label + a mono figure, with an optional leading status
 * dot and/or a sub Badge. One standard figure size (26px) across portal + admin,
 * replacing the per-screen stat tiles.
 */
export interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Leading status dot tone (admin counts). */
  dot?: BadgeTone;
  /** Caption badge under the figure (deltas, hints). */
  sub?: React.ReactNode;
  subTone?: BadgeTone;
  className?: string;
}

const DOT_BG: Record<BadgeTone, string> = {
  neutral: "bg-ink-3",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  draft: "bg-status-draft",
  review: "bg-status-review",
  approved: "bg-status-approved",
  published: "bg-status-published",
  rejected: "bg-status-rejected",
};

export function StatCard({
  label,
  value,
  dot,
  sub,
  subTone = "neutral",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface-1 p-[18px]",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {dot && (
          <span
            aria-hidden
            className={cn("h-2 w-2 flex-none rounded-pill", DOT_BG[dot])}
          />
        )}
        <div className="text-[13px] text-ink-3">{label}</div>
      </div>
      <div
        data-numeric
        className="mt-2 whitespace-nowrap font-mono text-[26px] font-medium tabular-nums tracking-[-0.01em] text-ink"
      >
        {value}
      </div>
      {sub != null && (
        <div className="mt-[10px]">
          <Badge tone={subTone} size="sm">
            {sub}
          </Badge>
        </div>
      )}
    </div>
  );
}
