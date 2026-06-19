import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Blackcrest Switch — 34x20 pill toggle for instant on/off settings (applies
 * immediately, no save step). Server component: the native
 * <input type="checkbox"> is the `peer` source of truth (forwardRef + ...rest,
 * parent owns state); the track + thumb are siblings animated via
 * `peer-checked` / `peer-focus-visible` variants — no JS state.
 *
 * Ported from design-reference/components/forms/Switch.jsx.
 */
export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  /** Extra classes for the outer <label> wrapper. */
  containerClassName?: string;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  function Switch(
    { label, disabled = false, id, className, containerClassName, ...rest },
    ref,
  ) {
    const reactId = React.useId();
    const swId = id ?? reactId;

    return (
      <label
        htmlFor={swId}
        className={cn(
          "inline-flex cursor-pointer items-center gap-[10px]",
          disabled && "cursor-not-allowed opacity-50",
          containerClassName,
        )}
      >
        <span className="relative h-[20px] w-[34px] flex-none">
          <input
            ref={ref}
            id={swId}
            type="checkbox"
            disabled={disabled}
            className={cn(
              "peer absolute inset-0 z-10 m-0 h-full w-full cursor-[inherit] opacity-0",
              className,
            )}
            {...rest}
          />
          <span
            className="absolute inset-0 rounded-pill bg-surface-active transition-[background-color,box-shadow] duration-[180ms] peer-checked:bg-accent peer-focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)]"
            aria-hidden
          />
          <span
            className="absolute left-[2px] top-[2px] h-[16px] w-[16px] rounded-pill bg-white shadow-[0_1px_2px_rgba(0,0,0,0.25)] transition-transform duration-[180ms] peer-checked:translate-x-[14px]"
            aria-hidden
          />
        </span>
        {label && <span className="text-regular text-ink">{label}</span>}
      </label>
    );
  },
);
