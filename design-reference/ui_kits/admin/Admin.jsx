/* Blackcrest — Admin kit. Two views: Accounts and Reports (document workflow). */
const { Card, Badge, Button, Input, Avatar, Tabs } = window.BlackcrestDesignSystem_e9728c;
const { AppShell, Icon } = window.BcShell;

const ADMIN_NAV = [
  { section: "Quản trị" },
  { key: "reports", icon: "file-stack", label: "Báo cáo", badge: 7 },
  { key: "accounts", icon: "users", label: "Tài khoản" },
  { section: "Hệ thống" },
  { key: "audit", icon: "scroll-text", label: "Nhật ký kiểm toán" },
  { key: "funds", icon: "landmark", label: "Quỹ" },
];
const ADMIN_FOOTER = [{ key: "settings", icon: "settings", label: "Cài đặt" }];

/* ---------- Role + status helpers ---------- */
const ROLE_LABEL = { SUPER_ADMIN: "Quản trị tối cao", EDITOR: "Biên tập", APPROVER: "Người duyệt", VIEWER: "Nhà đầu tư" };
const ROLE_TONE = { SUPER_ADMIN: "accent", EDITOR: "neutral", APPROVER: "neutral", VIEWER: "neutral" };

const ACCOUNTS = [
  ["Nguyễn Minh Anh", "minh.anh@blackcrest.vn", "SUPER_ADMIN", "active", "2 phút trước"],
  ["Trần Quốc Bảo", "bao.tran@blackcrest.vn", "APPROVER", "active", "1 giờ trước"],
  ["Lê Thu Hà", "ha.le@blackcrest.vn", "EDITOR", "active", "Hôm qua"],
  ["Phạm Đức Long", "long.pham@blackcrest.vn", "EDITOR", "pending", "—"],
  ["Vũ Thị Mai", "mai.vu@quycanbang.vn", "VIEWER", "active", "3 ngày trước"],
  ["Đỗ Khánh Linh", "linh.do@blackcrest.vn", "APPROVER", "suspended", "2 tuần trước"],
];
const ACC_STATUS = { active: ["approved", "Hoạt động"], pending: ["review", "Chờ kích hoạt"], suspended: ["rejected", "Tạm khoá"] };

const REPORTS = [
  ["Báo cáo Quý III 2026", "Quỹ Cân bằng", "Lê Thu Hà", "published", "12/10/2026", "v3"],
  ["Sao kê vốn — Tháng 10", "Quỹ Cân bằng", "Lê Thu Hà", "review", "11/10/2026", "v1"],
  ["Thư quản lý quỹ Q3", "Quỹ Tăng trưởng", "Phạm Đức Long", "approved", "09/10/2026", "v2"],
  ["Bản cáo bạch sửa đổi", "Quỹ Cân bằng", "Lê Thu Hà", "review", "07/10/2026", "v4"],
  ["Báo cáo ESG bán niên", "Quỹ Bền vững", "Phạm Đức Long", "draft", "05/10/2026", "v1"],
  ["Sao kê vốn — Tháng 9", "Quỹ Tăng trưởng", "Lê Thu Hà", "published", "01/10/2026", "v2"],
  ["Định giá tài sản Q3", "Quỹ Cân bằng", "Phạm Đức Long", "rejected", "28/09/2026", "v1"],
];
const REP_STATUS = { published: "Đã phát hành", review: "Chờ duyệt", approved: "Đã duyệt", draft: "Nháp", rejected: "Từ chối" };

/* ---------- Accounts view ---------- */
function AccountsView() {
  return (
    <div style={{ padding: 28, maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
        {[["Tổng tài khoản", "248"], ["Đang hoạt động", "231"], ["Chờ kích hoạt", "12"], ["Quản trị viên", "5"]].map(([l, v]) => (
          <Card key={l} padding={18} style={{ flex: 1 }}>
            <div style={{ fontSize: "var(--font-size-small)", color: "var(--color-text-tertiary)" }}>{l}</div>
            <div style={{ fontFamily: "var(--font-monospace)", fontSize: 26, fontWeight: 500, marginTop: 8 }}>{v}</div>
          </Card>
        ))}
      </div>
      <Card padding={0}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px" }}>
          <div style={{ fontSize: "var(--font-size-large)", fontWeight: 590, letterSpacing: "-0.012em" }}>Tài khoản</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <Input placeholder="Tìm theo tên, email…" leadingIcon={<Icon n="search" s={16} />} containerStyle={{ width: 220 }} />
            <Button variant="secondary" leadingIcon={<Icon n="sliders-horizontal" s={16} />}>Lọc</Button>
            <Button variant="primary" leadingIcon={<Icon n="user-plus" s={16} />}>Mời thành viên</Button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1fr 60px", gap: 12, padding: "8px 18px", fontSize: "var(--font-size-mini)", color: "var(--color-text-quaternary)", fontWeight: 510, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--color-border-primary)" }}>
          <span>Người dùng</span><span>Vai trò</span><span>Trạng thái</span><span>Hoạt động</span><span></span>
        </div>
        {ACCOUNTS.map((a, i) => <AccountRow key={i} a={a} />)}
      </Card>
    </div>
  );
}

function AccountRow({ a }) {
  const [hover, setHover] = React.useState(false);
  const st = ACC_STATUS[a[3]];
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1fr 60px", alignItems: "center", gap: 12, padding: "11px 18px", borderTop: "1px solid var(--color-border-primary)", background: hover ? "var(--color-bg-level-1)" : "transparent", transition: "background var(--duration) var(--ease-signature)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
        <Avatar name={a[0]} size={32} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "var(--font-size-regular)", fontWeight: 510 }}>{a[0]}</div>
          <div style={{ fontSize: "var(--font-size-mini)", color: "var(--color-text-tertiary)", fontFamily: "var(--font-monospace)" }}>{a[1]}</div>
        </div>
      </div>
      <span><Badge tone={ROLE_TONE[a[2]]}>{ROLE_LABEL[a[2]]}</Badge></span>
      <span><Badge tone={st[0]} dot>{st[1]}</Badge></span>
      <span style={{ fontSize: "var(--font-size-small)", color: "var(--color-text-tertiary)" }}>{a[4]}</span>
      <span style={{ display: "flex", justifyContent: "flex-end", opacity: hover ? 1 : 0.4 }}><Icon n="more-horizontal" s={18} c="var(--color-text-tertiary)" /></span>
    </div>
  );
}

/* ---------- Reports view ---------- */
function ReportsView() {
  const [tab, setTab] = React.useState("all");
  const counts = REPORTS.reduce((m, r) => { m[r[3]] = (m[r[3]] || 0) + 1; return m; }, {});
  const filtered = tab === "all" ? REPORTS : REPORTS.filter((r) => r[3] === tab);
  return (
    <div style={{ padding: 28, maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
        {[["Tổng báo cáo", String(REPORTS.length), "neutral"], ["Chờ duyệt", String(counts.review || 0), "review"], ["Đã phát hành", String(counts.published || 0), "published"], ["Nháp", String(counts.draft || 0), "draft"]].map(([l, v, t]) => (
          <Card key={l} padding={18} style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: `var(--status-${t === "neutral" ? "draft" : t})` }} />
              <div style={{ fontSize: "var(--font-size-small)", color: "var(--color-text-tertiary)" }}>{l}</div>
            </div>
            <div style={{ fontFamily: "var(--font-monospace)", fontSize: 26, fontWeight: 500, marginTop: 8 }}>{v}</div>
          </Card>
        ))}
      </div>
      <Card padding={0}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px 0" }}>
          <div style={{ fontSize: "var(--font-size-large)", fontWeight: 590, letterSpacing: "-0.012em" }}>Báo cáo &amp; tài liệu</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <Input placeholder="Tìm báo cáo…" leadingIcon={<Icon n="search" s={16} />} containerStyle={{ width: 220 }} />
            <Button variant="primary" leadingIcon={<Icon n="upload" s={16} />}>Tải lên PDF</Button>
          </div>
        </div>
        <div style={{ padding: "10px 18px 0" }}>
          <Tabs value={tab} onChange={setTab} items={[
            { value: "all", label: "Tất cả", badge: REPORTS.length },
            { value: "review", label: "Chờ duyệt", badge: counts.review || 0 },
            { value: "draft", label: "Nháp", badge: counts.draft || 0 },
            { value: "published", label: "Đã phát hành", badge: counts.published || 0 },
          ]} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1.2fr 1.2fr 1fr 0.9fr 120px", gap: 12, padding: "12px 18px 8px", fontSize: "var(--font-size-mini)", color: "var(--color-text-quaternary)", fontWeight: 510, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          <span>Tài liệu</span><span>Quỹ</span><span>Người tạo</span><span>Trạng thái</span><span>Cập nhật</span><span></span>
        </div>
        {filtered.map((r, i) => <ReportRow key={i} r={r} />)}
      </Card>
    </div>
  );
}

function ReportRow({ r }) {
  const [hover, setHover] = React.useState(false);
  const canApprove = r[3] === "review";
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: "grid", gridTemplateColumns: "2.2fr 1.2fr 1.2fr 1fr 0.9fr 120px", alignItems: "center", gap: 12, padding: "11px 18px", borderTop: "1px solid var(--color-border-primary)", background: hover ? "var(--color-bg-level-1)" : "transparent", transition: "background var(--duration) var(--ease-signature)" }}>
      <a href="../pdf-viewer/index.html" style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0, color: "inherit", textDecoration: "none" }}>
        <span style={{ width: 30, height: 36, borderRadius: 4, background: "var(--color-bg-level-2)", border: "1px solid var(--color-border-primary)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <Icon n="file-text" s={15} c="var(--color-text-secondary)" />
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: "var(--font-size-regular)", fontWeight: 510, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r[0]}</span>
          <span style={{ fontSize: 11, color: "var(--color-text-quaternary)", fontFamily: "var(--font-monospace)" }}>{r[5]}</span>
        </span>
      </a>
      <span style={{ fontSize: "var(--font-size-small)", color: "var(--color-text-secondary)" }}>{r[1]}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "var(--font-size-small)", color: "var(--color-text-secondary)" }}><Avatar name={r[2]} size={22} />{r[2]}</span>
      <span><Badge tone={r[3]} dot>{REP_STATUS[r[3]]}</Badge></span>
      <span style={{ fontSize: "var(--font-size-small)", color: "var(--color-text-tertiary)", fontFamily: "var(--font-monospace)" }}>{r[4]}</span>
      <span style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
        {canApprove && hover ? (
          <>
            <Button size="sm" variant="primary">Duyệt</Button>
            <Button size="sm" variant="ghost">Từ chối</Button>
          </>
        ) : (
          <span style={{ opacity: hover ? 1 : 0.4 }}><Icon n="more-horizontal" s={18} c="var(--color-text-tertiary)" /></span>
        )}
      </span>
    </div>
  );
}

function Admin() {
  const [active, setActive] = React.useState("reports");
  return (
    <AppShell
      nav={ADMIN_NAV} footerNav={ADMIN_FOOTER} activeKey={active} onNav={setActive}
      user="Nguyễn Minh Anh" role="Quản trị tối cao"
      title={active === "accounts" ? "Tài khoản" : "Báo cáo"}
      actions={<Badge tone="accent" dot>SUPER_ADMIN</Badge>}
    >
      {active === "accounts" ? <AccountsView /> : <ReportsView />}
    </AppShell>
  );
}

window.Admin = Admin;
