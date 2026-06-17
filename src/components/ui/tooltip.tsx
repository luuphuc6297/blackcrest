"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Blackcrest Tooltip — hover/focus hint bubble wrapping a single trigger
 * (icon buttons, truncated text). Owns its open state, so it is a CLIENT
 * component. Dark bubble with white text — fixed `#1c1d21` (the bundle uses an
 * always-dark bubble in both themes, matching macOS/system tooltip register).
 *
 * Ported from design-reference/components/feedback/Tooltip.jsx.
 */
export type TooltipSide = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  /** Tooltip text/content. */
  content: React.ReactNode;
  side?: TooltipSide;
  /** Single trigger element. */
  children: React.ReactNode;
}

const SIDES: Record<TooltipSide, string> = {
  top: "bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2",
  bottom: "top-[calc(100%+6px)] left-1/2 -translate-x-1/2",
  left: "right-[calc(100%+6px)] top-1/2 -translate-y-1/2",
  right: "left-[calc(100%+6px)] top-1/2 -translate-y-1/2",
};

export function Tooltip({ content, side = "top", children }: TooltipProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-50 whitespace-nowrap rounded-[6px] bg-[#1c1d21] px-[9px] py-[5px] font-sans text-[12px] font-medium text-white shadow-card",
            SIDES[side],
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
