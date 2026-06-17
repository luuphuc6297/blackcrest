import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Blackcrest Card — surface container with a hairline border + soft low shadow.
 * `interactive` adds a hover lift (shadow + 1px raise) and pointer cursor for
 * clickable cards. The hover treatment is a CSS variant (not JS state), so this
 * stays a SERVER component; consumers passing onClick are themselves clients.
 * Compose header/body/footer freely, or use title/subtitle/action for the
 * common case.
 *
 * Ported from design-reference/components/data-display/Card.jsx.
 */
export interface CardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right-aligned header slot (menu, badge, link). */
  action?: React.ReactNode;
  /** Inner padding in px. @default 20 */
  padding?: number;
  /** Hover lift + pointer cursor for clickable cards. */
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    children,
    title,
    subtitle,
    action,
    padding = 20,
    interactive = false,
    className,
    style,
    ...rest
  },
  ref,
) {
  const hasHeader = title != null || action != null;
  return (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden rounded-card border border-line bg-surface shadow-soft transition-[box-shadow,transform] duration-[180ms]",
        interactive &&
          "cursor-pointer hover:-translate-y-px hover:shadow-card",
        className,
      )}
      style={style}
      {...rest}
    >
      {hasHeader && (
        <div
          className="flex items-start justify-between gap-3"
          style={{ padding: `${padding}px ${padding}px 0` }}
        >
          <div className="flex flex-col gap-[3px]">
            {title && (
              <div className="text-[18px] font-semibold tracking-[-0.012em] text-ink">
                {title}
              </div>
            )}
            {subtitle && (
              <div className="text-[13px] text-ink-3">{subtitle}</div>
            )}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding }}>{children}</div>
    </div>
  );
});
