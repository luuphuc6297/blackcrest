# Admin — Tài khoản & Báo cáo

Routes `/admin/accounts` (SUPER_ADMIN/APPROVER) và `/admin/reports` (SUPER_ADMIN/EDITOR/APPROVER).

- **Admin.jsx** — một shell quản trị, sidebar chuyển giữa hai view:
  - **Báo cáo (Reports)**: stats theo trạng thái, Tabs lọc (Tất cả / Chờ duyệt / Nháp / Đã phát hành), bảng tài liệu với badge vòng đời. Dòng "Chờ duyệt" hiện nút **Duyệt / Từ chối** khi hover (vai trò APPROVER).
  - **Tài khoản (Accounts)**: stats, bảng người dùng với vai trò (SUPER_ADMIN/EDITOR/APPROVER/VIEWER) và trạng thái, nút "Mời thành viên".
- Compose `Card`, `Badge`, `Button`, `Input`, `Avatar`, `Tabs`. Dòng báo cáo liên kết tới `../pdf-viewer/index.html`.
