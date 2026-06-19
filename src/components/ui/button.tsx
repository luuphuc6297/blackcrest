import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Blackcrest Button — institutional action control.
 * Squared corners, UPPERCASE tracked label, flat (no shadow) — the Blackstone
 * register. Hover/active are CSS variants (no JS state) so this stays a SERVER
 * component; consumers that pass onClick are themselves client components.
 *
 * Ported from design-reference/components/buttons/Button.jsx.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-on-accent border-accent hover:bg-accent-hover hover:border-accent-hover active:bg-accent-active",
  secondary:
    "bg-transparent text-ink border-ink hover:bg-accent hover:text-on-accent hover:border-accent active:bg-accent-active",
  ghost:
    "bg-transparent text-ink-2 border-transparent hover:bg-surface-hover active:bg-surface-active",
  danger:
    "bg-danger text-white border-danger hover:bg-danger-hover hover:border-danger-hover active:bg-danger-active",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-[30px] px-[14px] text-[10.5px] gap-[7px]",
  md: "h-[38px] px-5 text-[11.5px] gap-[9px]",
  lg: "h-[46px] px-7 text-[12.5px] gap-[10px]",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      variant = "primary",
      size = "md",
      leadingIcon,
      trailingIcon,
      loading = false,
      fullWidth = false,
      disabled,
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
        disabled={disabled || loading}
        className={cn(
          "inline-flex select-none items-center justify-center whitespace-nowrap rounded-control border font-sans font-semibold uppercase leading-none tracking-[0.09em] transition-[background-color,color,border-color] duration-[180ms]",
          SIZES[size],
          VARIANTS[variant],
          fullWidth && "w-full",
          (disabled || loading) && "cursor-not-allowed opacity-40",
          className,
        )}
        {...rest}
      >
        {loading && <Spinner />}
        {!loading && leadingIcon && (
          <span className="flex shrink-0">{leadingIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!loading && trailingIcon && (
          <span className="flex shrink-0">{trailingIcon}</span>
        )}
      </button>
    );
  },
);

function Spinner() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      className="animate-spin"
      aria-hidden
    >
      <circle
        cx="7"
        cy="7"
        r="5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.25"
      />
      <path
        d="M7 1.5 a5.5 5.5 0 0 1 5.5 5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
