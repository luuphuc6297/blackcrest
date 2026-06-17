import React from "react";

/** Blackcrest Avatar — initials or image, with optional status ring. */
export function Avatar({ name = "", src, size = 32, tone, style = {} }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  // deterministic charcoal tone from name (monochrome system)
  const palette = ["#16181d", "#3c4149", "#555a63", "#6a6f78", "#2a2d33", "#454952"];
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const bg = tone || palette[hash % palette.length];
  const fontSize = Math.round(size * 0.4);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flex: "none",
        borderRadius: "var(--radius-full)",
        background: src ? "var(--color-bg-level-2)" : bg,
        color: "#fff",
        fontSize,
        fontWeight: "var(--font-weight-semibold)",
        letterSpacing: "-0.01em",
        overflow: "hidden",
        userSelect: "none",
        ...style,
      }}
    >
      {src ? (
        <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        initials || "?"
      )}
    </span>
  );
}
