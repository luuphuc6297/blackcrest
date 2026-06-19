"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, InlineAlert, Input, PasswordInput } from "@/components/ui";
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
        <h1 className="text-title-2 font-semibold tracking-[-0.018em] text-ink">
          {t("verifyEmailHeading")}
        </h1>
        <p className="mt-[10px] max-w-[360px] text-regular leading-normal text-ink-3">
          {state.message ?? t("pendingNotice")}
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
        <p className="mt-[6px] text-regular text-ink-3">{t("registerSubtitle")}</p>
      </div>

      <input type="hidden" name="locale" value={locale} />

      <Input
        label={t("name")}
        name="name"
        size="lg"
        autoFocus
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
        size="lg"
        autoComplete="email"
        required
        placeholder={t("emailPlaceholder")}
        leadingIcon={<Icon name="mail" size={16} />}
        error={fieldErrors.email}
      />
      <Input
        label={t("organization")}
        name="organization"
        size="lg"
        autoComplete="organization"
        placeholder={t("organizationPlaceholder")}
        leadingIcon={<Icon name="building-2" size={16} />}
        error={fieldErrors.organization}
      />
      <PasswordInput
        label={t("password")}
        name="password"
        autoComplete="new-password"
        required
        placeholder={t("passwordPlaceholder")}
        hint={t("passwordHint")}
        error={fieldErrors.password}
      />
      <PasswordInput
        label={t("confirmPassword")}
        name="confirmPassword"
        autoComplete="new-password"
        required
        placeholder={t("confirmPasswordPlaceholder")}
        error={fieldErrors.confirmPassword}
      />

      {state.status === "error" && state.message && (
        <InlineAlert>{state.message}</InlineAlert>
      )}

      <Button type="submit" variant="primary" size="lg" fullWidth loading={pending}>
        {t("submitRequest")}
      </Button>

      <p className="text-center text-small text-ink-3">
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
