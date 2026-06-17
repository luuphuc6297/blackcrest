import React from "react";

export interface ToastProps {
  open?: boolean;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  title?: React.ReactNode;
  message?: React.ReactNode;
  /** Leading icon node (Lucide/SVG), colored by tone. */
  icon?: React.ReactNode;
  onClose?: () => void;
  style?: React.CSSProperties;
}

/** Transient notification card. Position with a fixed container; tone colors the icon. */
export function Toast(props: ToastProps): JSX.Element | null;
