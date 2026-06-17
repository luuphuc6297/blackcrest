import React from "react";

/** Blackcrest Tooltip — hover/focus hint. Wraps a single child trigger. */
export function Tooltip({ content, side = "top", children }) {
  const [open, setOpen] = React.useState(false);
  const pos = {
    top: { bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" },
    bottom: { top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" },
    left: { right: "calc(100% + 6px)", top: "50%", transform: "translateY(-50%)" },
    right: { left: "calc(100% + 6px)", top: "50%", transform: "translateY(-50%)" },
  };
  return (
    <span
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            zIndex: 50,
            ...pos[side],
            padding: "5px 9px",
            fontSize: "var(--font-size-mini)",
            fontWeight: "var(--font-weight-medium)",
            color: "#fff",
            background: "#1c1d21",
            borderRadius: "var(--radius-6)",
            boxShadow: "var(--shadow-medium)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {content}
        </span>
      )}
    </span>
  );
}
