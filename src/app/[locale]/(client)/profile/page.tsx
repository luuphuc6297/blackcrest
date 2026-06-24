import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSession } from "@/auth";
import { prisma } from "@/lib/prisma";
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
  const [tRoles, dbUser] = await Promise.all([
    getTranslations("Roles"),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true, organization: true },
    }),
  ]);

  return (
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
  );
}
