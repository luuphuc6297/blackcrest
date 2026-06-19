import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Blackcrest Checkbox — squared 18px box with the near-black accent fill and a
 * hand-tuned tick. Server component: the native <input type="checkbox"> is the
 * source of truth (forwardRef + ...rest, parent owns state); the visual box is a
 * `peer` sibling driven entirely by `peer-checked` / `peer-focus-visible` /
 * `peer-disabled` variants — no JS state.
 *
 * Ported from design-reference/components/forms/Checkbox.jsx.
 */
export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  /** Extra classes for the outer <label> wrapper. */
  containerClassName?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox(
    { label, disabled = false, id, className, containerClassName, ...rest },
    ref,
  ) {
    const reactId = React.useId();
    const cbId = id ?? reactId;

    return (
      <label
        htmlFor={cbId}
        className={cn(
          "inline-flex cursor-pointer items-center gap-[9px]",
          disabled && "cursor-not-allowed opacity-50",
          containerClassName,
        )}
      >
        <span className="relative inline-flex h-[18px] w-[18px] flex-none items-center justify-center">
          <input
            ref={ref}
            id={cbId}
            type="checkbox"
            disabled={disabled}
            className={cn(
              "peer absolute inset-0 m-0 h-full w-full cursor-[inherit] opacity-0",
              className,
            )}
            {...rest}
          />
          <span
            className="absolute inset-0 rounded-control border-[1.5px] border-line-3 bg-surface-card transition-[background-color,border-color,box-shadow] duration-[180ms] peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)]"
            aria-hidden
          />
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden
            className="relative opacity-0 transition-opacity duration-[180ms] peer-checked:opacity-100"
          >
            <path
              d="M2.5 6.2l2.2 2.2 4.8-4.8"
              stroke="#fff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        {label && <span className="text-regular text-ink">{label}</span>}
      </label>
    );
  },
);
