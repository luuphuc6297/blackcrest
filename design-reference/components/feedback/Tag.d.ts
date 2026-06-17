import React from "react";

export interface TagProps {
  children?: React.ReactNode;
  /** When provided, renders a remove (×) button that calls this. */
  onRemove?: () => void;
  leadingIcon?: React.ReactNode;
  style?: React.CSSProperties;
}

/** Neutral metadata chip (fund, period, asset class…), optionally removable. */
export function Tag(props: TagProps): JSX.Element;
