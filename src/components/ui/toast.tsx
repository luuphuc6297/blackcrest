"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Blackcrest Toast — transient notification card. Render inside a fixed
 * positioning container (e.g. bottom-right). CLIENT component: owns an optional
 * timed auto-dismiss (pass `duration` + `onClose`). `tone` colors the icon.
 *
 * Slides up + fades in on the signature curve.
 *
 * Ported from design-reference/components/feedback/Toast.jsx.
 */
export type ToastTone = "neutral" | "success" | "warning" | "danger" | "info";

export interface ToastProps {
  open?: boolean;
  tone?: ToastTone;
  title?: React.ReactNode;
  message?: React.ReactNode;
  /** Leading icon node (Lucide/SVG), colored by tone. */
  icon?: React.ReactNode;
  onClose?: () => void;
  /** Auto-dismiss after N ms (calls onClose). Omit to keep until dismissed. */
  duration?: number;
  className?: string;
}

const TONES: Record<ToastTone, string> = {
  neutral: "text-ink",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
};

export function Toast({
  open = true,
  tone = "neutral",
  title,
  message,
  icon = null,
  onClose,
  duration,
  className,
}: ToastProps) {
  React.useEffect(() => {
    if (!open || !duration || !onClose) return;
    const id = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(id);
  }, [open, duration, onClose]);

  if (!open) return null;

  return (
    <div
      role="status"
      style={{ animation: "bc-toast var(--duration-slow) var(--ease-signature)" }}
      className={cn(
        "flex w-[360px] max-w-full items-start gap-[10px] rounded-card border border-line bg-surface px-[14px] py-[12px] shadow-float",
        className,
      )}
    >
      <style>
        {
          "@keyframes bc-toast{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}"
        }
      </style>
      {icon && (
        <span className={cn("mt-px flex flex-none", TONES[tone])}>{icon}</span>
      )}
      <div className="min-w-0 flex-1">
        {title && (
          <div className="font-sans text-[15px] font-medium text-ink">
            {title}
          </div>
        )}
        {message && (
          <div
            className={cn(
              "font-sans text-[13px] leading-[1.45] text-ink-3",
              title && "mt-[2px]",
            )}
          >
            {message}
          </div>
        )}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex flex-none p-[2px] leading-none text-ink-3 hover:text-ink-2"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <path
              d="M3.5 3.5l7 7M10.5 3.5l-7 7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
