import { getSession } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { portalNav } from "@/lib/nav";
import { isStaff } from "@/lib/rbac";
import { AppShellChrome, type ShellRoute } from "@/components/app-shell-chrome";
import type { NavEntry } from "@/components/app-shell";

// Auth-gated + per-user data → always render per request (never prerender/cache).
export const dynamic = "force-dynamic";

/**
 * Investor area guard (defense in depth — middleware also redirects, but never
 * trust it; blueprint §6.1) + the PERSISTENT shell. The sidebar lives here so it
 * stays mounted across page navigations (smooth loading: only the content swaps,
 * via each route's content-only loading.tsx). The PDF viewer (/reports/[slug])
 * opts out via fullScreenPrefixes and stays full-screen.
 */
export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session?.user) redirect({ href: "/login", locale });
  const user = session!.user;

  const [tNav, tRoles, tProfile] = await Promise.all([
    getTranslations("Nav"),
    getTranslations("Roles"),
    getTranslations("Profile"),
  ]);

  const routes: ShellRoute[] = [
    { prefix: "/portal", exact: true, key: "overview", title: tNav("overview") },
    { prefix: "/reports", exact: true, key: "documents", title: tNav("documents") },
    { prefix: "/research", key: "research", title: tNav("research") },
    { prefix: "/watchlist", key: "watchlist", title: tNav("watchlist") },
    { prefix: "/profile", key: "profile", title: tProfile("title") },
  ];

  // Staff get a link into the admin area (clients never see it).
  const footerNav: NavEntry[] | undefined = isStaff(user.role)
    ? [{ key: "admin", label: tNav("admin"), icon: "shield-check", href: "/admin/reports" }]
    : undefined;

  return (
    <AppShellChrome
      nav={portalNav(tNav)}
      user={{ name: user.name ?? user.email ?? "Nhà đầu tư", role: tRoles(user.role) }}
      footerNav={footerNav}
      routes={routes}
      fullScreenPrefixes={["/reports/"]}
    >
      {children}
    </AppShellChrome>
  );
}
