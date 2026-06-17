import React from "react";

/** Blackcrest Checkbox — controlled or uncontrolled, with optional label. */
export function Checkbox({ checked, defaultChecked, onChange, label, disabled = false, id, style = {}, ...rest }) {
  const isControlled = checked !== undefined;
  const [internal, setInternal] = React.useState(defaultChecked || false);
  const value = isControlled ? checked : internal;
  const reactId = React.useId();
  const cbId = id || reactId;

  const toggle = (e) => {
    if (disabled) return;
    if (!isControlled) setInternal(e.target.checked);
    onChange && onChange(e);
  };

  return (
    <label htmlFor={cbId} style={{ display: "inline-flex", alignItems: "center", gap: "9px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, ...style }}>
      <span
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 18,
          height: 18,
          flex: "none",
          borderRadius: "var(--radius-4)",
          background: value ? "var(--color-accent)" : "var(--color-bg-primary)",
          border: `1.5px solid ${value ? "var(--color-accent)" : "var(--color-border-tertiary)"}`,
          transition: "background var(--duration) var(--ease-signature), border-color var(--duration) var(--ease-signature)",
        }}
      >
        <input id={cbId} type="checkbox" checked={value} onChange={toggle} disabled={disabled} style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", margin: 0, cursor: "inherit" }} {...rest} />
        {value && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6.2l2.2 2.2 4.8-4.8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label && <span style={{ fontSize: "var(--font-size-regular)", color: "var(--color-text-primary)" }}>{label}</span>}
    </label>
  );
}
