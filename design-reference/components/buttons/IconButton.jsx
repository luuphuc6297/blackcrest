import React from "react";

/**
 * Blackcrest IconButton — square, icon-only control for toolbars and dense UI.
 * Sizes: sm (28) | md (32) | lg (40). Variants: ghost (default) | secondary | primary.
 */
export function IconButton({
  children,
  label,
  variant = "ghost",
  size = "md",
  active = false,
  disabled = false,
  onClick,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const dims = { sm: 28, md: 32, lg: 40 };

  const palettes = {
    ghost: { bg: "transparent", bgHover: "var(--color-bg-tertiary)", color: "var(--color-text-secondary)", border: "transparent" },
    secondary: { bg: "var(--color-bg-level-1)", bgHover: "var(--color-bg-tertiary)", color: "var(--color-text-secondary)", border: "var(--color-border-secondary)" },
    primary: { bg: "var(--color-accent)", bgHover: "var(--color-accent-hover)", color: "#fff", border: "transparent" },
  };
  const p = palettes[variant] || palettes.ghost;
  const activeBg = "var(--color-bg-quaternary)";
  const bg = disabled ? p.bg : press ? "var(--color-bg-quaternary)" : active ? activeBg : hover ? p.bgHover : p.bg;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: dims[size],
        height: dims[size],
        color: active ? "var(--color-text-primary)" : p.color,
        background: bg,
        border: `1px solid ${p.border}`,
        borderRadius: "var(--radius-control)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "background var(--duration) var(--ease-signature), color var(--duration) var(--ease-signature)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
