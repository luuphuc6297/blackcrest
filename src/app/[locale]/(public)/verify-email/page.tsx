import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui";
import { Logo } from "@/components/logo";
import { Icon } from "@/components/icon";
import { prisma } from "@/lib/prisma";
import { verifyEmailToken } from "@/lib/email-token";

// Verifies a signed email link, flips the account UNVERIFIED → PENDING (idempotent),
// then shows the result. Never prerender/cache.
export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { token } = await searchParams;
  const t = await getTranslations("Auth");

  const userId = token ? await verifyEmailToken(token) : null;
  let ok = false;
  if (userId) {
    // Flip exactly once; re-clicking a still-valid link (already PENDING/APPROVED)
    // simply matches no rows and still counts as success below.
    await prisma.user.updateMany({
      where: { id: userId, status: "UNVERIFIED" },
      data: { status: "PENDING", emailVerifiedAt: new Date() },
    });
    const exists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    ok = Boolean(exists);
  }

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-surface-1 px-6 py-12">
      <div className="w-full max-w-[400px] rounded-card border border-line bg-surface-card p-8 text-center shadow-soft-lit">
        <div className="mb-6 flex justify-center">
          <Logo size={30} />
        </div>
        <span
          className={
            "mb-[18px] inline-flex h-[52px] w-[52px] items-center justify-center rounded-full " +
            (ok ? "bg-success-tint text-success" : "bg-danger-tint text-danger")
          }
        >
          <Icon name={ok ? "check-circle" : "alert-circle"} size={26} />
        </span>
        <h1 className="text-title-3 font-semibold tracking-[-0.012em] text-ink">
          {ok ? t("verifySuccessTitle") : t("verifyInvalidTitle")}
        </h1>
        <p className="mt-[10px] text-regular leading-normal text-ink-3">
          {ok ? t("verifySuccessBody") : t("verifyInvalidBody")}
        </p>
        <div className="mt-[22px]">
          <Link href="/login">
            <Button variant="primary" size="md">
              {t("verifyGoToLogin")}
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
