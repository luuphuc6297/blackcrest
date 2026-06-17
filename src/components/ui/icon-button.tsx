import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Blackcrest IconButton — square, icon-only control for toolbars and dense UI.
 * Mirrors Button's variant/size system but for a single icon child. Squared
 * corners, hairline border, flat. Hover/active/press are CSS variants (no JS
 * state) so this stays a SERVER component; the `active` prop drives a
 * persistent selected fill for an engaged toolbar tool.
 *
 * Sizes: sm (28) | md (32) | lg (40). Variants: ghost (default) | secondary | primary.
 * Always pass `label` — it sets both `aria-label` and the native tooltip.
 *
 * Ported from design-reference/components/buttons/IconButton.jsx.
 */
export type IconButtonVariant = "ghost" | "secondary" | "primary";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** The icon node (e.g. <Icon name="zoom-in" size={18} />). */
  children?: React.ReactNode;
  /** Accessible label — also used as the native tooltip. Required. */
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** Persistent active/selected state (e.g. an engaged toolbar tool). */
  active?: boolean;
}

const VARIANTS: Record<IconButtonVariant, string> = {
  ghost:
    "bg-transparent text-ink-2 border-transparent hover:bg-surface-hover active:bg-surface-active",
  secondary:
    "bg-surface-1 text-ink-2 border-line-2 hover:bg-surface-hover active:bg-surface-active",
  primary:
    "bg-accent text-on-accent border-transparent hover:bg-accent-hover active:bg-surface-active",
};

const SIZES: Record<IconButtonSize, string> = {
  sm: "size-[28px]",
  md: "size-[32px]",
  lg: "size-[40px]",
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      children,
      label,
      variant = "ghost",
      size = "md",
      active = false,
      disabled = false,
      type = "button",
      className,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        disabled={disabled}
        className={cn(
          "inline-flex select-none items-center justify-center rounded-control border transition-[background-color,color] duration-[180ms]",
          SIZES[size],
          VARIANTS[variant],
          active && "bg-surface-active text-ink",
          disabled && "cursor-not-allowed opacity-45",
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
