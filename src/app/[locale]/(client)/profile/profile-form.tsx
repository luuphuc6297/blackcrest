"use client";

import * as React from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, Input, Toast } from "@/components/ui";
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
        <div className="border-b border-line px-[18px] py-4">
          <h2 className="text-[16px] font-semibold tracking-[-0.012em]">
            {t("accountInfo")}
          </h2>
        </div>
        <form action={pAction} className="flex flex-col gap-[14px] p-[18px]">
          <input type="hidden" name="locale" value={locale} />
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
            <ReadOnlyField label={t("email")} value={email} />
            <ReadOnlyField label={t("role")} value={role} />
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
            <FormError message={pState.message} />
          )}
        </form>
      </Card>

      {/* Change password */}
      <Card padding={0}>
        <div className="border-b border-line px-[18px] py-4">
          <h2 className="text-[16px] font-semibold tracking-[-0.012em]">
            {t("changePassword")}
          </h2>
          <p className="mt-1 text-[12px] text-ink-3">{t("changePasswordNote")}</p>
        </div>
        <form action={wAction} className="flex flex-col gap-[14px] p-[18px]">
          <input type="hidden" name="locale" value={locale} />
          <Input
            label={t("currentPassword")}
            name="currentPassword"
            type="password"
            required
            error={wState.fieldErrors?.currentPassword}
          />
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
            <Input
              label={t("newPassword")}
              name="newPassword"
              type="password"
              required
              error={wState.fieldErrors?.newPassword}
            />
            <Input
              label={t("confirmPassword")}
              name="confirmPassword"
              type="password"
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
            <FormError message={wState.message} />
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

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-3">
        {label}
      </span>
      <span className="flex h-9 items-center rounded-control border border-line bg-surface-2 px-3 text-[13px] text-ink-2">
        {value}
      </span>
    </div>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="flex items-center gap-[7px] rounded-control border border-danger/40 bg-danger-tint px-[10px] py-[8px] text-[13px] text-danger"
    >
      <Icon name="alert-circle" size={14} />
      {message}
    </p>
  );
}
