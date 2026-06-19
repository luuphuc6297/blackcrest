import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Blackcrest Select — native <select> styled to match Input, with a custom
 * chevron. Server component: forwardRef + ...rest, parent owns value. Focus
 * shows the sharp inset accent ring via `focus` variants (no JS state). Pass
 * <option> elements as children.
 *
 * Ported from design-reference/components/forms/Select.jsx.
 */
export type SelectSize = "sm" | "md" | "lg";

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label?: string;
  hint?: string;
  error?: string;
  size?: SelectSize;
  /** <option> elements. */
  children?: React.ReactNode;
  /** Extra classes for the outer container (label + field + hint). */
  containerClassName?: string;
}

const SIZES: Record<SelectSize, string> = {
  sm: "h-[28px]",
  md: "h-[32px]",
  lg: "h-[40px]",
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      label,
      hint,
      error,
      size = "md",
      disabled = false,
      required = false,
      children,
      id,
      className,
      containerClassName,
      ...rest
    },
    ref,
  ) {
    const reactId = React.useId();
    const selectId = id ?? reactId;
    const hasError = Boolean(error);
    const msgId = `${selectId}-msg`;

    return (
      <div className={cn("flex flex-col gap-[7px]", containerClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="text-micro font-semibold uppercase tracking-[0.07em] text-ink-3"
          >
            {label}
            {required && <span className="text-danger"> *</span>}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            required={required}
            aria-invalid={hasError || undefined}
            aria-describedby={hint || error ? msgId : undefined}
            className={cn(
              "h-[32px] w-full appearance-none rounded-control border py-0 pl-[10px] pr-[32px] font-sans text-regular text-ink outline-none transition-[border-color,box-shadow] duration-[180ms]",
              SIZES[size],
              hasError
                ? "border-danger focus:shadow-[0_0_0_3px_var(--color-danger-tint)]"
                : "border-line-3 shadow-well hover:border-line-3 focus:border-accent focus:bg-surface-card focus:shadow-[0_0_0_3px_var(--color-focus-ring)]",
              disabled
                ? "cursor-not-allowed bg-surface-2 opacity-60"
                : "cursor-pointer bg-surface-input",
              className,
            )}
            {...rest}
          >
            {children}
          </select>
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
            className="pointer-events-none absolute right-[10px] text-ink-3"
          >
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        {(hint || error) && (
          <span
            id={msgId}
            role={hasError ? "alert" : undefined}
            className={cn(
              "text-mini",
              hasError ? "text-danger" : "text-ink-3",
            )}
          >
            {error || hint}
          </span>
        )}
      </div>
    );
  },
);
