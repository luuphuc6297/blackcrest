# PDF Viewer — Trình xem tài liệu (lõi hệ thống)

Đây là **màn hình quan trọng nhất** của Blackcrest: nơi nhà đầu tư đọc và người duyệt phê duyệt báo cáo PDF.

- **PdfViewer.jsx** — shell trình xem:
  - **Top bar**: quay lại cổng, icon + tên tài liệu + badge trạng thái + quỹ/phiên bản; bên phải: chuyển vai trò (Người xem ↔ Người duyệt), tìm, tải, in, chia sẻ, ẩn/hiện bảng.
  - **Rail trang** (trái): thumbnail thật của từng trang (scale 0.12), trang hiện tại được tô viền accent, click để nhảy.
  - **Canvas** (giữa): cuộn dọc các trang A4, zoom 50–200% qua `zoom`, theo dõi trang hiện tại bằng IntersectionObserver, watermark "BẢO MẬT".
  - **Thanh công cụ nổi**: điều hướng trang, % zoom, vừa khung.
  - **Bảng phải**: tab Thông tin (metadata + timeline quy trình duyệt) và Chú thích. Khi vai trò = Người duyệt, hiện nút **Phê duyệt / Từ chối** → mở `Dialog` xác nhận → `Toast`.
- **ReportPages.jsx** — nội dung 5 trang báo cáo quỹ giả lập (bìa, tóm tắt, hiệu suất + biểu đồ, phân bổ tài sản, ghi chú) bằng tiếng Việt, dùng serif display + mono cho số liệu.

Compose `Button`, `IconButton`, `Badge`, `Tabs`, `Avatar`, `Tooltip`, `Dialog`, `Input`, `Toast`.
