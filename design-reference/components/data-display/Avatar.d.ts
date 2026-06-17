import React from "react";

export interface AvatarProps {
  /** Full name — used for initials and the deterministic background color. */
  name?: string;
  /** Image URL; falls back to initials if absent. */
  src?: string;
  /** Pixel diameter. @default 32 */
  size?: number;
  /** Override the auto background color. */
  tone?: string;
  style?: React.CSSProperties;
}

/** Circular avatar — image or auto-colored initials from the name. */
export function Avatar(props: AvatarProps): JSX.Element;
