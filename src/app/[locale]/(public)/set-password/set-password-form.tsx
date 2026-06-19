"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, InlineAlert, PasswordInput } from "@/components/ui";
import { Icon } from "@/components/icon";
import { setPasswordAction, type AuthFormState } from "@/server/auth-actions";

const INIT: AuthFormState = { status: "idle" };

/** Invitee sets their password (accepting an admin invite). On success the
 * account is activated (APPROVED) and they're sent to the login page. */
export function SetPasswordForm({
  locale,
  token,
}: {
  locale: string;
  token: string;
}) {
  const t = useTranslations("Auth");
  const [state, action, pending] = useActionState(setPasswordAction, INIT);
  const fe = state.fieldErrors ?? {};

  if (state.status === "success") {
    return (
      <div className="text-center">
        <span className="mb-[18px] inline-flex h-[52px] w-[52px] items-center justify-center rounded-full bg-success-tint text-success">
          <Icon name="check-circle" size={26} />
        </span>
        <h1 className="text-title-3 font-semibold tracking-[-0.012em] text-ink">
          {t("setPasswordSuccessTitle")}
        </h1>
        <p className="mt-[10px] text-regular leading-normal text-ink-3">
          {state.message ?? t("setPasswordSuccess")}
        </p>
        <div className="mt-[22px]">
          <Link href="/login">
            <Button variant="primary" size="md">
              {t("verifyGoToLogin")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-title-3 font-semibold tracking-[-0.012em] text-ink">
        {t("setPasswordTitle")}
      </h1>
      <p className="mb-[18px] mt-[6px] text-regular leading-normal text-ink-3">
        {t("setPasswordSubtitle")}
      </p>
      <form action={action} className="flex flex-col gap-[14px]">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="token" value={token} />
        <PasswordInput
          label={t("setPasswordField")}
          name="password"
          autoFocus
          autoComplete="new-password"
          required
          error={fe.password}
        />
        <PasswordInput
          label={t("setPasswordConfirm")}
          name="confirmPassword"
          autoComplete="new-password"
          required
          error={fe.confirmPassword}
        />
        {state.status === "error" && state.message && (
          <InlineAlert>{state.message}</InlineAlert>
        )}
        <Button type="submit" variant="primary" size="lg" fullWidth loading={pending}>
          {t("setPasswordSubmit")}
        </Button>
      </form>
    </>
  );
}
