# Blackcrest — Design System

> Nền tảng tài liệu cho **quản lý gia sản tư nhân** (private wealth / fintech).
> Lõi sản phẩm xoay quanh **xem, phê duyệt và phân phối báo cáo PDF** tới nhà đầu tư,
> với phân quyền theo vai trò (SUPER_ADMIN · EDITOR · APPROVER) và quy trình
> nháp → duyệt → phát hành.
>
> Ngôn ngữ thiết kế kế thừa sự chính xác, nhanh, low-chrome của **Linear**, nhưng **đơn sắc trắng–đen (light-first)** —
> **đen near-black là màu thương hiệu/hành động duy nhất**, không dùng tím/màu. Thêm sự **uy tín biên tập,
> quyền lực** kiểu private equity (giống **Blackstone**: vững vàng, sạch, không cứng nhắc) qua serif hiển thị.
>
> **Toàn bộ giao diện & dữ liệu mẫu bằng tiếng Việt.**

---

## Bối cảnh & nguồn

- **Sản phẩm:** Blackcrest — cổng tài liệu đầu tư tư nhân. Các route: `/` (landing công khai),
  `/login`, `/register`, `/portal` (nhà đầu tư), `/admin/accounts`, `/admin/reports`, và
  **trình xem PDF** (màn hình lõi, quan trọng nhất).
- **Cảm hứng hệ thống thiết kế:** Linear (`linear.app`) — token màu/typography/motion trích từ spec do người dùng cung cấp.
- **Tông thương hiệu:** tham chiếu Blackstone về sự uy tín, trang trọng của ngành quản lý tài sản.
- Không có codebase hay Figma đính kèm; hệ thống được dựng từ spec Linear + yêu cầu của người dùng.

---

## CONTENT FUNDAMENTALS — cách viết nội dung

**Ngôn ngữ:** Tiếng Việt là chính, cho cả UI lẫn dữ liệu mẫu. Thuật ngữ tài chính dùng tiếng Việt
(NAV, Sharpe… giữ nguyên khi đã phổ biến).

- **Giọng điệu:** chuyên nghiệp, điềm tĩnh, chính xác — như một định chế tài chính uy tín. Không "marketing" quá đà.
- **Xưng hô:** trung tính, lịch sự. Với nhà đầu tư có thể dùng "bạn/chị/anh" trong lời chào ("Chào buổi sáng, chị Minh Anh");
  trong tài liệu/hệ thống dùng văn phong khách quan, không ngôi.
- **Nhãn UI:** ngắn, động từ rõ ràng — "Phê duyệt", "Từ chối", "Tải lên PDF", "Mời thành viên", "Yêu cầu truy cập".
- **Casing:** câu thường (sentence case) cho nút và tiêu đề. CHỮ HOA + giãn chữ chỉ dùng cho overline/eyebrow nhỏ
  (vd. "VÌ SAO BLACKCREST", "QUY TRÌNH DUYỆT").
- **Số liệu:** luôn dùng mono + dấu phân cách kiểu Việt (`₫ 1.284.500.000`, `12.847,02`, `+8,42%`). Số âm dùng dấu `−`.
- **Trạng thái tài liệu:** Nháp · Chờ duyệt · Đã duyệt · Đã phát hành · Từ chối · Lưu trữ.
- **Không dùng emoji.** Không dùng dấu chấm than. Tránh từ sáo rỗng.
- **Ví dụ tiêu đề biên tập (serif):** "Tài liệu đầu tư, được kiểm soát đến từng trang", "Được xây cho sự chính xác".

---

## VISUAL FOUNDATIONS — nền tảng thị giác

- **Nền & độ sâu:** nền sáng `#ffffff`. Tạo chiều sâu bằng **các bước surface** (`level-1/2/3`) và **viền hairline**
  (`rgba(16,17,26,.07)` hoặc `#e8e8ec`) — *không* dùng bóng nặng. Bóng chỉ tinh tế (`shadow-low/medium`) cho thẻ và menu nổi.
- **Một sắc accent:** **đen near-black `#16181d`** (brand `#0a0b0d`) là **màu hành động/thương hiệu duy nhất** — nút chính (đen, chữ trắng), link, focus ring, trạng thái active, "đã phát hành". Tuyệt đối **không dùng tím/màu**; chỉ trắng–đen–xám, mang khí chất quyền lực, uy tín kiểu Blackstone. Màu chỉ xuất hiện rất hạn chế ở status chức năng (xanh duyệt / đỏ từ chối / hổ phách chờ) ở mức trầm.
- **Typography:**
  - *Inter* cho UI/body, bật `cv01/ss03`; nhãn dùng weight **510**, tiêu đề **590**. Tracking âm dần khi tiêu đề lớn (−0.012 → −0.022em).
  - *Source Serif 4* (thay Tiempos Headline) cho khoảnh khắc biên tập lớn: hero, trang bìa báo cáo, trích dẫn.
  - *IBM Plex Mono* (thay Berkeley Mono) cho **mọi số liệu** (tnum) và metadata kỹ thuật.
- **Bo góc:** control 6px · card 12px · modal 16px · pill/avatar tròn hoàn toàn. Trang PDF gần như vuông (radius 2px).
- **Imagery:** hệ thống thiên về **không ảnh** — ưu tiên type, surface, dữ liệu. "Ảnh sản phẩm" là mock UI/tài liệu, tông trung tính sạch.
  Dữ liệu hoá bằng thanh CSS phẳng (không 3D, không gradient loè loẹt).
- **Chuyển động:** nhanh — `180ms` trên `cubic-bezier(.16,1,.3,1)` (signature). Có thư viện easing đầy đủ
  (`--ease-out-cubic` cho entrance, `--ease-in-out-expo` cho reveal lớn). Dialog: fade scrim + pop nhẹ (translateY 8px + scale .98).
- **Hover:** đổi nền lên một bậc surface (`tertiary`); nút primary tối lại. **Press:** nền `quaternary` (tối hơn nữa). Card interactive: nhấc 1px + shadow medium.
- **Focus:** ring đen `0 0 0 3px rgba(20,22,27,.28)` — không bao giờ bỏ focus, không dùng outline mặc định.
- **Transparency/blur:** chỉ ở header sticky (marketing) và scrim dialog (`blur(2px)`). Không lạm dụng glass.
- **Watermark bảo mật:** mọi trang PDF có chữ "BẢO MẬT" mờ chéo `rgba(20,22,27,.05)` + footer "chỉ dành cho nhà đầu tư".- **Dải tối quyền lực:** CTA marketing và panel đăng nhập dùng `--color-bg-inverse` (`#0c0d10`) — nền đen đặc, chữ trắng, serif lớn.

---

## ICONOGRAPHY

- **Bộ icon:** [**Lucide**](https://lucide.dev) qua CDN (`unpkg.com/lucide`). Nét mảnh (~1.75px), bo tròn — hợp tông Linear/Blackcrest.
  Kích thước chuẩn **16px** (trong nút/nhãn), **18px** (toolbar PDF, IconButton).
  Dùng: `<i data-lucide="download"></i>` rồi gọi `lucide.createIcons()` sau khi render.
- **Icon thường gặp:** `file-text` (tài liệu/PDF), `download` `printer` `share-2` (hành động PDF), `check` `x` (duyệt/từ chối),
  `users` `user-plus` (tài khoản), `file-stack` `line-chart` (báo cáo), `shield-check` `lock` (bảo mật), `search` `sliders-horizontal`.
- **Logo/mark:** SVG riêng trong `assets/` — một "crest" (đỉnh xếp lớp) trong tile đen. KHÔNG vẽ lại; dùng file có sẵn.
- **Không dùng emoji.** Không dùng ký tự unicode làm icon. Số liệu tài chính dùng mono chứ không icon hoá.
- Icon tài liệu PDF luôn đặt trên nền trung tính `bg-level-2` + viền hairline, icon màu `text-secondary` — quy ước nhận diện file PDF (đơn sắc, không đỏ).

---

## INDEX — manifest thư mục gốc

| Đường dẫn | Nội dung |
|---|---|
| `styles.css` | Điểm vào CSS toàn cục (chỉ gồm `@import`). Consumer chỉ cần link file này. |
| `tokens/` | `fonts · colors · typography · spacing · shape · elevation · motion · base` — toàn bộ design token. |
| `assets/` | Logo Blackcrest: `logo-mark.svg`, `logo-mark-bare.svg`, `logo-wordmark.svg`, `logo-wordmark-on-dark.svg`. |
| `guidelines/` | 15 thẻ specimen (`@dsCard`): Màu, Type, Spacing/Shape/Elevation/Motion, Brand. |
| `components/` | Primitive tái sử dụng (mỗi cái có `.jsx` + `.d.ts` + `.prompt.md`; mỗi nhóm có thẻ card). |
| `ui_kits/` | Recreation đầy đủ màn hình từng sản phẩm (xem dưới). |
| `SKILL.md` | Bao đóng Agent Skill để dùng trong Claude Code. |

### Components (`window.BlackcrestDesignSystem_e9728c`)
- **buttons/** — `Button`, `IconButton`
- **forms/** — `Input`, `Select`, `Checkbox`, `Switch`
- **feedback/** — `Badge`, `Tag`, `Tooltip`, `Dialog`, `Toast`
- **data-display/** — `Avatar`, `Card`, `Tabs`

### UI kits (`ui_kits/<product>/index.html`)
- **marketing/** — Trang chủ công khai (`/`).
- **auth/** — Đăng nhập & Yêu cầu truy cập (`/login`, `/register`).
- **portal/** — Cổng nhà đầu tư: tổng quan tài sản + thư viện tài liệu (`/portal`).
- **admin/** — Quản trị: Báo cáo (quy trình duyệt) + Tài khoản (vai trò) (`/admin/*`).
- **pdf-viewer/** — **Trình xem & phê duyệt PDF — màn hình lõi.**
- **shared/** — `AppShell.jsx` (sidebar + topbar) dùng chung cho portal & admin.

---

## Lưu ý về font (đã thay thế)
- **Inter** — khớp Linear, miễn phí (Google Fonts).
- **Source Serif 4** — *thay* Tiempos Headline (font thương mại). Nếu có license Tiempos, thay trong `tokens/fonts.css`.
- **IBM Plex Mono** — *thay* Berkeley Mono (font thương mại).
Hiện tải qua Google Fonts CDN; production nên self-host `.woff2`.
