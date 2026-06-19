import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Blackcrest Input — institutional text field with optional UPPERCASE tracked
 * label, leading/trailing icon, hint and error. Server component: wraps a native
 * <input> (forwardRef + ...rest), so the parent owns value/state. The bundle's
 * focus useState is replaced with `focus-within` variants — sharp inset accent
 * ring, no JS.
 *
 * Ported from design-reference/components/forms/Input.jsx.
 */
export type InputSize = "sm" | "md" | "lg";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  /** Helper text below the field. */
  hint?: string;
  /** Error message — turns the border/hint red and overrides hint. */
  error?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  size?: InputSize;
  /** Extra classes for the outer container (label + field + hint). */
  containerClassName?: string;
}

const SIZES: Record<InputSize, string> = {
  sm: "h-[28px]",
  md: "h-[32px]",
  lg: "h-[40px]",
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      label,
      hint,
      error,
      leadingIcon,
      trailingIcon,
      size = "md",
      disabled = false,
      required = false,
      id,
      className,
      containerClassName,
      ...rest
    },
    ref,
  ) {
    const reactId = React.useId();
    const inputId = id ?? reactId;
    const hasError = Boolean(error);
    const msgId = `${inputId}-msg`;

    return (
      <div
        className={cn("flex flex-col gap-[7px]", containerClassName)}
      >
        {label && (
          <label
            htmlFor={inputId}
            className="text-micro font-semibold uppercase tracking-[0.07em] text-ink-3"
          >
            {label}
            {required && <span className="text-danger"> *</span>}
          </label>
        )}
        <div
          className={cn(
            "flex h-[32px] items-center gap-[8px] rounded-control border px-[10px] transition-[border-color,box-shadow] duration-[180ms]",
            SIZES[size],
            hasError
              ? "border-danger focus-within:shadow-[0_0_0_3px_var(--color-danger-tint)]"
              : "border-line-3 shadow-well hover:border-line-3 focus-within:border-accent focus-within:bg-surface-card focus-within:shadow-[0_0_0_3px_var(--color-focus-ring)]",
            disabled
              ? "bg-surface-2 opacity-60"
              : "bg-surface-input",
          )}
        >
          {leadingIcon && (
            <span className="flex text-ink-3">{leadingIcon}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            required={required}
            aria-invalid={hasError || undefined}
            aria-describedby={hint || error ? msgId : undefined}
            className={cn(
              "min-w-0 flex-1 border-none bg-transparent font-sans text-regular text-ink outline-none placeholder:text-ink-4",
              className,
            )}
            {...rest}
          />
          {trailingIcon && (
            <span className="flex text-ink-3">{trailingIcon}</span>
          )}
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
