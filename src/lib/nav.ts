import type { NavEntry } from "@/components/app-shell";

type Translator = (key: string) => string;

/** Investor portal navigation. `t` = the "Nav" translator. */
export function portalNav(t: Translator): NavEntry[] {
  return [
    { key: "overview", label: t("overview"), icon: "layout-grid", href: "/portal" },
    { key: "documents", label: t("documents"), icon: "file-stack", href: "/reports" },
    { key: "research", label: t("research"), icon: "bar-chart-3", href: "/research" },
    { key: "watchlist", label: t("watchlist"), icon: "bell", href: "/watchlist" },
  ];
}

/** Admin navigation (staff). */
export function adminNav(t: Translator): NavEntry[] {
  return [
    { section: t("admin") },
    { key: "reports", label: t("reports"), icon: "file-stack", href: "/admin/reports" },
    { key: "accounts", label: t("accounts"), icon: "users", href: "/admin/accounts" },
    { key: "entitlements", label: t("entitlements"), icon: "shield-check", href: "/admin/entitlements" },
    { key: "audit", label: t("audit"), icon: "history", href: "/admin/audit" },
  ];
}
