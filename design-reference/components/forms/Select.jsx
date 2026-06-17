import React from "react";

/** Blackcrest Select — native select styled to match Input, with a chevron. */
export function Select({
  label,
  hint,
  error,
  size = "md",
  disabled = false,
  children,
  id,
  style = {},
  containerStyle = {},
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const reactId = React.useId();
  const selectId = id || reactId;
  const heights = { sm: 28, md: 32, lg: 40 };
  const borderColor = error ? "var(--color-danger)" : focus ? "var(--color-accent)" : "var(--color-border-secondary)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "7px", ...containerStyle }}>
      {label && (
        <label htmlFor={selectId} style={{ fontSize: "var(--font-size-micro)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--color-text-tertiary)" }}>
          {label}
        </label>
      )}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <select
          id={selectId}
          disabled={disabled}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            appearance: "none",
            WebkitAppearance: "none",
            width: "100%",
            height: heights[size],
            padding: "0 32px 0 10px",
            background: disabled ? "var(--color-bg-level-2)" : "var(--color-bg-primary)",
            border: `1px solid ${borderColor}`,
            borderRadius: "var(--radius-control)",
            boxShadow: focus && !error ? "inset 0 0 0 1px var(--color-accent)" : "none",
            fontFamily: "var(--font-regular)",
            fontSize: "var(--font-size-regular)",
            color: "var(--color-text-primary)",
            cursor: disabled ? "not-allowed" : "pointer",
            outline: "none",
            transition: "border-color var(--duration) var(--ease-signature), box-shadow var(--duration) var(--ease-signature)",
            opacity: disabled ? 0.6 : 1,
            ...style,
          }}
          {...rest}
        >
          {children}
        </select>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ position: "absolute", right: 10, pointerEvents: "none", color: "var(--color-text-tertiary)" }}>
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {(hint || error) && (
        <span style={{ fontSize: "var(--font-size-mini)", color: error ? "var(--color-danger)" : "var(--color-text-tertiary)" }}>
          {error || hint}
        </span>
      )}
    </div>
  );
}
