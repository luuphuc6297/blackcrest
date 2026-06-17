/* Blackcrest — mock fund-report PDF pages (so the viewer renders a believable document).
 * Exposes window.BcReport = { PAGES, META }. Each page is a 794×1123 (A4 @96dpi) white sheet. */
(function () {
  const SERIF = "var(--font-serif-display)";
  const MONO = "var(--font-monospace)";

  function Watermark() {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", overflow: "hidden" }}>
        <span style={{ fontFamily: "var(--font-regular)", fontSize: 86, fontWeight: 680, color: "rgba(20,22,27,0.05)", letterSpacing: "0.1em", transform: "rotate(-32deg)", whiteSpace: "nowrap" }}>BẢO MẬT</span>
      </div>
    );
  }

  function PageFrame({ n, children, pad = 64 }) {
    return (
      <div style={{ position: "relative", width: 794, minHeight: 1123, background: "#fff", boxShadow: "var(--shadow-medium)", borderRadius: 2, overflow: "hidden" }}>
        <Watermark />
        <div style={{ position: "relative", padding: pad, minHeight: 1123, boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
          {children}
          <div style={{ marginTop: "auto", paddingTop: 28, display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9aa0a8", fontFamily: MONO, borderTop: "1px solid #eee", marginTop: 36 }}>
            <span>BLACKCREST · QUỸ CÂN BẰNG</span>
            <span>Bảo mật — chỉ dành cho nhà đầu tư · Trang {n} / 5</span>
          </div>
        </div>
      </div>
    );
  }

  function H({ children, sz = 22 }) {
    return <h2 style={{ fontFamily: SERIF, fontSize: sz, fontWeight: 600, color: "#1c1d21", letterSpacing: "-0.012em", margin: "0 0 14px" }}>{children}</h2>;
  }
  function P({ children }) {
    return <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "#3c4149", margin: "0 0 13px", textAlign: "justify" }}>{children}</p>;
  }
  function Eyebrow({ children }) {
    return <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.12em", color: "#16181d", textTransform: "uppercase", marginBottom: 8 }}>{children}</div>;
  }

  /* Page 1 — cover */
  const Cover = (
    <PageFrame n={1} pad={0}>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", height: 1123, padding: 64, boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: "#0a0b0d", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="19" height="19" viewBox="0 0 64 64" fill="none"><path d="M16 39 L32 21 L48 39" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /><path d="M20.5 46.5 L32 33.5 L43.5 46.5" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.62" /></svg>
          </div>
          <span style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600 }}>Blackcrest</span>
        </div>
        <div style={{ marginTop: 220 }}>
          <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.14em", color: "#16181d", textTransform: "uppercase" }}>Báo cáo định kỳ cho nhà đầu tư</div>
          <h1 style={{ fontFamily: SERIF, fontSize: 52, lineHeight: 1.08, fontWeight: 600, letterSpacing: "-0.022em", color: "#1c1d21", margin: "20px 0 0" }}>Báo cáo<br />Quý III 2026</h1>
          <div style={{ marginTop: 28, fontFamily: SERIF, fontSize: 22, color: "#3c4149", fontStyle: "italic" }}>Quỹ Cân bằng Blackcrest</div>
        </div>
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 12, color: "#6a6f78", lineHeight: 1.8 }}>
            <div>Kỳ báo cáo: 01/07 – 30/09/2026</div>
            <div>Ngày phát hành: 12/10/2026</div>
            <div>Phiên bản: v3 · Đã phê duyệt</div>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: "#9aa0a8", textAlign: "right" }}>TÀI LIỆU BẢO MẬT<br />KHÔNG SAO CHÉP</div>
        </div>
      </div>
    </PageFrame>
  );

  /* Page 2 — executive summary */
  const Summary = (
    <PageFrame n={2}>
      <Eyebrow>01 — Tóm tắt điều hành</Eyebrow>
      <H>Tổng quan kết quả quý</H>
      <P>Trong quý III năm 2026, Quỹ Cân bằng Blackcrest ghi nhận mức tăng trưởng NAV 8,42% so với đầu năm, vượt chỉ số tham chiếu 1,9 điểm phần trăm. Danh mục duy trì cân bằng giữa tài sản cố định và cổ phiếu niêm yết, với việc gia tăng tỷ trọng trái phiếu doanh nghiệp chất lượng cao trong giai đoạn biến động lãi suất.</P>
      <P>Dòng tiền giải ngân từ các cam kết hiện hữu đạt 78% kế hoạch năm. Quỹ tiếp tục thận trọng với các khoản đầu tư bất động sản trong bối cảnh thanh khoản thị trường còn hạn chế.</P>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, margin: "24px 0" }}>
        {[["NAV / đơn vị", "12.847,02", "+8,42% YTD"], ["Tổng tài sản ròng", "₫ 4.182 tỷ", "+11,3%"], ["Tỷ suất Sharpe", "1,84", "+0,21"]].map(([l, v, s]) => (
          <div key={l} style={{ border: "1px solid #ececef", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, color: "#6a6f78" }}>{l}</div>
            <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 500, color: "#1c1d21", marginTop: 6 }}>{v}</div>
            <div style={{ fontSize: 11, color: "#1f9a3d", marginTop: 5 }}>{s}</div>
          </div>
        ))}
      </div>
      <P>Ban điều hành duy trì quan điểm tích cực thận trọng cho quý IV, với trọng tâm bảo toàn vốn và tận dụng cơ hội tái cơ cấu danh mục khi định giá thị trường trở nên hấp dẫn hơn.</P>
    </PageFrame>
  );

  /* Page 3 — performance chart + table */
  const months = [["T7", 62], ["T8", 48], ["T9", 80]];
  const Performance = (
    <PageFrame n={3}>
      <Eyebrow>02 — Hiệu suất</Eyebrow>
      <H>Lợi nhuận theo tháng</H>
      <P>Biểu đồ dưới đây thể hiện lợi nhuận hàng tháng của quỹ trong kỳ báo cáo, so sánh với chỉ số tham chiếu VN-Balanced.</P>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 40, height: 220, padding: "20px 24px", border: "1px solid #ececef", borderRadius: 10, margin: "8px 0 24px" }}>
        {months.map(([m, h]) => (
          <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 160 }}>
              <div style={{ width: 26, height: h * 1.6, background: "#16181d", borderRadius: "3px 3px 0 0" }} />
              <div style={{ width: 26, height: h * 1.2, background: "#cfd0d6", borderRadius: "3px 3px 0 0" }} />
            </div>
            <span style={{ fontFamily: MONO, fontSize: 11, color: "#6a6f78" }}>{m}</span>
          </div>
        ))}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, fontFeatureSettings: "'tnum'" }}>
        <thead><tr style={{ textAlign: "left", color: "#6a6f78", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          <th style={{ padding: "8px 0", borderBottom: "1px solid #ececef" }}>Tháng</th><th style={{ borderBottom: "1px solid #ececef" }}>Quỹ</th><th style={{ borderBottom: "1px solid #ececef" }}>Tham chiếu</th><th style={{ borderBottom: "1px solid #ececef", textAlign: "right" }}>Chênh lệch</th>
        </tr></thead>
        <tbody style={{ fontFamily: MONO, color: "#1c1d21" }}>
          {[["Tháng 7", "+2,81%", "+2,10%", "+0,71"], ["Tháng 8", "+1,94%", "+1,72%", "+0,22"], ["Tháng 9", "+3,40%", "+2,55%", "+0,85"]].map((r) => (
            <tr key={r[0]}><td style={{ padding: "9px 0", borderBottom: "1px solid #f4f4f6", fontFamily: "var(--font-regular)" }}>{r[0]}</td><td style={{ borderBottom: "1px solid #f4f4f6" }}>{r[1]}</td><td style={{ borderBottom: "1px solid #f4f4f6", color: "#6a6f78" }}>{r[2]}</td><td style={{ borderBottom: "1px solid #f4f4f6", textAlign: "right", color: "#1f9a3d" }}>{r[3]}</td></tr>
          ))}
        </tbody>
      </table>
    </PageFrame>
  );

  /* Page 4 — allocation */
  const alloc = [["Cổ phiếu niêm yết", 42, "#16181d"], ["Trái phiếu doanh nghiệp", 28, "#45484f"], ["Bất động sản", 14, "#74777f"], ["Tiền & tương đương", 10, "#a2a5ad"], ["Khác", 6, "#cfd1d6"]];
  const Allocation = (
    <PageFrame n={4}>
      <Eyebrow>03 — Phân bổ tài sản</Eyebrow>
      <H>Cơ cấu danh mục</H>
      <P>Danh mục được phân bổ theo nguyên tắc cân bằng rủi ro, ưu tiên thanh khoản và chất lượng tín dụng trong giai đoạn hiện tại.</P>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, margin: "20px 0" }}>
        {alloc.map(([l, p, c]) => (
          <div key={l}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}>
              <span style={{ color: "#3c4149" }}>{l}</span>
              <span style={{ fontFamily: MONO, color: "#1c1d21", fontWeight: 500 }}>{p}%</span>
            </div>
            <div style={{ height: 9, background: "#f4f4f6", borderRadius: 999 }}>
              <div style={{ height: "100%", width: `${p}%`, background: c, borderRadius: 999 }} />
            </div>
          </div>
        ))}
      </div>
      <P>So với quý trước, tỷ trọng cổ phiếu niêm yết giảm 3 điểm phần trăm, chuyển sang trái phiếu doanh nghiệp nhằm khoá lợi suất trong môi trường lãi suất dự kiến đi ngang.</P>
    </PageFrame>
  );

  /* Page 5 — notes */
  const Notes = (
    <PageFrame n={5}>
      <Eyebrow>04 — Ghi chú quản lý &amp; triển vọng</Eyebrow>
      <H>Triển vọng quý IV 2026</H>
      <P>Chúng tôi kỳ vọng môi trường vĩ mô ổn định hơn trong quý IV, với áp lực lạm phát hạ nhiệt và mặt bằng lãi suất duy trì. Quỹ sẽ tiếp tục chiến lược cân bằng, đồng thời chuẩn bị nguồn lực cho các cơ hội đầu tư tư nhân có chọn lọc.</P>
      <P>Các khoản cam kết mới dự kiến được giải ngân theo tiến độ, ưu tiên các thương vụ có dòng tiền ổn định và biên an toàn định giá rõ ràng.</P>
      <div style={{ marginTop: 28, padding: 20, background: "#f8f8f9", borderRadius: 10, border: "1px solid #ececef" }}>
        <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.1em", color: "#6a6f78", textTransform: "uppercase", marginBottom: 10 }}>Miễn trừ trách nhiệm</div>
        <p style={{ fontSize: 11.5, lineHeight: 1.65, color: "#6a6f78", margin: 0 }}>Tài liệu này được chuẩn bị riêng cho nhà đầu tư của Quỹ Cân bằng Blackcrest và không được phân phối lại. Hiệu suất trong quá khứ không đảm bảo cho kết quả tương lai. Mọi quyết định đầu tư cần dựa trên bản cáo bạch chính thức.</p>
      </div>
      <div style={{ marginTop: 40, display: "flex", gap: 60 }}>
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 17, color: "#1c1d21", borderBottom: "1px solid #cfd0d6", paddingBottom: 30, width: 180 }}></div>
          <div style={{ fontSize: 11.5, color: "#6a6f78", marginTop: 8 }}>Giám đốc Quỹ</div>
        </div>
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 17, color: "#1c1d21", borderBottom: "1px solid #cfd0d6", paddingBottom: 30, width: 180 }}></div>
          <div style={{ fontSize: 11.5, color: "#6a6f78", marginTop: 8 }}>Người duyệt</div>
        </div>
      </div>
    </PageFrame>
  );

  window.BcReport = {
    PAGES: [
      { title: "Trang bìa", el: Cover },
      { title: "Tóm tắt điều hành", el: Summary },
      { title: "Hiệu suất", el: Performance },
      { title: "Phân bổ tài sản", el: Allocation },
      { title: "Ghi chú & triển vọng", el: Notes },
    ],
    META: {
      name: "Báo cáo Quý III 2026",
      fund: "Quỹ Cân bằng Blackcrest",
      period: "Q3 2026 · 01/07 – 30/09",
      version: "v3",
      author: "Lê Thu Hà",
      approver: "Trần Quốc Bảo",
      published: "12/10/2026",
      size: "2,4 MB",
      pages: 5,
    },
  };
})();
