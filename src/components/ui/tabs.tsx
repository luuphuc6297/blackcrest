"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Blackcrest Tabs — underline tab bar. Active tab gets a 2px accent underline
 * (sitting on the bar's hairline border via a -1px margin) and ink text;
 * inactive tabs are tertiary ink. Optional leading icon + count badge per item.
 * Owns the active-tab state → CLIENT component; controlled (value/onChange) or
 * uncontrolled (defaultValue).
 *
 * Ported from design-reference/components/data-display/Tabs.jsx.
 */
export interface TabItem {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Optional count chip. */
  badge?: React.ReactNode;
}

export interface TabsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}

export function Tabs({
  items = [],
  value,
  defaultValue,
  onChange,
  className,
  ...rest
}: TabsProps) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(
    defaultValue ?? items[0]?.value,
  );
  const active = isControlled ? value : internal;

  const select = (v: string) => {
    if (!isControlled) setInternal(v);
    onChange?.(v);
  };

  return (
    <div
      className={cn("flex gap-[2px] border-b border-line", className)}
      {...rest}
    >
      {items.map((it) => {
        const on = it.value === active;
        return (
          <button
            key={it.value}
            type="button"
            onClick={() => select(it.value)}
            className={cn(
              "-mb-px inline-flex cursor-pointer items-center gap-[7px] whitespace-nowrap border-b-2 bg-transparent px-3 py-[9px] font-sans text-regular font-medium transition-[color,border-color] duration-[180ms]",
              on
                ? "border-accent text-ink"
                : "border-transparent text-ink-3",
            )}
          >
            {it.icon}
            {it.label}
            {it.badge != null && (
              <span
                className={cn(
                  "rounded-pill px-[6px] py-px text-micro font-medium",
                  on
                    ? "bg-accent-tint text-accent"
                    : "bg-surface-2 text-ink-4",
                )}
              >
                {it.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
