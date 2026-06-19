"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, Checkbox, InlineAlert, Input, PasswordInput } from "@/components/ui";
import { Icon } from "@/components/icon";
import { loginAction, type AuthFormState } from "@/server/auth-actions";

const INITIAL: AuthFormState = { status: "idle" };

/**
 * Login credentials form — useActionState(loginAction). The hidden locale field
 * tells the action where to redirect after a successful sign-in. On error the
 * action returns state.message (mapped to Vietnamese in auth-actions).
 */
export function LoginForm({
  locale,
  callbackUrl,
}: {
  locale: string;
  callbackUrl?: string;
}) {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(loginAction, INITIAL);

  return (
    <form action={formAction} className="flex w-full flex-col gap-[18px]">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.018em] text-ink">
          {t("loginTitle")}
        </h1>
        <p className="mt-[6px] text-regular text-ink-3">{t("loginSubtitle")}</p>
      </div>

      <input type="hidden" name="locale" value={locale} />
      {callbackUrl && (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      )}

      <Input
        label={t("email")}
        name="email"
        type="email"
        size="lg"
        autoFocus
        autoComplete="email"
        required
        placeholder={t("emailPlaceholder")}
        leadingIcon={<Icon name="mail" size={16} />}
      />
      <PasswordInput
        label={t("password")}
        name="password"
        autoComplete="current-password"
        required
        placeholder="••••••••"
      />

      <div className="flex items-center justify-between">
        <Checkbox name="remember" defaultChecked label={t("rememberMe")} />
      </div>

      {state.status === "error" && state.message && (
        <InlineAlert>{state.message}</InlineAlert>
      )}

      <Button type="submit" variant="primary" size="lg" fullWidth loading={pending}>
        {t("loginTitle")}
      </Button>

      <p className="text-center text-small text-ink-3">
        {t("noAccount")}{" "}
        <Link
          href="/register"
          className="bc-link font-medium text-ink"
        >
          {t("registerTitle")}
        </Link>
      </p>
    </form>
  );
}
