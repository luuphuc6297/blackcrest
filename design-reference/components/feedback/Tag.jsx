import React from "react";

/** Blackcrest Tag — neutral chip for metadata/labels, optionally removable. */
export function Tag({ children, onRemove, leadingIcon = null, style = {}, ...rest }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "3px 4px 3px 9px",
        fontSize: "var(--font-size-mini)",
        fontWeight: "var(--font-weight-medium)",
        color: "var(--color-text-secondary)",
        background: "var(--color-bg-level-1)",
        border: "1px solid var(--color-border-secondary)",
        borderRadius: "var(--radius-badge)",
        ...(onRemove ? {} : { paddingRight: 9 }),
        ...style,
      }}
      {...rest}
    >
      {leadingIcon}
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Gỡ"
          style={{ display: "inline-flex", border: "none", background: "transparent", color: "var(--color-text-tertiary)", cursor: "pointer", padding: 2, borderRadius: 4, lineHeight: 0 }}
        >
          <svg width="11" height="11" viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      )}
    </span>
  );
}
