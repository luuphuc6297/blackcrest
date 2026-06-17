import React from "react";

export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  id?: string;
  style?: React.CSSProperties;
}

/** Toggle for instant on/off settings (no save step). Controlled or uncontrolled. */
export function Switch(props: SwitchProps): JSX.Element;
