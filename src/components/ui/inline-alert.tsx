import * as React from "react";
import { Icon, type IconName } from "@/components/icon";
import { cn } from "@/lib/utils";

/**
 * Blackcrest InlineAlert — a hairline tinted notice for inline form feedback
 * (validation errors, success notes). Squared, low-emphasis; `role="alert"` so
 * screen readers announce it. Replaces the danger-box markup that was copy-pasted
 * across login/register/profile/upload forms.
 */
export type InlineAlertTone = "danger" | "success" | "warning";

const TONES: Record<InlineAlertTone, { box: string; icon: IconName }> = {
  danger: { box: "border-danger/40 bg-danger-tint text-danger", icon: "alert-circle" },
  success: { box: "border-success/40 bg-success-tint text-success", icon: "check-circle" },
  warning: { box: "border-warning/40 bg-warning-tint text-warning", icon: "alert-triangle" },
};

export interface InlineAlertProps
  extends React.HTMLAttributes<HTMLParagraphElement> {
  tone?: InlineAlertTone;
  /** Override the tone's default icon, or pass `null` to omit it. */
  icon?: IconName | null;
}

export function InlineAlert({
  tone = "danger",
  icon,
  children,
  className,
  ...rest
}: InlineAlertProps) {
  const preset = TONES[tone];
  const iconName = icon === null ? null : (icon ?? preset.icon);
  return (
    <p
      role="alert"
      className={cn(
        "flex items-center gap-[7px] rounded-control border px-[10px] py-[8px] text-small",
        preset.box,
        className,
      )}
      {...rest}
    >
      {iconName && <Icon name={iconName} size={14} className="flex-none" />}
      {children}
    </p>
  );
}
