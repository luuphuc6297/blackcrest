import React from "react";

export interface BadgeProps {
  children?: React.ReactNode;
  /** Semantic + workflow tones. */
  tone?: "neutral" | "accent" | "success" | "warning" | "danger" | "info"
    | "draft" | "review" | "approved" | "published" | "rejected";
  /** Show a leading status dot. */
  dot?: boolean;
  size?: "sm" | "md";
  style?: React.CSSProperties;
}

/**
 * Compact status pill. The document-workflow tones (draft/review/approved/published/rejected)
 * map directly to Blackcrest's report lifecycle.
 */
export function Badge(props: BadgeProps): JSX.Element;
