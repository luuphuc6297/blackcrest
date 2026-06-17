import React from "react";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  /** Helper text below the field. */
  hint?: string;
  /** Error message — turns the border/hint red and overrides hint. */
  error?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  containerStyle?: React.CSSProperties;
}

/** Single-line text field with label, icons, hint and error states. */
export function Input(props: InputProps): JSX.Element;
