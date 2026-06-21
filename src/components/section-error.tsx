"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";

/**
 * Contained, calm error panel for a route GROUP (admin / client). Rendered by the
 * group-level error.tsx so a runtime fault in one page becomes a recoverable card
 * ("try again") instead of the full-screen brand takeover at the root boundary.
 * Surfaces the digest as a support-traceable code + a contact link.
 */
export function SectionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    console.error(error);
  }, [error]);

  // For an error thrown in a Server Component, reset() alone re-renders the same
  // failed RSC payload → the error repeats and "try again" looks dead. Refresh the
  // server tree FIRST (fetches a fresh payload), then clear the boundary.
  const retry = () => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <div className="flex min-h-[70dvh] items-center justify-center px-6 py-12">
      <div className="w-full max-w-[460px] rounded-card border border-line bg-surface-card p-8 text-center shadow-soft-lit">
        <span className="mb-[18px] inline-flex h-[52px] w-[52px] items-center justify-center rounded-full bg-danger-tint text-danger">
          <Icon name="alert-triangle" size={26} />
        </span>
        <h1 className="text-title-3 font-semibold tracking-[-0.012em] text-ink">
          {t("sectionErrorTitle")}
        </h1>
        <p className="mt-[10px] text-regular leading-normal text-ink-3">
          {t("sectionErrorDesc")}
        </p>
        <div className="mt-[22px] flex justify-center">
          <Button
            variant="primary"
            onClick={retry}
            loading={pending}
            leadingIcon={<Icon name="refresh-cw" size={16} />}
          >
            {t("retry")}
          </Button>
        </div>
        {error.digest && (
          <p
            data-numeric
            className="mt-[18px] border-t border-line pt-[14px] font-mono text-mini text-ink-4"
          >
            {t("errorCode")}: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
