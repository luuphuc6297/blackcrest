import * as React from "react";
import { Icon, type IconName } from "@/components/icon";
import { cn } from "@/lib/utils";

/**
 * Blackcrest EmptyState — one consistent empty treatment (icon + title + optional
 * description + action) for every list/table, replacing the ad-hoc centered text.
 */
export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon = "file-stack",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-14 text-center",
        className,
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-card border border-line bg-surface-2 text-ink-3">
        <Icon name={icon} size={20} />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-regular font-semibold text-ink">{title}</p>
        {description && (
          <p className="max-w-sm text-small text-ink-3">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
