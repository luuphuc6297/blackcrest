import React from "react";

/**
 * Blackcrest Badge — compact status pill. Use `tone` for semantic color and
 * `dot` to show a leading status dot. Built for the document-workflow statuses.
 */
export function Badge({ children, tone = "neutral", dot = false, size = "md", style = {}, ...rest }) {
  const tones = {
    neutral: { fg: "var(--color-text-secondary)", bg: "var(--color-bg-level-2)", bd: "var(--color-border-primary)", dot: "var(--color-text-tertiary)" },
    accent: { fg: "var(--color-accent)", bg: "var(--color-accent-tint)", bd: "transparent", dot: "var(--color-accent)" },
    success: { fg: "var(--color-success)", bg: "var(--color-success-tint)", bd: "transparent", dot: "var(--color-success)" },
    warning: { fg: "var(--color-warning)", bg: "var(--color-warning-tint)", bd: "transparent", dot: "var(--color-warning)" },
    danger: { fg: "var(--color-danger)", bg: "var(--color-danger-tint)", bd: "transparent", dot: "var(--color-danger)" },
    info: { fg: "var(--color-info)", bg: "var(--color-info-tint)", bd: "transparent", dot: "var(--color-info)" },
    // document workflow
    draft: { fg: "var(--color-text-tertiary)", bg: "var(--color-bg-level-2)", bd: "var(--color-border-primary)", dot: "var(--status-draft)" },
    review: { fg: "var(--color-warning)", bg: "var(--color-warning-tint)", bd: "transparent", dot: "var(--status-review)" },
    approved: { fg: "var(--color-success)", bg: "var(--color-success-tint)", bd: "transparent", dot: "var(--status-approved)" },
    published: { fg: "var(--color-accent)", bg: "var(--color-accent-tint)", bd: "transparent", dot: "var(--status-published)" },
    rejected: { fg: "var(--color-danger)", bg: "var(--color-danger-tint)", bd: "transparent", dot: "var(--status-rejected)" },
  };
  const t = tones[tone] || tones.neutral;
  const pad = size === "sm" ? "2px 7px" : "3px 9px";
  const fs = size === "sm" ? "var(--font-size-micro)" : "var(--font-size-mini)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: pad,
        fontSize: fs,
        fontWeight: "var(--font-weight-medium)",
        lineHeight: 1.2,
        color: t.fg,
        background: t.bg,
        border: `1px solid ${t.bd}`,
        borderRadius: "var(--radius-badge)",
        whiteSpace: "nowrap",
        ...style,
      }}
      {...rest}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.dot, flex: "none" }} />}
      {children}
    </span>
  );
}
