import React from "react";

/** Blackcrest Toast — transient notification. Render one inline; control with `open`. */
export function Toast({ open = true, tone = "neutral", title, message, icon = null, onClose, style = {} }) {
  const tones = {
    neutral: "var(--color-text-primary)",
    success: "var(--color-success)",
    warning: "var(--color-warning)",
    danger: "var(--color-danger)",
    info: "var(--color-info)",
  };
  if (!open) return null;
  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        width: 360,
        maxWidth: "100%",
        padding: "12px 14px",
        background: "var(--color-bg-primary)",
        border: "1px solid var(--color-border-primary)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-high)",
        animation: "bc-toast var(--duration-slow) var(--ease-signature)",
        ...style,
      }}
    >
      <style>{"@keyframes bc-toast{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}"}</style>
      <span style={{ display: "flex", marginTop: 1, color: tones[tone], flex: "none" }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontSize: "var(--font-size-regular)", fontWeight: "var(--font-weight-medium)", color: "var(--color-text-primary)" }}>{title}</div>}
        {message && <div style={{ fontSize: "var(--font-size-small)", color: "var(--color-text-tertiary)", marginTop: title ? 2 : 0, lineHeight: 1.45 }}>{message}</div>}
      </div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Đóng" style={{ border: "none", background: "transparent", color: "var(--color-text-tertiary)", cursor: "pointer", padding: 2, lineHeight: 0, flex: "none" }}>
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      )}
    </div>
  );
}
