import React from "react";

/**
 * Blackcrest Tabs — underline tab bar. Controlled (value/onChange) or uncontrolled.
 * items: [{ value, label, icon?, badge? }]
 */
export function Tabs({ items = [], value, defaultValue, onChange, style = {} }) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(defaultValue || (items[0] && items[0].value));
  const active = isControlled ? value : internal;

  const select = (v) => {
    if (!isControlled) setInternal(v);
    onChange && onChange(v);
  };

  return (
    <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--color-border-primary)", ...style }}>
      {items.map((it) => {
        const on = it.value === active;
        return (
          <button
            key={it.value}
            type="button"
            onClick={() => select(it.value)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 12px",
              marginBottom: -1,
              border: "none",
              background: "transparent",
              borderBottom: `2px solid ${on ? "var(--color-accent)" : "transparent"}`,
              color: on ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
              fontFamily: "var(--font-regular)",
              fontSize: "var(--font-size-regular)",
              fontWeight: "var(--font-weight-medium)",
              cursor: "pointer",
              transition: "color var(--duration) var(--ease-signature), border-color var(--duration) var(--ease-signature)",
              whiteSpace: "nowrap",
            }}
          >
            {it.icon}
            {it.label}
            {it.badge != null && (
              <span style={{ fontSize: "var(--font-size-micro)", fontWeight: "var(--font-weight-medium)", color: on ? "var(--color-accent)" : "var(--color-text-quaternary)", background: on ? "var(--color-accent-tint)" : "var(--color-bg-level-2)", padding: "1px 6px", borderRadius: "var(--radius-pill)" }}>
                {it.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
