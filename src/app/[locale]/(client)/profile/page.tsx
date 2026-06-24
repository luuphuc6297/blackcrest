import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { adminNav, portalNav } from "@/lib/nav";
import { isStaff } from "@/lib/rbac";
import { ProfileForm } from "./profile-form";
import { AppearanceSettings } from "./appearance-settings";

// Gated, per-user — never prerender/cache.
export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSession();
  const user = session!.user;

  // Overlap the user DB read with the (in-memory) translation resolution instead
  // of running it as a serial tail after them.
  const [tNav, tRoles, tProfile, dbUser] = await Promise.all([
    getTranslations("Nav"),
    getTranslations("Roles"),
    getTranslations("Profile"),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true, organization: true },
    }),
  ]);

  const nav = isStaff(user.role) ? adminNav((k) => tNav(k)) : portalNav(tNav);

  return (
    <AppShell
      nav={nav}
      user={{ name: user.name ?? "—", role: tRoles(user.role) }}
      title={tProfile("title")}
      homeHref={isStaff(user.role) ? "/admin/reports" : "/portal"}
      actions={<LanguageSwitcher />}
    >
      <div className="mx-auto flex max-w-[680px] flex-col gap-5 px-4 py-7 sm:px-7">
        <ProfileForm
          locale={locale}
          email={dbUser?.email ?? user.email ?? ""}
          name={dbUser?.name ?? ""}
          organization={dbUser?.organization ?? ""}
          role={tRoles(user.role)}
        />
        <AppearanceSettings />
      </div>
    </AppShell>
  );
}
