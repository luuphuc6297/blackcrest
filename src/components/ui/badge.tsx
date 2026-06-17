import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Blackcrest Badge — compact status pill. Use `tone` for semantic color and
 * `dot` to show a leading status dot. The document-workflow tones
 * (draft/review/approved/published/rejected) map to the report lifecycle.
 *
 * SERVER component — purely presentational over a native <span>; the parent
 * owns any state.
 *
 * Ported from design-reference/components/feedback/Badge.jsx.
 */
export type BadgeTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "draft"
  | "review"
  | "approved"
  | "published"
  | "rejected";

export type BadgeSize = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Semantic + workflow tones. */
  tone?: BadgeTone;
  /** Show a leading status dot. */
  dot?: boolean;
  size?: BadgeSize;
}

/** fg + bg + border per tone. Borders only on neutral/draft (hairline). */
const TONES: Record<BadgeTone, string> = {
  neutral: "text-ink-2 bg-surface-2 border-line",
  accent: "text-accent bg-accent-tint border-transparent",
  success: "text-success bg-success-tint border-transparent",
  warning: "text-warning bg-warning-tint border-transparent",
  danger: "text-danger bg-danger-tint border-transparent",
  info: "text-info bg-info-tint border-transparent",
  // document workflow
  draft: "text-ink-3 bg-surface-2 border-line",
  review: "text-warning bg-warning-tint border-transparent",
  approved: "text-success bg-success-tint border-transparent",
  published: "text-accent bg-accent-tint border-transparent",
  rejected: "text-danger bg-danger-tint border-transparent",
};

/** Leading dot color — uses the document-status palette for workflow tones. */
const DOT_TONES: Record<BadgeTone, string> = {
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

const SIZES: Record<BadgeSize, string> = {
  sm: "px-[7px] py-[2px] text-[11px]",
  md: "px-[9px] py-[3px] text-[12px]",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge(
    { children, tone = "neutral", dot = false, size = "md", className, ...rest },
    ref,
  ) {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-[6px] whitespace-nowrap rounded-badge border font-sans font-medium leading-[1.2] transition-[background-color,color,border-color] duration-[180ms]",
          SIZES[size],
          TONES[tone],
          className,
        )}
        {...rest}
      >
        {dot && (
          <span
            aria-hidden
            className={cn(
              "h-[6px] w-[6px] flex-none rounded-pill",
              DOT_TONES[tone],
            )}
          />
        )}
        {children}
      </span>
    );
  },
);
