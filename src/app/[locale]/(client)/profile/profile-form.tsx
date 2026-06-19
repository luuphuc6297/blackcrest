"use client";

import * as React from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, InlineAlert, Input, PasswordInput, Toast } from "@/components/ui";
import { Icon } from "@/components/icon";
import {
  updateProfile,
  changePassword,
  type ProfileFormState,
} from "@/server/profile-actions";

const INIT: ProfileFormState = { status: "idle" };

export function ProfileForm({
  locale,
  email,
  name,
  organization,
  role,
}: {
  locale: string;
  email: string;
  name: string;
  organization: string;
  role: string;
}) {
  const t = useTranslations("Profile");
  const [pState, pAction, pPending] = useActionState(updateProfile, INIT);
  const [wState, wAction, wPending] = useActionState(changePassword, INIT);

  return (
    <div className="flex flex-col gap-5">
      {/* Account info */}
      <Card padding={0}>
        <div className="flex items-center gap-[10px] border-b border-line px-[20px] py-[16px]">
          <Icon name="user" size={17} className="flex-none text-ink-3" />
          <h2 className="text-medium font-semibold tracking-tight">
            {t("accountInfo")}
          </h2>
        </div>
        <form action={pAction} className="flex flex-col gap-[14px] p-[20px]">
          <input type="hidden" name="locale" value={locale} />
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
            <Input label={t("email")} defaultValue={email} disabled />
            <Input label={t("role")} defaultValue={role} disabled />
          </div>
          <Input
            label={t("name")}
            name="name"
            defaultValue={name}
            required
            error={pState.fieldErrors?.name}
          />
          <Input
            label={t("organization")}
            name="organization"
            defaultValue={organization}
          />
          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={pPending}>
              {pPending ? t("saving") : t("save")}
            </Button>
          </div>
          {pState.status === "error" && pState.message && (
            <InlineAlert>{pState.message}</InlineAlert>
          )}
        </form>
      </Card>

      {/* Change password */}
      <Card padding={0}>
        <div className="flex items-start gap-[10px] border-b border-line px-[20px] py-[16px]">
          <Icon name="lock" size={17} className="mt-[2px] flex-none text-ink-3" />
          <div className="min-w-0">
            <h2 className="text-medium font-semibold tracking-tight">
              {t("changePassword")}
            </h2>
            <p className="mt-1 text-mini text-ink-3">{t("changePasswordNote")}</p>
          </div>
        </div>
        <form action={wAction} className="flex flex-col gap-[14px] p-[20px]">
          <input type="hidden" name="locale" value={locale} />
          <PasswordInput
            label={t("currentPassword")}
            name="currentPassword"
            placeholder={t("currentPasswordPlaceholder")}
            autoComplete="current-password"
            required
            error={wState.fieldErrors?.currentPassword}
          />
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
            <PasswordInput
              label={t("newPassword")}
              name="newPassword"
              placeholder={t("newPasswordPlaceholder")}
              autoComplete="new-password"
              required
              error={wState.fieldErrors?.newPassword}
            />
            <PasswordInput
              label={t("confirmPassword")}
              name="confirmPassword"
              placeholder={t("confirmPasswordPlaceholder")}
              autoComplete="new-password"
              required
              error={wState.fieldErrors?.confirmPassword}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={wPending}>
              {wPending ? t("updating") : t("updatePassword")}
            </Button>
          </div>
          {wState.status === "error" && wState.message && (
            <InlineAlert>{wState.message}</InlineAlert>
          )}
        </form>
      </Card>

      {pState.status === "success" && pState.message && (
        <div className="fixed bottom-6 right-6 z-[200]">
          <Toast
            tone="success"
            icon={<Icon name="check-circle" size={18} />}
            title={pState.message}
            duration={4000}
          />
        </div>
      )}
    </div>
  );
}
