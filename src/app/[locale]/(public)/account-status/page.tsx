import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui";
import { Logo } from "@/components/logo";
import { Icon, type IconName } from "@/components/icon";

// Informational page shown after a sign-in attempt that is blocked by the
// account's STATE (awaiting approval, email not verified, suspended) — not a
// credentials error. loginAction redirects here instead of returning an inline
// form error, so the user gets a clear explanation rather than a red alert.
export const dynamic = "force-dynamic";

type Reason = "pending" | "unverified" | "suspended";

const REASONS: Record<
  Reason,
  { icon: IconName; tone: "neutral" | "danger"; titleKey: string; bodyKey: string }
> = {
  pending: {
    icon: "clock",
    tone: "neutral",
    titleKey: "accountStatusPendingTitle",
    bodyKey: "accountStatusPendingBody",
  },
  unverified: {
    icon: "mail",
    tone: "neutral",
    titleKey: "accountStatusUnverifiedTitle",
    bodyKey: "accountStatusUnverifiedBody",
  },
  suspended: {
    icon: "alert-circle",
    tone: "danger",
    titleKey: "accountStatusSuspendedTitle",
    bodyKey: "accountStatusSuspendedBody",
  },
};

export default async function AccountStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ reason?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { reason } = await searchParams;
  const t = await getTranslations("Auth");

  const key: Reason =
    reason === "unverified" || reason === "suspended" ? reason : "pending";
  const cfg = REASONS[key];

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-surface-1 px-6 py-12">
      <div className="w-full max-w-[400px] rounded-card border border-line bg-surface-card p-8 shadow-soft-lit">
        <div className="mb-6 flex justify-center">
          <Logo size={30} />
        </div>
        <div className="text-center">
          <span
            className={
              "mb-[18px] inline-flex h-[52px] w-[52px] items-center justify-center rounded-full " +
              (cfg.tone === "danger"
                ? "bg-danger-tint text-danger"
                : "bg-surface-2 text-ink-2")
            }
          >
            <Icon name={cfg.icon} size={26} />
          </span>
          <h1 className="text-title-3 font-semibold tracking-[-0.012em] text-ink">
            {t(cfg.titleKey)}
          </h1>
          <p className="mt-[10px] text-regular leading-normal text-ink-3">
            {t(cfg.bodyKey)}
          </p>
          <div className="mt-[22px]">
            <Link href="/login">
              <Button variant="primary" size="md">
                {t("verifyGoToLogin")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
