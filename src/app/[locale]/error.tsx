"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Errors");
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-surface px-6 text-center">
      <Logo size={34} />
      <div className="flex flex-col items-center gap-3">
        <span className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">
          {t("systemError")}
        </span>
        <h1 className="font-serif text-[34px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink">
          {t("errorTitle")}
        </h1>
        <p className="max-w-md text-[15px] text-ink-2">{t("errorDesc")}</p>
      </div>
      <Button
        variant="primary"
        onClick={reset}
        leadingIcon={<Icon name="refresh-cw" size={16} />}
      >
        {t("retry")}
      </Button>
    </div>
  );
}
