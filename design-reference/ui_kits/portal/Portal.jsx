/* Blackcrest — Portal (investor view). Dashboard + document library. */
const { Card, Badge, Button, Input, Tabs, Avatar } = window.BlackcrestDesignSystem_e9728c;
const { AppShell, Icon } = window.BcShell;

const NAV = [
  { key: "overview", icon: "layout-dashboard", label: "Tổng quan" },
  { key: "documents", icon: "files", label: "Tài liệu", badge: 4 },
  { key: "reports", icon: "line-chart", label: "Báo cáo" },
  { key: "transactions", icon: "arrow-left-right", label: "Giao dịch" },
];
const FOOTER = [{ key: "settings", icon: "settings", label: "Cài đặt" }, { key: "help", icon: "life-buoy", label: "Trợ giúp" }];

const KPIS = [
  ["Tổng tài sản", "₫ 1,28 tỷ", "+2,4% tháng này", "success"],
  ["NAV / đơn vị", "12.847", "+8,42% YTD", "success"],
  ["Cam kết chưa giải ngân", "₫ 320 tr", "3 đợt còn lại", "neutral"],
  ["Tài liệu mới", "4", "cần xem", "accent"],
];

const DOCS = [
  ["Báo cáo Quý III 2026", "Quỹ Cân bằng", "Báo cáo định kỳ", "published", "12/10/2026", "2,4 MB"],
  ["Sao kê vốn — Tháng 9", "Quỹ Cân bằng", "Sao kê", "published", "01/10/2026", "0,8 MB"],
  ["Thư quản lý quỹ Q3", "Quỹ Tăng trưởng", "Thư nhà đầu tư", "published", "28/09/2026", "1,1 MB"],
  ["Bản cáo bạch sửa đổi", "Quỹ Cân bằng", "Pháp lý", "review", "20/09/2026", "5,6 MB"],
];

function KpiCard({ label, value, sub, tone }) {
  return (
    <Card padding={18} style={{ flex: 1 }}>
      <div style={{ fontSize: "var(--font-size-small)", color: "var(--color-text-tertiary)" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-monospace)", fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", marginTop: 8, color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>{value}</div>
      <div style={{ marginTop: 10 }}><Badge tone={tone} size="sm">{sub}</Badge></div>
    </Card>
  );
}

function DocRow({ d }) {
  const [hover, setHover] = React.useState(false);
  const toneMap = { published: "published", review: "review", draft: "draft", approved: "approved" };
  const statusLabel = { published: "Đã phát hành", review: "Chờ duyệt", draft: "Nháp", approved: "Đã duyệt" };
  return (
    <a href="../pdf-viewer/index.html" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1fr 0.8fr 40px", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: "1px solid var(--color-border-primary)", background: hover ? "var(--color-bg-level-1)" : "transparent", textDecoration: "none", color: "inherit", transition: "background var(--duration) var(--ease-signature)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
        <span style={{ width: 32, height: 38, borderRadius: 4, background: "var(--color-bg-level-2)", border: "1px solid var(--color-border-primary)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <Icon n="file-text" s={16} c="var(--color-text-secondary)" />
        </span>
        <span style={{ fontSize: "var(--font-size-regular)", fontWeight: 510, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d[0]}</span>
      </div>
      <span style={{ fontSize: "var(--font-size-small)", color: "var(--color-text-secondary)" }}>{d[1]}</span>
      <span style={{ fontSize: "var(--font-size-small)", color: "var(--color-text-tertiary)" }}>{d[2]}</span>
      <span><Badge tone={toneMap[d[3]]} dot>{statusLabel[d[3]]}</Badge></span>
      <span style={{ fontSize: "var(--font-size-small)", color: "var(--color-text-tertiary)", fontFamily: "var(--font-monospace)" }}>{d[4]}</span>
      <span style={{ display: "flex", justifyContent: "flex-end", color: hover ? "var(--color-accent)" : "var(--color-text-quaternary)" }}><Icon n="arrow-up-right" s={16} /></span>
    </a>
  );
}

function Portal() {
  const [tab, setTab] = React.useState("all");
  const [active, setActive] = React.useState("overview");
  const filtered = tab === "all" ? DOCS : DOCS.filter((d) => (tab === "pending" ? d[3] === "review" : d[3] === "published"));

  return (
    <AppShell
      nav={NAV} footerNav={FOOTER} activeKey={active} onNav={setActive}
      user="Nguyễn Minh Anh" role="Nhà đầu tư"
      title="Tổng quan"
      actions={<>
        <Input placeholder="Tìm tài liệu…" leadingIcon={<Icon n="search" s={16} />} containerStyle={{ width: 240 }} size="md" />
        <Button variant="secondary" leadingIcon={<Icon n="bell" s={16} />}>Thông báo</Button>
      </>}
    >
      <div style={{ padding: 28, maxWidth: 1180, margin: "0 auto" }}>
        {/* Greeting */}
        <div style={{ marginBottom: 22 }}>
          <h2 style={{ fontFamily: "var(--font-serif-display)", fontSize: 27, fontWeight: 600, letterSpacing: "-0.015em" }}>Chào buổi sáng, chị Minh Anh</h2>
          <p style={{ fontSize: "var(--font-size-regular)", color: "var(--color-text-tertiary)", marginTop: 6 }}>Bạn có <b style={{ color: "var(--color-text-secondary)" }}>4 tài liệu mới</b> kể từ lần truy cập trước.</p>
        </div>
        {/* KPIs */}
        <div style={{ display: "flex", gap: 14, marginBottom: 26 }}>
          {KPIS.map((k) => <KpiCard key={k[0]} label={k[0]} value={k[1]} sub={k[2]} tone={k[3]} />)}
        </div>
        {/* Documents */}
        <Card padding={0}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 0" }}>
            <div style={{ fontSize: "var(--font-size-large)", fontWeight: 590, letterSpacing: "-0.012em" }}>Tài liệu gần đây</div>
            <Button variant="ghost" size="sm" trailingIcon={<Icon n="arrow-right" s={15} />}>Xem tất cả</Button>
          </div>
          <div style={{ padding: "10px 18px 0" }}>
            <Tabs value={tab} onChange={setTab} items={[
              { value: "all", label: "Tất cả", badge: DOCS.length },
              { value: "pending", label: "Chờ duyệt", badge: 1 },
              { value: "published", label: "Đã phát hành" },
            ]} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1fr 0.8fr 40px", gap: 12, padding: "12px 16px 8px", fontSize: "var(--font-size-mini)", color: "var(--color-text-quaternary)", fontWeight: 510, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            <span>Tài liệu</span><span>Quỹ</span><span>Loại</span><span>Trạng thái</span><span>Ngày</span><span></span>
          </div>
          {filtered.map((d, i) => <DocRow key={i} d={d} />)}
        </Card>
      </div>
    </AppShell>
  );
}

window.Portal = Portal;
