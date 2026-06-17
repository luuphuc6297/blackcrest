import React from "react";

export interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  id?: string;
  style?: React.CSSProperties;
}

/** Checkbox with the violet accent fill and a hand-tuned tick. Controlled or uncontrolled. */
export function Checkbox(props: CheckboxProps): JSX.Element;
