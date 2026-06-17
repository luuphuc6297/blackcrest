import React from "react";

/**
 * Blackcrest Button — institutional action control.
 * Squared corners, UPPERCASE tracked label, flat (no shadow) — the Blackstone register.
 * Variants: primary (solid black) | secondary (black outline) | ghost (text) | danger.
 * Sizes: sm | md | lg.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  leadingIcon = null,
  trailingIcon = null,
  loading = false,
  disabled = false,
  fullWidth = false,
  type = "button",
  onClick,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);

  const heights = { sm: 30, md: 38, lg: 46 };
  const padding = { sm: "0 14px", md: "0 20px", lg: "0 28px" };
  const fontSize = { sm: "10.5px", md: "11.5px", lg: "12.5px" };

  const palettes = {
    primary: {
      bg: "var(--color-accent)",
      bgHover: "var(--color-accent-hover)",
      bgActive: "var(--color-accent-active)",
      color: "var(--color-text-on-accent)",
      border: "var(--color-accent)",
      borderHover: "var(--color-accent-hover)",
    },
    secondary: {
      bg: "transparent",
      bgHover: "var(--color-accent)",
      bgActive: "var(--color-accent-active)",
      color: "var(--color-text-primary)",
      colorHover: "var(--color-text-on-accent)",
      border: "var(--color-text-primary)",
      borderHover: "var(--color-accent)",
    },
    ghost: {
      bg: "transparent",
      bgHover: "var(--color-bg-tertiary)",
      bgActive: "var(--color-bg-quaternary)",
      color: "var(--color-text-secondary)",
      border: "transparent",
      borderHover: "transparent",
    },
    danger: {
      bg: "var(--color-danger)",
      bgHover: "#9c322d",
      bgActive: "#8a2c28",
      color: "#fff",
      border: "var(--color-danger)",
      borderHover: "#9c322d",
    },
  };

  const p = palettes[variant] || palettes.primary;
  const bg = disabled ? p.bg : active ? p.bgActive : hover ? p.bgHover : p.bg;
  const border = disabled ? p.border : hover ? (p.borderHover || p.border) : p.border;
  const color = !disabled && hover && p.colorHover ? p.colorHover : p.color;

  const styles = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    height: heights[size],
    padding: padding[size],
    width: fullWidth ? "100%" : "auto",
    fontFamily: "var(--font-regular)",
    fontSize: fontSize[size],
    fontWeight: "var(--font-weight-semibold)",
    textTransform: "uppercase",
    letterSpacing: "0.09em",
    lineHeight: 1,
    color: color,
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: "var(--radius-control)",
    cursor: disabled || loading ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    transition: "background var(--duration) var(--ease-signature), color var(--duration) var(--ease-signature), border-color var(--duration) var(--ease-signature)",
    userSelect: "none",
    whiteSpace: "nowrap",
    ...style,
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={styles}
      {...rest}
    >
      {loading && <Spinner />}
      {!loading && leadingIcon && <span style={{ display: "flex" }}>{leadingIcon}</span>}
      {children && <span>{children}</span>}
      {!loading && trailingIcon && <span style={{ display: "flex" }}>{trailingIcon}</span>}
    </button>
  );
}

function Spinner() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" style={{ animation: "bc-spin 0.7s linear infinite" }}>
      <style>{"@keyframes bc-spin{to{transform:rotate(360deg)}}"}</style>
      <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
      <path d="M7 1.5 a5.5 5.5 0 0 1 5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
