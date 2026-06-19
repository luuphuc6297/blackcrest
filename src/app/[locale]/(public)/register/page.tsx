import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Icon } from "@/components/icon";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { RegisterForm } from "./register-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("registerTitle"),
    alternates: {
      canonical: `/${locale}/register`,
      languages: {
        vi: "/vi/register",
        en: "/en/register",
        zh: "/zh/register",
        "x-default": "/vi/register",
      },
    },
  };
}

/**
 * Register ("request access") screen — same two-column composition as login. The
 * dark bg-inverse brand panel reinforces that accounts are vetted before access.
 * RSC shell; the form is a client island.
 */
export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <main className="grid min-h-screen grid-cols-1 bg-surface lg:grid-cols-[minmax(380px,1fr)_1.05fr]">
      {/* Form column */}
      <div className="relative flex items-center justify-center px-6 py-10 sm:px-10">
        <div className="absolute right-6 top-6">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-[380px]">
          <Logo size={30} className="mb-10 lg:hidden" />
          <RegisterForm locale={locale} />
        </div>
      </div>

      {/* Brand panel — dark, editorial */}
      <aside className="relative hidden flex-col justify-between bg-inverse px-11 pb-10 pt-11 text-on-accent lg:flex">
        <div className="flex items-center gap-[10px]">
          <span className="flex h-8 w-8 items-center justify-center rounded-card bg-white/10">
            <svg width="20" height="20" viewBox="0 0 64 64" fill="none" aria-hidden>
              <path
                d="M16 39 L32 21 L48 39"
                stroke="#fff"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M20.5 46.5 L32 33.5 L43.5 46.5"
                stroke="#fff"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.62"
              />
            </svg>
          </span>
          <span className="font-serif text-[22px] font-semibold">Blackcrest</span>
        </div>

        <div>
          <p className="font-serif text-[27px] font-medium leading-[1.35] tracking-[-0.01em] text-[#f7f8f8]">
            &ldquo;{t("registerPledge")}&rdquo;
          </p>
          <div className="mt-[22px] text-small text-[#8a8f98]">
            {t("registerSubtitle")}
          </div>
        </div>

        <div className="flex gap-[18px] text-small text-[#8a8f98]">
          <span className="inline-flex items-center gap-[6px]">
            <Icon name="shield-check" size={14} />
            {t("badgeEncryption")}
          </span>
          <span className="inline-flex items-center gap-[6px]">
            <Icon name="lock" size={14} />
            {t("badgeSoc2")}
          </span>
        </div>
      </aside>
    </main>
  );
}
