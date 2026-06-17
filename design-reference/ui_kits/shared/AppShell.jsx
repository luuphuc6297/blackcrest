/* Blackcrest — shared application shell (sidebar + topbar) for Portal & Admin kits.
 * Exposes window.BcShell = { AppShell, Icon }. Composes DS Avatar/Badge. */
(function () {
  const { Avatar, Badge } = window.BlackcrestDesignSystem_e9728c;

  function Icon({ n, s = 18, c }) { return <i data-lucide={n} style={{ width: s, height: s, color: c }} />; }

  function Logo({ compact }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <svg width="17" height="17" viewBox="0 0 64 64" fill="none"><path d="M16 39 L32 21 L48 39" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /><path d="M20.5 46.5 L32 33.5 L43.5 46.5" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.62" /></svg>
        </div>
        {!compact && <span style={{ fontFamily: "var(--font-serif-display)", fontSize: 19, fontWeight: 600, letterSpacing: "-0.012em" }}>Blackcrest</span>}
      </div>
    );
  }

  function NavItem({ icon, label, active, badge, onClick }) {
    const [hover, setHover] = React.useState(false);
    return (
      <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "7px 10px", border: "none",
          borderRadius: 6, cursor: "pointer", textAlign: "left",
          background: active ? "var(--color-accent-tint)" : hover ? "var(--color-bg-tertiary)" : "transparent",
          color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
          fontFamily: "var(--font-regular)", fontSize: "var(--font-size-regular)", fontWeight: active ? 590 : 510,
          transition: "background var(--duration) var(--ease-signature)",
        }}>
        <Icon n={icon} s={17} c={active ? "var(--color-accent)" : "var(--color-text-tertiary)"} />
        <span style={{ flex: 1 }}>{label}</span>
        {badge != null && <Badge tone={active ? "accent" : "neutral"} size="sm">{badge}</Badge>}
      </button>
    );
  }

  function AppShell({ nav, activeKey, onNav, user, role, title, actions, children, footerNav }) {
    React.useEffect(() => { window.lucide && window.lucide.createIcons(); });
    return (
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", height: "100vh", background: "var(--color-bg-primary)", color: "var(--color-text-primary)", fontFamily: "var(--font-regular)" }}>
        {/* Sidebar */}
        <aside style={{ borderRight: "1px solid var(--color-border-primary)", background: "var(--color-bg-level-1)", display: "flex", flexDirection: "column", padding: "14px 12px" }}>
          <div style={{ padding: "4px 6px 14px" }}><Logo /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
            {nav.map((item) =>
              item.section ? (
                <div key={item.section} className="bc-overline" style={{ padding: "14px 10px 6px", fontSize: 10 }}>{item.section}</div>
              ) : (
                <NavItem key={item.key} icon={item.icon} label={item.label} badge={item.badge} active={activeKey === item.key} onClick={() => onNav && onNav(item.key)} />
              )
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {(footerNav || []).map((item) => <NavItem key={item.key} icon={item.icon} label={item.label} onClick={() => onNav && onNav(item.key)} />)}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", marginTop: 6, borderTop: "1px solid var(--color-border-primary)" }}>
              <Avatar name={user} size={30} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: "var(--font-size-small)", fontWeight: 590, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{role}</div>
              </div>
              <Icon n="chevrons-up-down" s={15} c="var(--color-text-quaternary)" />
            </div>
          </div>
        </aside>
        {/* Main */}
        <main style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <header style={{ height: 64, flex: "none", display: "flex", alignItems: "center", gap: 16, padding: "0 28px", borderBottom: "1px solid var(--color-border-primary)" }}>
            <h1 style={{ fontSize: "var(--font-size-title-3)", fontWeight: 590, letterSpacing: "-0.012em" }}>{title}</h1>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>{actions}</div>
          </header>
          <div style={{ flex: 1, overflow: "auto" }}>{children}</div>
        </main>
      </div>
    );
  }

  window.BcShell = { AppShell, Icon };
})();
