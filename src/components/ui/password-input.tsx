"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Input, type InputProps } from "./input";
import { Icon } from "@/components/icon";

export type PasswordInputProps = Omit<InputProps, "type" | "trailingIcon">;

/**
 * Password field — Input preset with a leading lock icon and a trailing show/hide
 * toggle (eye / eye-off) that flips the input type. Client component (owns the
 * small reveal state). Defaults to size "lg" since it's used on auth + change-
 * password forms; pass `leadingIcon={null as any}`-style overrides via props.
 */
export function PasswordInput({
  size = "lg",
  leadingIcon,
  ...props
}: PasswordInputProps) {
  const t = useTranslations("Common");
  const [show, setShow] = React.useState(false);

  return (
    <Input
      {...props}
      type={show ? "text" : "password"}
      size={size}
      leadingIcon={leadingIcon ?? <Icon name="lock" size={16} />}
      trailingIcon={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? t("hidePassword") : t("showPassword")}
          aria-pressed={show}
          className="flex items-center justify-center rounded-[2px] text-ink-3 transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-none"
        >
          <Icon name={show ? "eye-off" : "eye"} size={16} />
        </button>
      }
    />
  );
}
