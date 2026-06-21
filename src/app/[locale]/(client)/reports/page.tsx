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

  // "Load more" grows ?take (accumulate from the top). Clamp to a sane ceiling.
  const take = Math.min(Math.max(Number(one("take")) || 24, 24), 480);

  const { items, facets, total, hasMore, capped } = await searchReports({
    userId: user.id,
    role: user.role,
    locale,
    q: filters.q,
    reportType: csv(filters.type),
    recommendation: csv(filters.rec),
    tier: filters.tier,
    symbol: filters.symbol,
    take,
  });

  return (
    <AppShell
      nav={portalNav(tNav)}
      activeKey="documents"
      user={{ name: userName, role: tRoles(user.role) }}
      title={tNav("documents")}
      actions={<LanguageSwitcher />}
    >
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-7">
        <LibraryGrid
          items={items}
          facets={facets}
          total={total}
          capped={capped}
          hasMore={hasMore}
          shown={items.length}
          params={filters}
          locale={locale}
        />
      </div>
    </AppShell>
  );
}
