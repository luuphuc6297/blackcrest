"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, Input } from "@/components/ui";
import { Icon } from "@/components/icon";
import { registerAction, type AuthFormState } from "@/server/auth-actions";

const INITIAL: AuthFormState = { status: "idle" };

/**
 * Request-access form — useActionState(registerAction). Registration creates a
 * PENDING account with no auto-login (an approver promotes it first), so on
 * success we swap the form for the pending notice rather than redirecting.
 * Field-level errors come from state.fieldErrors.
 */
export function RegisterForm({ locale }: { locale: string }) {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(registerAction, INITIAL);
  const fieldErrors = state.fieldErrors ?? {};

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center text-center">
        <span className="mb-[18px] inline-flex h-[52px] w-[52px] items-center justify-center rounded-full bg-success-tint text-success">
          <Icon name="check-circle" size={26} />
        </span>
        <h1 className="text-[24px] font-semibold tracking-[-0.018em] text-ink">
          {t("requestSubmitted")}
        </h1>
        <p className="mt-[10px] text-[15px] leading-[1.5] text-ink-3">
          {t("pendingNotice")}
        </p>
        <div className="mt-[22px]">
          <Link href="/login">
            <Button variant="secondary" size="md">
              {t("loginTitle")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-[16px]">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.018em] text-ink">
          {t("registerTitle")}
        </h1>
        <p className="mt-[6px] text-[15px] text-ink-3">{t("registerSubtitle")}</p>
      </div>

      <input type="hidden" name="locale" value={locale} />

      <Input
        label={t("name")}
        name="name"
        autoComplete="name"
        required
        placeholder={t("namePlaceholder")}
        leadingIcon={<Icon name="user" size={16} />}
        error={fieldErrors.name}
      />
      <Input
        label={t("email")}
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder={t("emailPlaceholder")}
        leadingIcon={<Icon name="mail" size={16} />}
        error={fieldErrors.email}
      />
      <Input
        label={t("organization")}
        name="organization"
        autoComplete="organization"
        placeholder={t("organizationPlaceholder")}
        leadingIcon={<Icon name="building-2" size={16} />}
        error={fieldErrors.organization}
      />
      <Input
        label={t("password")}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        placeholder={t("passwordPlaceholder")}
        leadingIcon={<Icon name="lock" size={16} />}
        hint={t("passwordHint")}
        error={fieldErrors.password}
      />
      <Input
        label={t("confirmPassword")}
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        placeholder={t("confirmPasswordPlaceholder")}
        leadingIcon={<Icon name="lock" size={16} />}
        error={fieldErrors.confirmPassword}
      />

      {state.status === "error" && state.message && (
        <p
          role="alert"
          className="flex items-center gap-[7px] rounded-control border border-danger/40 bg-danger-tint px-[10px] py-[8px] text-[13px] text-danger"
        >
          <Icon name="alert-circle" size={14} />
          {state.message}
        </p>
      )}

      <Button type="submit" variant="primary" size="lg" fullWidth loading={pending}>
        {t("submitRequest")}
      </Button>

      <p className="text-center text-[13px] text-ink-3">
        {t("hasAccount")}{" "}
        <Link
          href="/login"
          className="bc-link font-medium text-ink"
        >
          {t("loginTitle")}
        </Link>
      </p>
    </form>
  );
}
