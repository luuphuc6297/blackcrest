import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/icon";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LoginForm } from "./login-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "en" ? "Sign in" : locale === "zh" ? "登录" : "Đăng nhập",
    alternates: {
      canonical: `/${locale}/login`,
      languages: {
        vi: "/vi/login",
        en: "/en/login",
        zh: "/zh/login",
        "x-default": "/vi/login",
      },
    },
  };
}

/**
 * Login screen — two columns: the credentials form (left) beside the dark
 * bg-inverse brand panel with the serif pledge (right). Mirrors the auth UI kit
 * (design-reference/ui_kits/auth). RSC shell; the form is a client island.
 */
export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { locale } = await params;
  const { callbackUrl } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <main className="grid min-h-screen grid-cols-1 bg-surface lg:grid-cols-[minmax(380px,1fr)_1.05fr]">
      {/* Form column */}
      <div className="relative flex items-center justify-center px-6 py-10 sm:px-10">
        <Link
          href="/"
          className="bc-link absolute left-6 top-6 inline-flex items-center gap-[6px] text-small font-medium text-ink-3 transition-colors hover:text-ink"
        >
          <Icon name="arrow-left" size={16} />
          {t("backToHome")}
        </Link>
        <div className="absolute right-6 top-6">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-[360px]">
          <Logo size={30} className="mb-10 lg:hidden" />
          <LoginForm locale={locale} callbackUrl={callbackUrl} />
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
            &ldquo;{t("loginPledge")}&rdquo;
          </p>
          <div className="mt-[22px] text-small text-[#8a8f98]">
            {t("panelTagline")}
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
