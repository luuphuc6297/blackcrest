import React from "react";

export interface ButtonProps {
  children?: React.ReactNode;
  /** Visual emphasis. @default "primary" */
  variant?: "primary" | "secondary" | "ghost" | "danger";
  /** Control height. @default "md" */
  size?: "sm" | "md" | "lg";
  /** Icon node rendered before the label (use a Lucide <i data-lucide> or SVG). */
  leadingIcon?: React.ReactNode;
  /** Icon node rendered after the label. */
  trailingIcon?: React.ReactNode;
  /** Show a spinner and block interaction. @default false */
  loading?: boolean;
  disabled?: boolean;
  /** Stretch to container width. @default false */
  fullWidth?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
}

/**
 * Primary action control for Blackcrest. Reach for `primary` once per view; use
 * `secondary` for adjacent actions, `ghost` for low-emphasis/toolbar actions,
 * `danger` for destructive confirmation.
 *
 * @startingPoint section="Buttons" subtitle="Nút hành động — 4 biến thể, 3 kích thước" viewport="700x150"
 */
export function Button(props: ButtonProps): JSX.Element;
