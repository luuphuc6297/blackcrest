import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { searchReports } from "@/lib/authz";
import { portalNav } from "@/lib/nav";
import { LibraryGrid } from "./library-grid";

// Gated, per-user data — never prerender/cache.
export const dynamic = "force-dynamic";

const csv = (v: string | undefined) => (v ? v.split(",").filter(Boolean) : undefined);

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) as string | undefined;

  const session = await auth();
  const user = session!.user;
  const userName = user.name ?? user.email ?? "Nhà đầu tư";

  const [tNav, tRoles] = await Promise.all([
    getTranslations("Nav"),
    getTranslations("Roles"),
  ]);

  const filters = {
    q: one("q"),
    type: one("type"),
    rec: one("rec"),
    tier: one("tier"),
    symbol: one("symbol"),
  };

  const { items, facets, total, nextCursor, capped } = await searchReports({
    userId: user.id,
    role: user.role,
    locale,
    q: filters.q,
    reportType: csv(filters.type),
    recommendation: csv(filters.rec),
    tier: filters.tier,
    symbol: filters.symbol,
    cursor: one("cursor"),
    take: 24,
  });

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
          items={items}
          facets={facets}
          total={total}
          capped={capped}
          nextCursor={nextCursor}
          params={filters}
          locale={locale}
        />
      </div>
    </AppShell>
  );
}
