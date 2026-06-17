import React from "react";

export interface TooltipProps {
  /** Tooltip text/content. */
  content: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  /** Single trigger element. */
  children: React.ReactNode;
}

/** Hover/focus hint bubble around a single trigger (icon buttons, truncated text). */
export function Tooltip(props: TooltipProps): JSX.Element;
