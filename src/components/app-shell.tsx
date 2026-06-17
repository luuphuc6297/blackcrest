"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Icon, type IconName } from "@/components/icon";
import { Logo } from "@/components/logo";
import { signOutAction } from "@/server/auth-actions";
import { cn } from "@/lib/utils";

/**
 * Blackcrest AppShell — shared application chrome for the Portal & Admin areas.
 * Responsive: a 240px sidebar on md+; an off-canvas drawer (hamburger + scrim)
 * below md. Nav items are locale-aware <Link>s; active state is driven by
 * `activeKey`. Client component (owns the mobile drawer state); RSC page content
 * is passed through as `children`.
 */

export interface NavLinkEntry {
  key: string;
  label: string;
  icon: IconName;
  href: string;
  badge?: React.ReactNode;
}
export interface NavSection {
  section: string;
}
export type NavEntry = NavLinkEntry | NavSection;

export interface AppShellProps {
  nav: NavEntry[];
  activeKey?: string;
  user: { name: string; role: string };
  title: string;
  actions?: React.ReactNode;
  footerNav?: NavEntry[];
  /** Where the brand logo links (home affordance). @default "/portal" */
  homeHref?: string;
  children: React.ReactNode;
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavLinkEntry;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "flex w-full items-center gap-[10px] rounded-[6px] px-[10px] py-[7px] text-left font-sans text-[15px] transition-[background-color,color] duration-[180ms]",
        active
          ? "bg-accent-tint font-semibold text-accent"
          : "font-medium text-ink-2 hover:bg-surface-hover active:bg-surface-active",
      )}
    >
      <Icon
        name={item.icon}
        size={17}
        className={active ? "text-accent" : "text-ink-3"}
      />
      <span className="flex-1">{item.label}</span>
      {item.badge != null && (
        <Badge tone={active ? "accent" : "neutral"} size="sm">
          {item.badge}
        </Badge>
      )}
    </Link>
  );
}

export function AppShell({
  nav,
  activeKey,
  user,
  title,
  actions,
  footerNav,
  homeHref = "/portal",
  children,
}: AppShellProps) {
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);
  const tc = useTranslations("Common");
  const tNav = useTranslations("Nav");

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="h-screen bg-surface font-sans text-ink md:grid md:grid-cols-[240px_1fr]">
      {/* Mobile scrim */}
      {open && (
        <button
          type="button"
          aria-label={tc("closeMenu")}
          onClick={close}
          className="fixed inset-0 z-40 bg-overlay backdrop-blur-[1px] md:hidden"
        />
      )}

      {/* Sidebar (fixed drawer on mobile, in-grid on md+) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r border-line bg-surface-1 px-[12px] py-[14px] transition-transform duration-[260ms] ease-signature md:static md:z-auto md:translate-x-0",
          open ? "translate-x-0 shadow-float md:shadow-none" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-[6px] pb-[14px] pt-[4px]">
          <Link href={homeHref} onClick={close} aria-label="Blackcrest">
            <Logo />
          </Link>
          <button
            type="button"
            aria-label={tc("closeMenu")}
            onClick={close}
            className="flex h-7 w-7 items-center justify-center rounded-control text-ink-3 hover:bg-surface-hover md:hidden"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-[2px] overflow-y-auto">
          {nav.map((item) =>
            "section" in item ? (
              <div
                key={item.section}
                className="px-[10px] pb-[6px] pt-[14px] font-sans text-[10px] font-medium uppercase tracking-[0.06em] text-ink-3"
              >
                {item.section}
              </div>
            ) : (
              <NavLink
                key={item.key}
                item={item}
                active={activeKey === item.key}
                onNavigate={close}
              />
            ),
          )}
        </nav>

        <div className="flex flex-col gap-[2px]">
          {(footerNav ?? []).map((item) =>
            "section" in item ? null : (
              <NavLink
                key={item.key}
                item={item}
                active={activeKey === item.key}
                onNavigate={close}
              />
            ),
          )}
          <div className="mt-[6px] flex items-center gap-[10px] border-t border-line px-[8px] py-[10px]">
            <Avatar name={user.name} size={30} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold">
                {user.name}
              </div>
              <div className="text-[11px] text-ink-3">{user.role}</div>
            </div>
            <form action={signOutAction} className="flex">
              <button
                type="submit"
                aria-label={tNav("signOut")}
                className="flex h-7 w-7 items-center justify-center rounded-control text-ink-4 transition-colors hover:bg-surface-hover hover:text-ink"
              >
                <Icon name="log-out" size={15} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-col overflow-hidden">
        <header className="flex h-16 flex-none items-center gap-3 border-b border-line px-4 md:px-7">
          <button
            type="button"
            aria-label={tc("openMenu")}
            onClick={() => setOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-control border border-line text-ink-2 hover:bg-surface-hover md:hidden"
          >
            <Icon name="menu" size={18} />
          </button>
          <h1 className="truncate text-[18px] font-semibold tracking-[-0.012em] md:text-[20px]">
            {title}
          </h1>
          <div className="ml-auto flex items-center gap-[10px]">{actions}</div>
        </header>
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
