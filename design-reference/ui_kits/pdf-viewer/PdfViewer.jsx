/* Blackcrest — PDF Viewer (core surface). Composes DS components + BcReport pages. */
const { Button, IconButton, Badge, Tabs, Avatar, Tooltip, Dialog, Input } = window.BlackcrestDesignSystem_e9728c;
const { PAGES, META } = window.BcReport;

function VIc({ n, s = 18, c }) { return <i data-lucide={n} style={{ width: s, height: s, color: c }} />; }

/* ---------- Top bar ---------- */
function TopBar({ role, setRole, panelOpen, setPanelOpen }) {
  return (
    <header style={{ height: 56, flex: "none", display: "flex", alignItems: "center", gap: 14, padding: "0 14px 0 12px", background: "var(--color-bg-primary)", borderBottom: "1px solid var(--color-border-primary)" }}>
      <a href="../portal/index.html" style={{ display: "inline-flex" }}>
        <IconButton label="Quay lại cổng"><VIc n="arrow-left" /></IconButton>
      </a>
      <div style={{ width: 1, height: 24, background: "var(--color-border-primary)" }} />
      <span style={{ width: 30, height: 36, borderRadius: 4, background: "var(--color-bg-level-2)", border: "1px solid var(--color-border-primary)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
        <VIc n="file-text" s={16} c="var(--color-text-secondary)" />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ fontSize: "var(--font-size-regular)", fontWeight: 590, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{META.name}</span>
          <Badge tone="published" dot>Đã phát hành</Badge>
        </div>
        <div style={{ fontSize: "var(--font-size-mini)", color: "var(--color-text-tertiary)" }}>{META.fund} · {META.version}</div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
        <RoleSwitch role={role} setRole={setRole} />
        <Tooltip content="Tìm trong tài liệu"><IconButton label="Tìm"><VIc n="search" /></IconButton></Tooltip>
        <Tooltip content="Tải xuống"><IconButton label="Tải xuống"><VIc n="download" /></IconButton></Tooltip>
        <Tooltip content="In"><IconButton label="In"><VIc n="printer" /></IconButton></Tooltip>
        <Tooltip content="Chia sẻ"><IconButton label="Chia sẻ"><VIc n="share-2" /></IconButton></Tooltip>
        <div style={{ width: 1, height: 24, background: "var(--color-border-primary)", margin: "0 2px" }} />
        <Tooltip content={panelOpen ? "Ẩn bảng" : "Hiện bảng"} side="bottom">
          <IconButton label="Bảng thông tin" active={panelOpen} onClick={() => setPanelOpen(!panelOpen)}><VIc n="panel-right" /></IconButton>
        </Tooltip>
      </div>
    </header>
  );
}

function RoleSwitch({ role, setRole }) {
  const opts = [["viewer", "Người xem"], ["approver", "Người duyệt"]];
  return (
    <div style={{ display: "flex", padding: 2, background: "var(--color-bg-level-2)", borderRadius: 8, marginRight: 4 }}>
      {opts.map(([k, l]) => (
        <button key={k} onClick={() => setRole(k)} style={{
          border: "none", padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontFamily: "var(--font-regular)",
          fontSize: "var(--font-size-mini)", fontWeight: 510,
          background: role === k ? "var(--color-bg-primary)" : "transparent",
          color: role === k ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
          boxShadow: role === k ? "var(--shadow-low)" : "none", transition: "all var(--duration) var(--ease-signature)",
        }}>{l}</button>
      ))}
    </div>
  );
}

/* ---------- Thumbnail rail ---------- */
function ThumbRail({ current, onJump }) {
  return (
    <aside style={{ width: 168, flex: "none", borderRight: "1px solid var(--color-border-primary)", background: "var(--color-bg-level-1)", overflow: "auto", padding: "16px 0" }}>
      {PAGES.map((p, i) => {
        const active = current === i + 1;
        return (
          <button key={i} onClick={() => onJump(i)} style={{ display: "block", width: "100%", border: "none", background: "transparent", cursor: "pointer", padding: "6px 0 14px" }}>
            <div style={{ width: 96, height: 136, margin: "0 auto", borderRadius: 4, overflow: "hidden", background: "#fff", outline: active ? "2px solid var(--color-accent)" : "1px solid var(--color-border-secondary)", boxShadow: active ? "var(--shadow-medium)" : "var(--shadow-low)", position: "relative" }}>
              <div style={{ transform: "scale(0.1208)", transformOrigin: "top left", width: 794, height: 1123, pointerEvents: "none" }}>{p.el}</div>
            </div>
            <div style={{ marginTop: 7, fontSize: "var(--font-size-mini)", fontWeight: active ? 590 : 510, color: active ? "var(--color-accent)" : "var(--color-text-tertiary)" }}>{i + 1}</div>
          </button>
        );
      })}
    </aside>
  );
}

/* ---------- Canvas ---------- */
function Canvas({ zoom, scrollRef, pageRefs }) {
  return (
    <div ref={scrollRef} style={{ flex: 1, overflow: "auto", background: "var(--color-bg-level-3)", padding: "32px 0 120px" }}>
      <div style={{ zoom: zoom, display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
        {PAGES.map((p, i) => (
          <div key={i} ref={(el) => (pageRefs.current[i] = el)} data-page={i + 1}>{p.el}</div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Floating toolbar ---------- */
function Toolbar({ current, total, zoom, onPrev, onNext, onZoom, onFit }) {
  return (
    <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 4, padding: 6, background: "var(--color-bg-primary)", border: "1px solid var(--color-border-primary)", borderRadius: 12, boxShadow: "var(--shadow-high)", zIndex: 10 }}>
      <IconButton label="Trang trước" size="sm" onClick={onPrev}><VIc n="chevron-up" s={17} /></IconButton>
      <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 6px", fontFamily: "var(--font-monospace)", fontSize: "var(--font-size-small)", color: "var(--color-text-secondary)" }}>
        <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{current}</span>
        <span style={{ color: "var(--color-text-quaternary)" }}>/ {total}</span>
      </div>
      <IconButton label="Trang sau" size="sm" onClick={onNext}><VIc n="chevron-down" s={17} /></IconButton>
      <div style={{ width: 1, height: 20, background: "var(--color-border-primary)", margin: "0 4px" }} />
      <IconButton label="Thu nhỏ" size="sm" onClick={() => onZoom(-0.1)}><VIc n="minus" s={16} /></IconButton>
      <span style={{ minWidth: 44, textAlign: "center", fontFamily: "var(--font-monospace)", fontSize: "var(--font-size-small)", color: "var(--color-text-secondary)" }}>{Math.round(zoom * 100)}%</span>
      <IconButton label="Phóng to" size="sm" onClick={() => onZoom(0.1)}><VIc n="plus" s={16} /></IconButton>
      <div style={{ width: 1, height: 20, background: "var(--color-border-primary)", margin: "0 4px" }} />
      <Tooltip content="Vừa chiều rộng"><IconButton label="Vừa khung" size="sm" onClick={onFit}><VIc n="maximize-2" s={15} /></IconButton></Tooltip>
    </div>
  );
}

/* ---------- Right panel ---------- */
const TIMELINE = [
  ["Tạo bản nháp", "Lê Thu Hà", "05/10/2026", "approved"],
  ["Gửi phê duyệt", "Lê Thu Hà", "08/10/2026", "approved"],
  ["Phê duyệt", "Trần Quốc Bảo", "11/10/2026", "approved"],
  ["Phát hành", "Hệ thống", "12/10/2026", "published"],
];
const ANNOTS = [
  ["Trần Quốc Bảo", "Số liệu Sharpe đã khớp với bản tính. Duyệt.", "Trang 2", "11/10"],
  ["Lê Thu Hà", "Đã cập nhật biểu đồ hiệu suất tháng 9.", "Trang 3", "10/10"],
];

function MetaRow({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--color-border-primary)" }}>
      <span style={{ fontSize: "var(--font-size-small)", color: "var(--color-text-tertiary)" }}>{k}</span>
      <span style={{ fontSize: "var(--font-size-small)", color: "var(--color-text-primary)", fontWeight: 510, textAlign: "right" }}>{v}</span>
    </div>
  );
}

function SidePanel({ role, onApprove, onReject }) {
  const [tab, setTab] = React.useState("info");
  return (
    <aside style={{ width: 320, flex: "none", borderLeft: "1px solid var(--color-border-primary)", background: "var(--color-bg-primary)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "0 16px" }}>
        <Tabs value={tab} onChange={setTab} items={[
          { value: "info", label: "Thông tin" },
          { value: "notes", label: "Chú thích", badge: ANNOTS.length },
        ]} />
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {tab === "info" ? (
          <>
            <div style={{ marginBottom: 22 }}>
              <MetaRow k="Quỹ" v={META.fund} />
              <MetaRow k="Kỳ báo cáo" v={META.period} />
              <MetaRow k="Phiên bản" v={META.version} />
              <MetaRow k="Người tạo" v={META.author} />
              <MetaRow k="Người duyệt" v={META.approver} />
              <MetaRow k="Ngày phát hành" v={META.published} />
              <MetaRow k="Số trang" v={META.pages} />
              <MetaRow k="Dung lượng" v={META.size} />
            </div>
            <div className="bc-overline" style={{ marginBottom: 12 }}>Quy trình duyệt</div>
            <div style={{ position: "relative", paddingLeft: 4 }}>
              {TIMELINE.map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 12, position: "relative", paddingBottom: i < TIMELINE.length - 1 ? 18 : 0 }}>
                  {i < TIMELINE.length - 1 && <span style={{ position: "absolute", left: 7, top: 18, bottom: 0, width: 2, background: "var(--color-border-secondary)" }} />}
                  <span style={{ width: 16, height: 16, borderRadius: "50%", flex: "none", background: `var(--status-${t[3]})`, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
                    <VIc n="check" s={10} c="#fff" />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "var(--font-size-small)", fontWeight: 590, color: "var(--color-text-primary)" }}>{t[0]}</div>
                    <div style={{ fontSize: "var(--font-size-mini)", color: "var(--color-text-tertiary)" }}>{t[1]} · {t[2]}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {ANNOTS.map((a, i) => (
              <div key={i} style={{ padding: 12, background: "var(--color-bg-level-1)", border: "1px solid var(--color-border-primary)", borderRadius: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                  <Avatar name={a[0]} size={22} />
                  <span style={{ fontSize: "var(--font-size-small)", fontWeight: 590 }}>{a[0]}</span>
                  <span style={{ marginLeft: "auto", fontSize: "var(--font-size-mini)", color: "var(--color-text-quaternary)" }}>{a[3]}</span>
                </div>
                <p style={{ fontSize: "var(--font-size-small)", color: "var(--color-text-secondary)", lineHeight: 1.5, margin: "0 0 8px" }}>{a[1]}</p>
                <Badge tone="neutral" size="sm">{a[2]}</Badge>
              </div>
            ))}
            <Input placeholder="Thêm chú thích…" containerStyle={{ marginTop: 4 }} />
          </div>
        )}
      </div>
      {role === "approver" && (
        <div style={{ flex: "none", padding: 14, borderTop: "1px solid var(--color-border-primary)", background: "var(--color-bg-level-1)" }}>
          <div className="bc-overline" style={{ marginBottom: 10 }}>Hành động duyệt</div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="primary" fullWidth leadingIcon={<VIc n="check" s={16} />} onClick={onApprove}>Phê duyệt</Button>
            <Button variant="secondary" leadingIcon={<VIc n="x" s={16} />} onClick={onReject}>Từ chối</Button>
          </div>
        </div>
      )}
    </aside>
  );
}

/* ---------- Main ---------- */
function PdfViewer() {
  const [zoom, setZoom] = React.useState(0.92);
  const [current, setCurrent] = React.useState(1);
  const [panelOpen, setPanelOpen] = React.useState(true);
  const [role, setRole] = React.useState("approver");
  const [dialog, setDialog] = React.useState(null); // 'approve' | 'reject' | null
  const [toast, setToast] = React.useState(null);
  const scrollRef = React.useRef(null);
  const pageRefs = React.useRef([]);

  React.useEffect(() => { window.lucide && window.lucide.createIcons(); });

  // Track current page via IntersectionObserver
  React.useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setCurrent(Number(e.target.dataset.page)); });
    }, { root, threshold: 0.5 });
    pageRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const jump = (i) => {
    const el = pageRefs.current[i];
    const root = scrollRef.current;
    if (el && root) root.scrollTo({ top: el.offsetTop - 24, behavior: "smooth" });
  };
  const step = (d) => jump(Math.min(PAGES.length - 1, Math.max(0, current - 1 + d)));
  const changeZoom = (d) => setZoom((z) => Math.min(2, Math.max(0.5, Math.round((z + d) * 100) / 100)));
  const fit = () => setZoom(0.92);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--color-bg-primary)", fontFamily: "var(--font-regular)" }}>
      <TopBar role={role} setRole={setRole} panelOpen={panelOpen} setPanelOpen={setPanelOpen} />
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        <ThumbRail current={current} onJump={jump} />
        <div style={{ flex: 1, position: "relative", display: "flex" }}>
          <Canvas zoom={zoom} scrollRef={scrollRef} pageRefs={pageRefs} />
          <Toolbar current={current} total={PAGES.length} zoom={zoom} onPrev={() => step(-1)} onNext={() => step(1)} onZoom={changeZoom} onFit={fit} />
        </div>
        {panelOpen && <SidePanel role={role} onApprove={() => setDialog("approve")} onReject={() => setDialog("reject")} />}
      </div>

      <Dialog
        open={dialog === "approve"} onClose={() => setDialog(null)}
        title="Phê duyệt báo cáo?"
        description="Báo cáo sẽ chuyển sang trạng thái Đã duyệt và sẵn sàng phát hành tới nhà đầu tư."
        footer={<>
          <Button variant="ghost" onClick={() => setDialog(null)}>Huỷ</Button>
          <Button variant="primary" onClick={() => { setDialog(null); setToast("approved"); }}>Phê duyệt</Button>
        </>}
      >
        <Input label="Ghi chú duyệt (tuỳ chọn)" placeholder="Số liệu đã đối chiếu…" />
      </Dialog>
      <Dialog
        open={dialog === "reject"} onClose={() => setDialog(null)}
        title="Từ chối báo cáo?"
        description="Tài liệu sẽ được trả lại cho biên tập viên kèm lý do."
        footer={<>
          <Button variant="ghost" onClick={() => setDialog(null)}>Huỷ</Button>
          <Button variant="danger" onClick={() => { setDialog(null); setToast("rejected"); }}>Từ chối</Button>
        </>}
      >
        <Input label="Lý do từ chối" placeholder="Cần bổ sung số liệu giao dịch…" />
      </Dialog>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200 }}>
          <BcToast kind={toast} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}

function BcToast({ kind, onClose }) {
  const { Toast } = window.BlackcrestDesignSystem_e9728c;
  React.useEffect(() => { window.lucide && window.lucide.createIcons(); });
  const map = {
    approved: ["success", "check-circle-2", "Đã phê duyệt báo cáo", "Báo cáo Quý III sẵn sàng phát hành."],
    rejected: ["danger", "x-circle", "Đã từ chối báo cáo", "Đã gửi lại cho biên tập viên."],
  }[kind];
  return <Toast tone={map[0]} icon={<i data-lucide={map[1]} style={{ width: 18, height: 18 }} />} title={map[2]} message={map[3]} onClose={onClose} />;
}

window.PdfViewer = PdfViewer;
