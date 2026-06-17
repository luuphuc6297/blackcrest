import React from "react";

/**
 * Blackcrest Dialog — centered modal with scrim. Controlled via `open`/`onClose`.
 */
export function Dialog({ open, onClose, title, description, children, footer, width = 460 }) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose && onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "var(--color-bg-overlay)",
        backdropFilter: "blur(2px)",
        animation: "bc-fade var(--duration) var(--ease-signature)",
      }}
    >
      <style>{"@keyframes bc-fade{from{opacity:0}to{opacity:1}}@keyframes bc-pop{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}"}</style>
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: width,
          background: "var(--color-bg-primary)",
          border: "1px solid var(--color-border-primary)",
          borderRadius: "var(--radius-card-lg)",
          boxShadow: "var(--shadow-high)",
          animation: "bc-pop var(--duration-slow) var(--ease-signature)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {(title || description) && (
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {title && <h2 style={{ fontSize: "var(--font-size-title-3)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "-0.012em", color: "var(--color-text-primary)" }}>{title}</h2>}
              {description && <p style={{ fontSize: "var(--font-size-regular)", color: "var(--color-text-tertiary)", lineHeight: 1.5 }}>{description}</p>}
            </div>
          )}
          {children}
        </div>
        {footer && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", padding: "14px 22px", background: "var(--color-bg-level-1)", borderTop: "1px solid var(--color-border-primary)" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
