import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Blackcrest Avatar — image or auto-colored initials from `name`.
 * Monochrome system: when no image, the background is a deterministic charcoal
 * tone derived from the name; initials are rendered in white. Rounded-pill,
 * fixed square box. Purely presentational → SERVER component (no state).
 *
 * Ported from design-reference/components/data-display/Avatar.jsx.
 */
export interface AvatarProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color"> {
  /** Full name — used for initials and the deterministic background color. */
  name?: string;
  /** Image URL; falls back to initials if absent. */
  src?: string;
  /** Pixel diameter. @default 32 */
  size?: number;
  /** Override the auto background color. */
  tone?: string;
}

/** Deterministic charcoal palette (monochrome system). */
const PALETTE = ["#16181d", "#3c4149", "#555a63", "#6a6f78", "#2a2d33", "#454952"];

export function Avatar({
  name = "",
  src,
  size = 32,
  tone,
  className,
  style,
  ...rest
}: AvatarProps) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const bg = tone || PALETTE[hash % PALETTE.length];
  const fontSize = Math.round(size * 0.4);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-pill font-sans font-semibold tracking-[-0.01em] text-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize,
        background: src ? "var(--color-bg-level-2)" : bg,
        ...style,
      }}
      {...rest}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        initials || "?"
      )}
    </span>
  );
}
