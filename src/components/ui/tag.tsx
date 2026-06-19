import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Blackcrest Tag — neutral chip for metadata/filters/labels, optionally
 * removable. Pass `onRemove` to render a trailing remove (×) button.
 *
 * SERVER component — the trailing button calls the parent-supplied `onRemove`;
 * no internal state. Squared, hairline, level-1 fill.
 *
 * Ported from design-reference/components/feedback/Tag.jsx.
 */
export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** When provided, renders a remove (×) button that calls this. */
  onRemove?: () => void;
  leadingIcon?: React.ReactNode;
}

export const Tag = React.forwardRef<HTMLSpanElement, TagProps>(function Tag(
  { children, onRemove, leadingIcon = null, className, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-[6px] rounded-badge border border-line-2 bg-surface-1 py-[3px] pl-[9px] font-sans text-mini font-medium text-ink-2",
        onRemove ? "pr-[4px]" : "pr-[9px]",
        className,
      )}
      {...rest}
    >
      {leadingIcon}
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          className="inline-flex size-[18px] items-center justify-center rounded-[4px] leading-none text-ink-3 hover:bg-surface-hover hover:text-ink"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
            <path
              d="M3 3l6 6M9 3l-6 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </span>
  );
});
