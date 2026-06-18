import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { adminNav, portalNav } from "@/lib/nav";
import { isStaff } from "@/lib/rbac";
import { ProfileForm } from "./profile-form";

// Gated, per-user — never prerender/cache.
export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const user = session!.user;

  const [tNav, tRoles] = await Promise.all([
    getTranslations("Nav"),
    getTranslations("Roles"),
  ]);
  const tProfile = await getTranslations("Profile");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true, organization: true },
  });

  const nav = isStaff(user.role) ? adminNav((k) => tNav(k)) : portalNav(tNav);

  return (
    <AppShell
      nav={nav}
      user={{ name: user.name ?? "—", role: tRoles(user.role) }}
      title={tProfile("title")}
      homeHref={isStaff(user.role) ? "/admin/reports" : "/portal"}
      actions={<LanguageSwitcher />}
    >
      <div className="mx-auto max-w-[680px] px-4 py-7 sm:px-7">
        <ProfileForm
          locale={locale}
          email={dbUser?.email ?? user.email ?? ""}
          name={dbUser?.name ?? ""}
          organization={dbUser?.organization ?? ""}
          role={tRoles(user.role)}
        />
      </div>
    </AppShell>
  );
}
