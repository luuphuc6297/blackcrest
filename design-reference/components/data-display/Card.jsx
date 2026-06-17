import React from "react";

/**
 * Blackcrest Card — surface container. `interactive` adds hover lift; compose
 * header/body/footer freely or use the title/subtitle props for the common case.
 */
export function Card({ children, title, subtitle, action, padding = 20, interactive = false, onClick, style = {}, ...rest }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "var(--color-bg-primary)",
        border: "1px solid var(--color-border-primary)",
        borderRadius: "var(--radius-card)",
        boxShadow: interactive && hover ? "var(--shadow-medium)" : "var(--shadow-low)",
        transform: interactive && hover ? "translateY(-1px)" : "none",
        transition: "box-shadow var(--duration) var(--ease-signature), transform var(--duration) var(--ease-signature)",
        cursor: interactive ? "pointer" : "default",
        overflow: "hidden",
        ...style,
      }}
      {...rest}
    >
      {(title || action) && (
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: `${padding}px ${padding}px 0` }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {title && <div style={{ fontSize: "var(--font-size-large)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "-0.012em", color: "var(--color-text-primary)" }}>{title}</div>}
            {subtitle && <div style={{ fontSize: "var(--font-size-small)", color: "var(--color-text-tertiary)" }}>{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding }}>{children}</div>
    </div>
  );
}
