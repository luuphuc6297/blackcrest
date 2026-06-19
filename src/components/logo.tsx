import { cn } from "@/lib/utils";

/**
 * Blackcrest brand lockup — a layered "crest" peak in a near-black tile, with an
 * optional serif wordmark. Mirrors the in-app lockup from the design bundle
 * (AppShell). The crest geometry is the brand mark; do not redraw it.
 */
export interface LogoProps {
  variant?: "full" | "mark";
  /** Tile size in px. */
  size?: number;
  className?: string;
}

export function Logo({ variant = "full", size = 28, className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-[9px]", className)}>
      <span
        className="flex shrink-0 items-center justify-center rounded-card bg-accent"
        style={{ width: size, height: size }}
      >
        <svg
          width={size * 0.6}
          height={size * 0.6}
          viewBox="0 0 64 64"
          fill="none"
          aria-hidden
        >
          <path
            d="M16 39 L32 21 L48 39"
            stroke="var(--color-text-on-accent)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M20.5 46.5 L32 33.5 L43.5 46.5"
            stroke="var(--color-text-on-accent)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.62"
          />
        </svg>
      </span>
      {variant === "full" && (
        <span
          className="font-serif font-semibold tracking-tight text-ink"
          style={{ fontSize: Math.round(size * 0.68) }}
        >
          Blackcrest
        </span>
      )}
    </div>
  );
}
