import React from "react";

/** Blackcrest Switch — toggle for instant on/off settings. */
export function Switch({ checked, defaultChecked, onChange, label, disabled = false, id, style = {}, ...rest }) {
  const isControlled = checked !== undefined;
  const [internal, setInternal] = React.useState(defaultChecked || false);
  const value = isControlled ? checked : internal;
  const reactId = React.useId();
  const swId = id || reactId;

  const toggle = (e) => {
    if (disabled) return;
    if (!isControlled) setInternal(e.target.checked);
    onChange && onChange(e);
  };

  return (
    <label htmlFor={swId} style={{ display: "inline-flex", alignItems: "center", gap: "10px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, ...style }}>
      <span
        style={{
          position: "relative",
          width: 34,
          height: 20,
          flex: "none",
          borderRadius: "var(--radius-full)",
          background: value ? "var(--color-accent)" : "var(--color-bg-quaternary)",
          transition: "background var(--duration) var(--ease-signature)",
        }}
      >
        <input id={swId} type="checkbox" checked={value} onChange={toggle} disabled={disabled} style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", margin: 0, cursor: "inherit" }} {...rest} />
        <span
          style={{
            position: "absolute",
            top: 2,
            left: value ? 16 : 2,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
            transition: "left var(--duration) var(--ease-signature)",
          }}
        />
      </span>
      {label && <span style={{ fontSize: "var(--font-size-regular)", color: "var(--color-text-primary)" }}>{label}</span>}
    </label>
  );
}
