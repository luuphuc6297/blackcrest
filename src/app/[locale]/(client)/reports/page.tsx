import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { listVisibleReports } from "@/lib/authz";
import { categoryName, listCategories } from "@/server/reports";
import { portalNav } from "@/lib/nav";
import { LibraryGrid } from "./library-grid";

// Gated, per-user data — never prerender/cache.
export const dynamic = "force-dynamic";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const user = session!.user;
  const userName = user.name ?? user.email ?? "Nhà đầu tư";

  const [tNav, tRoles] = await Promise.all([
    getTranslations("Nav"),
    getTranslations("Roles"),
  ]);

  // Load the full entitlement-filtered set once; the client grid filters/searches
  // it in-memory (instant, no per-click round-trips).
  const [{ items }, categories] = await Promise.all([
    listVisibleReports({ userId: user.id, role: user.role, locale, take: 200 }),
    listCategories(),
  ]);
  const categoryOptions = categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    label: categoryName(c, locale),
  }));

  return (
    <AppShell
      nav={portalNav(tNav)}
      activeKey="documents"
      user={{ name: userName, role: tRoles(user.role) }}
      title={tNav("documents")}
      actions={<LanguageSwitcher />}
    >
      <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-7">
        <LibraryGrid
          reports={items}
          categories={categoryOptions}
          locale={locale}
        />
      </div>
    </AppShell>
  );
}
