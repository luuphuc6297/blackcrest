"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Blackcrest Dialog — centered modal with scrim. Controlled via `open`/`onClose`.
 * Closes on Escape and click-outside. CLIENT component (owns the keydown
 * listener + scrim interaction).
 *
 * Scrim: overlay color + blur(2px), fades in. Panel pops with
 * translateY(8px) → 0 and scale(.98) → 1 on the signature curve.
 *
 * Ported from design-reference/components/feedback/Dialog.jsx.
 */
export interface DialogProps {
  open: boolean;
  onClose?: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Body content. */
  children?: React.ReactNode;
  /** Footer actions (usually Buttons), right-aligned on a level-1 bar. */
  footer?: React.ReactNode;
  /** Max width in px. @default 460 */
  width?: number;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 460,
}: DialogProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onMouseDown={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay p-5 backdrop-blur-[2px]"
      style={{ animation: "bc-fade var(--duration) var(--ease-signature)" }}
    >
      <style>
        {
          "@keyframes bc-fade{from{opacity:0}to{opacity:1}}@keyframes bc-pop{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}"
        }
      </style>
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          maxWidth: width,
          animation: "bc-pop var(--duration-slow) var(--ease-signature)",
        }}
        className="w-full overflow-hidden rounded-card-lg bg-surface-card shadow-stack-high"
      >
        <div className="flex flex-col gap-[14px] px-[22px] py-5">
          {(title || description) && (
            <div className="flex flex-col gap-[5px]">
              {title && (
                <h2 className="font-sans text-title-3 font-semibold tracking-tight text-ink">
                  {title}
                </h2>
              )}
              {description && (
                <p className="font-sans text-regular leading-normal text-ink-3">
                  {description}
                </p>
              )}
            </div>
          )}
          {children}
        </div>
        {footer && (
          <div
            className={cn(
              "flex justify-end gap-2 border-t border-line bg-surface-1 px-[22px] py-[14px]",
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
