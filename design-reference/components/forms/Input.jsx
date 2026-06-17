import React from "react";

/**
 * Blackcrest Input — text field with optional label, leading icon, hint and error.
 */
export function Input({
  label,
  hint,
  error,
  leadingIcon = null,
  trailingIcon = null,
  size = "md",
  disabled = false,
  id,
  style = {},
  containerStyle = {},
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const reactId = React.useId();
  const inputId = id || reactId;
  const heights = { sm: 28, md: 32, lg: 40 };

  const borderColor = error
    ? "var(--color-danger)"
    : focus
    ? "var(--color-accent)"
    : "var(--color-border-secondary)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "7px", ...containerStyle }}>
      {label && (
        <label htmlFor={inputId} style={{ fontSize: "var(--font-size-micro)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--color-text-tertiary)" }}>
          {label}
        </label>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          height: heights[size],
          padding: "0 10px",
          background: disabled ? "var(--color-bg-level-2)" : "var(--color-bg-primary)",
          border: `1px solid ${borderColor}`,
          borderRadius: "var(--radius-control)",
          boxShadow: focus && !error ? "inset 0 0 0 1px var(--color-accent)" : "none",
          transition: "border-color var(--duration) var(--ease-signature), box-shadow var(--duration) var(--ease-signature)",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {leadingIcon && <span style={{ display: "flex", color: "var(--color-text-tertiary)" }}>{leadingIcon}</span>}
        <input
          id={inputId}
          disabled={disabled}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            flex: 1,
            minWidth: 0,
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: "var(--font-regular)",
            fontSize: "var(--font-size-regular)",
            color: "var(--color-text-primary)",
            ...style,
          }}
          {...rest}
        />
        {trailingIcon && <span style={{ display: "flex", color: "var(--color-text-tertiary)" }}>{trailingIcon}</span>}
      </div>
      {(hint || error) && (
        <span style={{ fontSize: "var(--font-size-mini)", color: error ? "var(--color-danger)" : "var(--color-text-tertiary)" }}>
          {error || hint}
        </span>
      )}
    </div>
  );
}
