import React from "react";

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label?: string;
  hint?: string;
  error?: string;
  size?: "sm" | "md" | "lg";
  /** <option> elements. */
  children?: React.ReactNode;
  containerStyle?: React.CSSProperties;
}

/** Native select styled to match Input, with a custom chevron. */
export function Select(props: SelectProps): JSX.Element;
