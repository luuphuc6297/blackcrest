import React from "react";

export interface CardProps {
  children?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right-aligned header slot (menu, badge, link). */
  action?: React.ReactNode;
  /** Inner padding in px. @default 20 */
  padding?: number;
  /** Hover lift + pointer cursor for clickable cards. */
  interactive?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

/** Surface container with hairline border + soft low shadow; optional header. */
export function Card(props: CardProps): JSX.Element;
