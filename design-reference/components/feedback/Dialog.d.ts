import React from "react";

export interface DialogProps {
  open: boolean;
  onClose?: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Body content. */
  children?: React.ReactNode;
  /** Footer actions (usually Buttons), right-aligned on a level-1 bar. */
  footer?: React.ReactNode;
  /** Max width in px. @default 460 */
  width?: number;
}

/** Centered modal with scrim, Escape-to-close and click-outside-to-close. */
export function Dialog(props: DialogProps): JSX.Element | null;
