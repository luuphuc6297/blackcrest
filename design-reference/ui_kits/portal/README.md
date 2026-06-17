# Portal — Cổng nhà đầu tư

Route `/portal` (đã đăng nhập).

- **Portal.jsx** — dùng `BcShell.AppShell` (sidebar + topbar) từ `../shared/AppShell.jsx`. Nội dung: lời chào, hàng KPI (mono numerals), thẻ "Tài liệu gần đây" với Tabs lọc + bảng tài liệu có badge trạng thái.
- Mỗi dòng tài liệu liên kết tới trình xem PDF (`../pdf-viewer/index.html`).
- Compose `Card`, `Badge`, `Button`, `Input`, `Tabs`, `Avatar`.
