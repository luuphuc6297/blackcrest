"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

export interface MobileMenuProps {
  /** Anchor sections rendered in the bundle nav (label only — links are in-page). */
  nav: { label: string; href: string }[];
  signInLabel: string;
  registerLabel: string;
  menuLabel: string;
}

/**
 * Marketing header — mobile disclosure. The desktop nav is a static RSC; this
 * island only owns the hamburger toggle + the dropdown panel for narrow screens.
 */
export function MobileMenu({
  nav,
  signInLabel,
  registerLabel,
  menuLabel,
}: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="xl:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-label={menuLabel}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-[28px] items-center justify-center rounded-control border border-line text-ink-3 transition-colors hover:bg-surface-hover hover:text-ink"
      >
        <Icon name={open ? "x" : "menu"} size={16} />
      </button>

      <div
        className={cn(
          "absolute inset-x-0 top-[72px] origin-top border-b border-line bg-surface-1/95 backdrop-blur-md transition-[opacity,transform] duration-[180ms] ease-signature",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0",
        )}
      >
        <nav className="flex flex-col gap-1 px-6 py-4">
          {nav.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-control px-3 py-2.5 text-[14px] font-medium text-ink-2 transition-colors hover:bg-surface-hover hover:text-ink"
            >
              {item.label}
            </a>
          ))}
          <div className="mt-3 flex flex-col gap-2 border-t border-line pt-4">
            <Link href="/login" onClick={() => setOpen(false)}>
              <Button variant="ghost" fullWidth>
                {signInLabel}
              </Button>
            </Link>
            <Link href="/register" onClick={() => setOpen(false)}>
              <Button
                variant="primary"
                fullWidth
                trailingIcon={<Icon name="arrow-right" size={16} />}
              >
                {registerLabel}
              </Button>
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}
