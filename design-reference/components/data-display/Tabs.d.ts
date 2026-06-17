import React from "react";

export interface TabItem {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Optional count chip. */
  badge?: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}

/** Underline tab bar with optional icons and count badges. Controlled or uncontrolled. */
export function Tabs(props: TabsProps): JSX.Element;
