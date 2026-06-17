/* Blackcrest — Auth screens (login + register). */
const { Button, Input, Checkbox } = window.BlackcrestDesignSystem_e9728c;

function AIc({ n, s = 16, c }) { return <i data-lucide={n} style={{ width: s, height: s, color: c }} />; }

function BrandPanel() {
  return (
    <div style={{ background: "var(--color-bg-inverse)", color: "#f7f8f8", padding: "44px 44px 40px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="20" height="20" viewBox="0 0 64 64" fill="none"><path d="M16 39 L32 21 L48 39" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /><path d="M20.5 46.5 L32 33.5 L43.5 46.5" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.62" /></svg>
        </div>
        <span style={{ fontFamily: "var(--font-serif-display)", fontSize: 22, fontWeight: 600 }}>Blackcrest</span>
      </div>
      <div>
        <p style={{ fontFamily: "var(--font-serif-display)", fontSize: 27, lineHeight: 1.35, fontWeight: 500, letterSpacing: "-0.01em", color: "#f7f8f8" }}>
          “Mỗi báo cáo tới tay nhà đầu tư đều đã được phê duyệt, ký số và ghi nhận dấu vết.”
        </p>
        <div style={{ marginTop: 22, fontSize: "var(--font-size-small)", color: "#8a8f98" }}>Cổng tài liệu cho quản lý gia sản tư nhân</div>
      </div>
      <div style={{ display: "flex", gap: 18, fontSize: "var(--font-size-small)", color: "#8a8f98" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><AIc n="shield-check" s={14} c="#8a8f98" /> Mã hoá đầu cuối</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><AIc n="lock" s={14} c="#8a8f98" /> Tuân thủ SOC 2</span>
      </div>
    </div>
  );
}

function LoginForm({ onSwitch, onSubmit }) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 590, letterSpacing: "-0.018em" }}>Đăng nhập</h1>
        <p style={{ fontSize: "var(--font-size-regular)", color: "var(--color-text-tertiary)", marginTop: 6 }}>Truy cập cổng tài liệu Blackcrest của bạn.</p>
      </div>
      <Input label="Email công việc" type="email" placeholder="ten@quy.vn" leadingIcon={<AIc n="mail" />} defaultValue="minh.anh@blackcrest.vn" />
      <Input label="Mật khẩu" type="password" placeholder="••••••••" leadingIcon={<AIc n="lock" />} defaultValue="password123" />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Checkbox label="Ghi nhớ đăng nhập" defaultChecked />
        <a href="#" style={{ fontSize: "var(--font-size-small)", color: "var(--color-link)", fontWeight: 510 }}>Quên mật khẩu?</a>
      </div>
      <Button variant="primary" size="lg" fullWidth type="submit">Đăng nhập</Button>
      <div style={{ textAlign: "center", fontSize: "var(--font-size-small)", color: "var(--color-text-tertiary)" }}>
        Chưa có tài khoản? <a href="#" onClick={(e) => { e.preventDefault(); onSwitch(); }} style={{ color: "var(--color-link)", fontWeight: 510 }}>Yêu cầu truy cập</a>
      </div>
    </form>
  );
}

function RegisterForm({ onSwitch, onSubmit }) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 590, letterSpacing: "-0.018em" }}>Yêu cầu truy cập</h1>
        <p style={{ fontSize: "var(--font-size-regular)", color: "var(--color-text-tertiary)", marginTop: 6 }}>Tài khoản sẽ được quản trị viên xét duyệt.</p>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <Input label="Họ" placeholder="Nguyễn" containerStyle={{ flex: 1 }} />
        <Input label="Tên" placeholder="Minh Anh" containerStyle={{ flex: 1 }} />
      </div>
      <Input label="Email công việc" type="email" placeholder="ten@quy.vn" leadingIcon={<AIc n="mail" />} />
      <Input label="Tổ chức / Quỹ" placeholder="Quỹ Cân bằng Blackcrest" leadingIcon={<AIc n="building-2" />} />
      <Input label="Mật khẩu" type="password" placeholder="Tối thiểu 8 ký tự" leadingIcon={<AIc n="lock" />} hint="Dùng chữ hoa, số và ký tự đặc biệt." />
      <Checkbox label={<span>Tôi đồng ý với <a href="#" style={{ color: "var(--color-link)" }}>Điều khoản</a> &amp; <a href="#" style={{ color: "var(--color-link)" }}>Bảo mật</a></span>} />
      <Button variant="primary" size="lg" fullWidth type="submit">Gửi yêu cầu</Button>
      <div style={{ textAlign: "center", fontSize: "var(--font-size-small)", color: "var(--color-text-tertiary)" }}>
        Đã có tài khoản? <a href="#" onClick={(e) => { e.preventDefault(); onSwitch(); }} style={{ color: "var(--color-link)", fontWeight: 510 }}>Đăng nhập</a>
      </div>
    </form>
  );
}

function Auth() {
  const [mode, setMode] = React.useState("login");
  const [done, setDone] = React.useState(false);
  React.useEffect(() => { window.lucide && window.lucide.createIcons(); });

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "minmax(380px, 1fr) 1.05fr", background: "var(--color-bg-primary)" }}>
      <div style={{ display: "none" }} />
      <div style={{ gridColumn: "1", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        {done ? (
          <div style={{ maxWidth: 360, textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--color-success-tint)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
              <AIc n="check" s={26} c="var(--color-success)" />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 590, letterSpacing: "-0.018em" }}>{mode === "login" ? "Chào mừng trở lại" : "Đã gửi yêu cầu"}</h1>
            <p style={{ fontSize: "var(--font-size-regular)", color: "var(--color-text-tertiary)", marginTop: 8 }}>
              {mode === "login" ? "Đang chuyển tới cổng tài liệu của bạn…" : "Quản trị viên sẽ xét duyệt và phản hồi qua email."}
            </p>
            <div style={{ marginTop: 22 }}><Button variant="secondary" onClick={() => setDone(false)}>Quay lại</Button></div>
          </div>
        ) : mode === "login" ? (
          <LoginForm onSwitch={() => setMode("register")} onSubmit={() => setDone(true)} />
        ) : (
          <RegisterForm onSwitch={() => setMode("login")} onSubmit={() => setDone(true)} />
        )}
      </div>
      <div style={{ gridColumn: "2" }}>
        <BrandPanel />
      </div>
    </div>
  );
}

window.Auth = Auth;
