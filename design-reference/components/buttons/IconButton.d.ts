import React from "react";

export interface IconButtonProps {
  /** The icon node (Lucide <i data-lucide> or inline SVG). */
  children?: React.ReactNode;
  /** Accessible label — also used as the native tooltip. Required. */
  label: string;
  variant?: "ghost" | "secondary" | "primary";
  size?: "sm" | "md" | "lg";
  /** Persistent active/selected state (e.g. an engaged toolbar tool). */
  active?: boolean;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
}

/** Square icon-only control for toolbars, table rows and dense chrome. */
export function IconButton(props: IconButtonProps): JSX.Element;
