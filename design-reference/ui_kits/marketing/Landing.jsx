/* Blackcrest — Marketing landing. Composes DS Button/Badge. Inter + Source Serif display. */
const { Button, Badge } = window.BlackcrestDesignSystem_e9728c;

function Ic({ n, s = 18, c }) {
  return <i data-lucide={n} style={{ width: s, height: s, color: c }} />;
}

function Header() {
  const nav = ["Sản phẩm", "Bảo mật", "Khách hàng", "Tài liệu"];
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 20, height: 72, display: "flex", alignItems: "center", padding: "0 32px", background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--color-border-primary)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="20" height="20" viewBox="0 0 64 64" fill="none"><path d="M16 39 L32 21 L48 39" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /><path d="M20.5 46.5 L32 33.5 L43.5 46.5" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.62" /></svg>
        </div>
        <span style={{ fontFamily: "var(--font-serif-display)", fontSize: 22, fontWeight: 600, letterSpacing: "-0.012em" }}>Blackcrest</span>
      </div>
      <nav style={{ display: "flex", gap: 28, marginLeft: 48 }}>
        {nav.map((n) => (
          <a key={n} href="#" style={{ fontSize: "var(--font-size-regular)", color: "var(--color-text-secondary)", fontWeight: 510 }}>{n}</a>
        ))}
      </nav>
      <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
        <Button variant="ghost">Đăng nhập</Button>
        <Button variant="primary" trailingIcon={<Ic n="arrow-right" s={16} />}>Yêu cầu truy cập</Button>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section style={{ padding: "88px 32px 56px", maxWidth: 1080, margin: "0 auto", textAlign: "center" }}>
      <div style={{ display: "inline-flex", marginBottom: 24 }}>
        <Badge tone="accent" dot>Dành cho quản lý gia sản tư nhân</Badge>
      </div>
      <h1 style={{ fontFamily: "var(--font-serif-display)", fontSize: 60, lineHeight: 1.04, letterSpacing: "-0.025em", fontWeight: 600, color: "var(--color-text-primary)", maxWidth: 880, margin: "0 auto" }}>
        Tài liệu đầu tư, được kiểm soát đến từng trang
      </h1>
      <p style={{ fontSize: 19, lineHeight: 1.55, color: "var(--color-text-tertiary)", maxWidth: 600, margin: "22px auto 0" }}>
        Blackcrest phát hành, phê duyệt và phân phối báo cáo đầu tư bảo mật tới nhà đầu tư — trong một quy trình duy nhất, chính xác và nhanh.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 34 }}>
        <Button variant="primary" size="lg" trailingIcon={<Ic n="arrow-right" s={18} />}>Bắt đầu</Button>
        <Button variant="secondary" size="lg" leadingIcon={<Ic n="play" s={16} />}>Xem demo</Button>
      </div>
      <p style={{ fontSize: "var(--font-size-small)", color: "var(--color-text-quaternary)", marginTop: 18 }}>Tuân thủ bảo mật cấp tổ chức · Không cần thẻ tín dụng</p>
      <ProductPreview />
    </section>
  );
}

function ProductPreview() {
  return (
    <div style={{ marginTop: 56, borderRadius: 16, border: "1px solid var(--color-border-primary)", background: "var(--color-bg-level-1)", boxShadow: "var(--shadow-high)", overflow: "hidden", textAlign: "left" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 14px", borderBottom: "1px solid var(--color-border-primary)", background: "var(--color-bg-primary)" }}>
        <span style={{ display: "flex", gap: 6 }}>
          {["#e7e7ec", "#e7e7ec", "#e7e7ec"].map((c, i) => <span key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
        </span>
        <span style={{ marginLeft: 12, fontSize: "var(--font-size-mini)", color: "var(--color-text-tertiary)", fontFamily: "var(--font-monospace)" }}>blackcrest.app/portal/bao-cao/q3-2026.pdf</span>
        <span style={{ marginLeft: "auto" }}><Badge tone="published" dot>Đã phát hành</Badge></span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", minHeight: 360 }}>
        <aside style={{ borderRight: "1px solid var(--color-border-primary)", background: "var(--color-bg-primary)", padding: 14 }}>
          {["Tổng quan quỹ", "Hiệu suất Q3", "Phân bổ tài sản", "Giao dịch", "Ghi chú quản lý"].map((s, i) => (
            <div key={s} style={{ padding: "8px 10px", borderRadius: 6, fontSize: "var(--font-size-small)", color: i === 1 ? "var(--color-accent)" : "var(--color-text-secondary)", background: i === 1 ? "var(--color-accent-tint)" : "transparent", fontWeight: i === 1 ? 590 : 510, marginBottom: 2 }}>{s}</div>
          ))}
        </aside>
        <div style={{ padding: 32, background: "var(--color-bg-level-2)", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 340, background: "#fff", borderRadius: 6, boxShadow: "var(--shadow-medium)", padding: "32px 30px" }}>
            <div style={{ fontFamily: "var(--font-serif-display)", fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)" }}>Báo cáo Quý III 2026</div>
            <div style={{ fontSize: 11, color: "var(--color-text-quaternary)", marginTop: 4, fontFamily: "var(--font-monospace)" }}>QUỸ CÂN BẰNG BLACKCREST</div>
            <div style={{ height: 1, background: "var(--color-border-primary)", margin: "18px 0" }} />
            {[80, 95, 70].map((w, i) => <div key={i} style={{ height: 8, width: `${w}%`, background: "var(--color-bg-tertiary)", borderRadius: 3, marginBottom: 9 }} />)}
            <div style={{ display: "flex", gap: 10, margin: "22px 0" }}>
              <div style={{ flex: 1, padding: 12, background: "var(--color-bg-level-1)", borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>NAV / đơn vị</div>
                <div style={{ fontFamily: "var(--font-monospace)", fontSize: 16, fontWeight: 500, marginTop: 3 }}>12.847</div>
              </div>
              <div style={{ flex: 1, padding: 12, background: "var(--color-bg-level-1)", borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>Lợi nhuận YTD</div>
                <div style={{ fontFamily: "var(--font-monospace)", fontSize: 16, fontWeight: 500, marginTop: 3, color: "var(--color-success)" }}>+8,42%</div>
              </div>
            </div>
            {[100, 90].map((w, i) => <div key={i} style={{ height: 7, width: `${w}%`, background: "var(--color-bg-tertiary)", borderRadius: 3, marginBottom: 8 }} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function Trust() {
  const stats = [["248", "nhà đầu tư đang hoạt động"], ["12.400+", "tài liệu đã phát hành"], ["99,98%", "thời gian hoạt động"], ["< 180ms", "thời gian phản hồi"]];
  return (
    <section style={{ borderTop: "1px solid var(--color-border-primary)", borderBottom: "1px solid var(--color-border-primary)", background: "var(--color-bg-level-1)" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "40px 32px", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24 }}>
        {stats.map(([n, l]) => (
          <div key={l}>
            <div style={{ fontFamily: "var(--font-monospace)", fontSize: 30, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--color-text-primary)" }}>{n}</div>
            <div style={{ fontSize: "var(--font-size-small)", color: "var(--color-text-tertiary)", marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const items = [
    ["file-check-2", "Quy trình phê duyệt", "Mọi báo cáo đi qua luồng nháp → duyệt → phát hành, có dấu vết kiểm toán đầy đủ."],
    ["shield-check", "Bảo mật theo vai trò", "Phân quyền SUPER_ADMIN, EDITOR, APPROVER. Watermark động trên từng trang PDF."],
    ["zap", "Nhanh như bàn phím", "Xem, chú thích và điều hướng tài liệu với độ trễ dưới 180ms, mọi thao tác."],
  ];
  return (
    <section style={{ maxWidth: 1080, margin: "0 auto", padding: "80px 32px" }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div className="bc-overline" style={{ color: "var(--color-accent)" }}>Vì sao Blackcrest</div>
        <h2 style={{ fontFamily: "var(--font-serif-display)", fontSize: 38, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 12 }}>Được xây cho sự chính xác</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
        {items.map(([icon, title, desc]) => (
          <div key={title} style={{ padding: 28, background: "var(--color-bg-primary)", border: "1px solid var(--color-border-primary)", borderRadius: 12, boxShadow: "var(--shadow-low)" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--color-accent-tint)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
              <Ic n={icon} s={20} c="var(--color-accent)" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 590, letterSpacing: "-0.012em" }}>{title}</h3>
            <p style={{ fontSize: "var(--font-size-regular)", color: "var(--color-text-tertiary)", lineHeight: 1.55, marginTop: 8 }}>{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section style={{ maxWidth: 1080, margin: "0 auto 80px", padding: "0 32px" }}>
      <div style={{ background: "var(--color-bg-inverse)", borderRadius: 20, padding: "64px 48px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "var(--font-serif-display)", fontSize: 40, fontWeight: 600, letterSpacing: "-0.022em", color: "#f7f8f8" }}>Sẵn sàng cho quy trình tài liệu chuẩn mực?</h2>
        <p style={{ fontSize: 18, color: "#b4bcd0", marginTop: 16, maxWidth: 520, marginInline: "auto" }}>Trao đổi với đội ngũ Blackcrest để thiết lập cổng nhà đầu tư riêng cho quỹ của bạn.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 32 }}>
          <Button variant="primary" size="lg" trailingIcon={<Ic n="arrow-right" s={18} />}>Yêu cầu truy cập</Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--color-border-primary)", padding: "32px", maxWidth: 1080, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontFamily: "var(--font-serif-display)", fontSize: 18, fontWeight: 600 }}>Blackcrest</span>
      <span style={{ fontSize: "var(--font-size-small)", color: "var(--color-text-quaternary)" }}>© 2026 Blackcrest Wealth. Bảo lưu mọi quyền.</span>
    </footer>
  );
}

function Landing() {
  React.useEffect(() => { window.lucide && window.lucide.createIcons(); });
  return (
    <div style={{ background: "var(--color-bg-marketing)" }}>
      <div style={{ background: "var(--color-bg-primary)" }}>
        <Header />
        <Hero />
        <Trust />
        <Features />
        <CTA />
        <Footer />
      </div>
    </div>
  );
}

window.Landing = Landing;
