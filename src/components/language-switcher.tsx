"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

const SHORT: Record<string, string> = { vi: "VI", en: "EN", zh: "中" };

/**
 * Locale switcher — shows the CURRENT language as a compact button; the other
 * locales live in a dropdown. URL is the source of truth (blueprint §F4); uses
 * next-intl navigation so the locale prefix is preserved on the current path.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Locale");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const select = (loc: string) => {
    setOpen(false);
    if (loc === locale) return;
    startTransition(() => router.replace(pathname, { locale: loc }));
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("label")}
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-1.5 rounded-control border border-line bg-surface px-2.5 font-mono text-[12px] font-medium uppercase tracking-[0.04em] text-ink transition-colors hover:bg-surface-hover disabled:opacity-60"
      >
        {SHORT[locale] ?? locale}
        <Icon
          name="chevron-down"
          size={14}
          className={cn(
            "text-ink-4 transition-transform duration-[180ms]",
            open && "rotate-180",
          )}
        />
      </button>

      <div
        role="listbox"
        className={cn(
          "absolute right-0 top-[calc(100%+6px)] z-50 min-w-[168px] origin-top-right overflow-hidden rounded-card border border-line bg-surface-3 py-1 shadow-stack transition-[opacity,transform] duration-[180ms] ease-signature",
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0",
        )}
      >
        {routing.locales.map((loc) => {
          const active = loc === locale;
          return (
            <button
              key={loc}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => select(loc)}
              className={cn(
                "flex w-full items-center justify-between gap-3 px-3 py-[7px] text-left text-[13px] transition-colors",
                active
                  ? "font-semibold text-ink"
                  : "font-medium text-ink-2 hover:bg-surface-hover hover:text-ink",
              )}
            >
              <span className="flex items-center gap-[10px]">
                <span className="w-5 font-mono text-[11px] uppercase text-ink-4">
                  {SHORT[loc]}
                </span>
                {t(loc)}
              </span>
              {active && (
                <Icon name="check" size={14} className="text-accent" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
