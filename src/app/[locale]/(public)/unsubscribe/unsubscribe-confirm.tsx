"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui";
import { Logo } from "@/components/logo";
import { Icon } from "@/components/icon";
import { confirmUnsubscribe } from "@/server/unsubscribe-actions";

/**
 * One-click unsubscribe confirmation (F2). Renders the same centered card as the
 * verify-email page. Three states: invalid token, confirm (button → POST action),
 * and done (also the entry state when the user was already unsubscribed).
 */
export function UnsubscribeConfirm({
  token,
  email,
  valid,
  alreadyOff,
}: {
  token: string;
  email: string;
  valid: boolean;
  alreadyOff: boolean;
}) {
  const t = useTranslations("Unsubscribe");
  const [done, setDone] = React.useState(alreadyOff);
  const [pending, start] = React.useTransition();

  const onConfirm = () =>
    start(async () => {
      const r = await confirmUnsubscribe(token);
      if (r.ok) setDone(true);
    });

  const shell = (
    icon: { name: "check-circle" | "alert-circle" | "bell"; ok: boolean },
    title: string,
    body: string,
    action: React.ReactNode,
  ) => (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-surface-1 px-6 py-12">
      <div className="w-full max-w-[400px] rounded-card border border-line bg-surface-card p-8 text-center shadow-soft-lit">
        <div className="mb-6 flex justify-center">
          <Logo size={30} />
        </div>
        <span
          className={
            "mb-[18px] inline-flex h-[52px] w-[52px] items-center justify-center rounded-full " +
            (icon.ok ? "bg-success-tint text-success" : "bg-surface-2 text-ink-3")
          }
        >
          <Icon name={icon.name} size={26} />
        </span>
        <h1 className="text-title-3 font-semibold tracking-[-0.012em] text-ink">{title}</h1>
        <p className="mt-[10px] text-regular leading-normal text-ink-3">{body}</p>
        <div className="mt-[22px]">{action}</div>
      </div>
    </main>
  );

  const homeLink = (
    <Link href="/login">
      <Button variant="secondary" size="md">
        {t("backHome")}
      </Button>
    </Link>
  );

  if (!valid) {
    return shell(
      { name: "alert-circle", ok: false },
      t("invalidTitle"),
      t("invalidBody"),
      homeLink,
    );
  }
  if (done) {
    return shell(
      { name: "check-circle", ok: true },
      t("doneTitle"),
      t("doneBody", { email }),
      homeLink,
    );
  }
  return shell(
    { name: "bell", ok: false },
    t("confirmTitle"),
    t("confirmBody", { email }),
    <Button variant="primary" size="md" onClick={onConfirm} loading={pending}>
      {t("confirmButton")}
    </Button>,
  );
}
