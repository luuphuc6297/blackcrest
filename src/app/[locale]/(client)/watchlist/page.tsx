import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { portalNav } from "@/lib/nav";
import { countVisibleReportsBySymbols } from "@/lib/authz";
import { getMyWatchlist, listWatchableSymbols } from "@/server/watchlist";
import { WatchlistManager } from "./watchlist-manager";

// Per-user data — never prerender/cache.
export const dynamic = "force-dynamic";

export default async function WatchlistPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const user = session!.user;
  const userName = user.name ?? user.email ?? "Nhà đầu tư";

  const [tNav, tRoles, t] = await Promise.all([
    getTranslations("Nav"),
    getTranslations("Roles"),
    getTranslations("Watchlist"),
  ]);

  const [watched, allSymbols] = await Promise.all([
    getMyWatchlist(user.id),
    listWatchableSymbols(),
  ]);
  const counts = await countVisibleReportsBySymbols(
    user.id,
    user.role,
    watched.map((w) => w.id),
  );
  const watchedWithCounts = watched.map((w) => ({ ...w, reportCount: counts[w.id] ?? 0 }));

  return (
    <AppShell
      nav={portalNav(tNav)}
      activeKey="watchlist"
      user={{ name: userName, role: tRoles(user.role) }}
      title={tNav("watchlist")}
      actions={<LanguageSwitcher />}
    >
      <div className="mx-auto max-w-[900px] px-4 py-6 sm:px-7">
        <div className="mb-6">
          <h2 className="bc-display text-[26px] text-ink">{t("title")}</h2>
          <p className="mt-[6px] max-w-[58ch] text-small leading-relaxed text-ink-3">
            {t("description")}
          </p>
        </div>
        <WatchlistManager watched={watchedWithCounts} allSymbols={allSymbols} locale={locale} />
      </div>
    </AppShell>
  );
}
