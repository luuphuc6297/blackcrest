"use client";

import * as React from "react";
import { usePathname } from "@/i18n/navigation";
import { AppShell, type NavEntry } from "@/components/app-shell";
import { LanguageSwitcher } from "@/components/language-switcher";

export type ShellRoute = { prefix: string; exact?: boolean; key?: string; title: string };

/**
 * Persistent shell, rendered ONCE in the layout so the sidebar stays mounted
 * across navigations — a route change only swaps the page content (the content
 * skeleton in loading.tsx), instead of tearing down + rebuilding the whole shell
 * (the old per-page <AppShell> caused a full-shell flicker on every nav).
 *
 * Title + active nav key are derived from the URL via `routes` (titles are
 * pre-translated server-side, so this client wrapper needs no i18n). Routes that
 * match a `fullScreenPrefixes` entry (the PDF viewer /reports/[slug]) render bare
 * — no shell — preserving the full-screen reader.
 */
export function AppShellChrome({
  nav,
  user,
  footerNav,
  routes,
  fullScreenPrefixes = [],
  children,
}: {
  nav: NavEntry[];
  user: { name: string; role: string };
  footerNav?: NavEntry[];
  routes: ShellRoute[];
  fullScreenPrefixes?: string[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (fullScreenPrefixes.some((p) => pathname.startsWith(p))) {
    return <>{children}</>;
  }
  const route = routes.find((r) => (r.exact ? pathname === r.prefix : pathname.startsWith(r.prefix)));
  return (
    <AppShell
      nav={nav}
      user={user}
      footerNav={footerNav}
      activeKey={route?.key}
      title={route?.title ?? ""}
      actions={<LanguageSwitcher />}
    >
      {children}
    </AppShell>
  );
}
