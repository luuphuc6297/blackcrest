import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui";
import { Logo } from "@/components/logo";
import { Icon } from "@/components/icon";
import { verifyInviteToken } from "@/lib/email-token";
import { SetPasswordForm } from "./set-password-form";

// Invite acceptance (set password). Pre-checks the token so an invalid/expired
// link shows a clear message instead of an empty form. Never prerender/cache.
export const dynamic = "force-dynamic";

export default async function SetPasswordPage({
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

  const userId = token ? await verifyInviteToken(token) : null;

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-surface-1 px-6 py-12">
      <div className="w-full max-w-[400px] rounded-card border border-line bg-surface-card p-8 shadow-soft-lit">
        <div className="mb-6 flex justify-center">
          <Logo size={30} />
        </div>
        {userId && token ? (
          <SetPasswordForm locale={locale} token={token} />
        ) : (
          <div className="text-center">
            <span className="mb-[18px] inline-flex h-[52px] w-[52px] items-center justify-center rounded-full bg-danger-tint text-danger">
              <Icon name="alert-circle" size={26} />
            </span>
            <h1 className="text-title-3 font-semibold tracking-[-0.012em] text-ink">
              {t("setPasswordInvalid")}
            </h1>
            <p className="mt-[10px] text-regular leading-normal text-ink-3">
              {t("setPasswordInvalidBody")}
            </p>
            <div className="mt-[22px]">
              <Link href="/login">
                <Button variant="primary" size="md">
                  {t("verifyGoToLogin")}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
