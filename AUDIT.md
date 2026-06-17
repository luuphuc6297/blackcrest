# Blackcrest — Báo cáo Audit Toàn diện

> Cổng tài liệu đầu tư tư nhân (gated private-wealth PDF portal) · Next.js 15 App Router · NextAuth v5 · Prisma + Postgres
>
> **Ngày audit:** 2026-06-17 · **Phạm vi:** ~7.089 LOC / 73 file TS-TSX · **Phương pháp:** 19 chuyên gia audit song song theo từng cụm tiêu chí + pass kiểm chứng đối kháng (adversarial verification) mọi finding Critical/High + tổng hợp có chấm điểm.

## Tổng điểm

| Tổng điểm | Xếp loại | Findings | Critical | High | Medium | Low | Info |
|---|---|---|---|---|---|---|---|
| **58/100** | **C-** | 163 | 5 | 41 | 56 | 53 | 8 |

**Kiểm chứng đối kháng** trên 46 finding Critical/High: ✅ 32 confirmed · 🔸 3 partial · 🔧 8 adjusted · ❌ 3 refuted.

---

## 1. Tóm tắt điều hành (Executive Summary)

Blackcrest là một MVP có "lõi bảo mật" được thiết kế trên trung bình nhưng CHƯA sẵn sàng vận hành cho một cổng tài sản tư nhân định chế. Điểm sáng thực sự và đã được kiểm chứng (confirmed): cách ly entitlement (canViewReport/visibleWhere) được áp đồng thời ở cả page lẫn hai route stream view/download, không có IDOR trên /api/reports/[id]/*, download token là single-use atomic thực sự, schema/DTO kỷ luật cao (không rò passwordHash, không Prisma trong .tsx), và kiến trúc Next 15 server-first sạch (defense-in-depth routing, force-dynamic cho trang gated). Đây là nền móng đáng tin để xây tiếp.

Tuy nhiên khoảng cách giữa "câu chuyện sản phẩm" và "phần đã chạy" rất lớn, và nhiều khoảng trống mang tính chặn-launch đã được xác nhận: KHÔNG có version control (không git), KHÔNG có CI/CD, KHÔNG có một test tự động nào trên 7089 LOC — nghĩa là mọi bất biến bảo mật sống còn (entitlement isolation, RBAC, download-token, watermark) đều không có lưới an toàn hồi quy. Tầng delivery hỏng theo cách âm thầm nguy hiểm: runner image thiếu Prisma CLI khiến `migrate deploy` chắc chắn fail nhưng bị `|| true` nuốt lỗi — schema lệch DB mà không ai biết. Luồng nội dung cốt lõi (upload PDF, approve/publish) phần lớn là placeholder/no-op, và viewer hiện là mô phỏng thị giác chưa render PDF thật. Về bảo mật còn các mục confirmed cần xử lý: .env chứa secret thật trên đĩa, không có CSP, và i18n chỉ phủ phần khung trong khi crown-jewel (PDF viewer) gần như 100% hard-code tiếng Việt. Tóm lại: lõi đúng hướng, nhưng vỏ vận hành + quy trình + kiểm thử chưa đạt chuẩn định chế.

### Mức độ sẵn sàng vận hành (Ship Readiness)

CHƯA thể go-live cho khách hàng thật. Các hard blocker (đều confirmed) theo thứ tự nghiêm trọng: (1) Không có git/version control — không thể rollback, review hay truy vết khi một thay đổi chạm authz làm lộ báo cáo cross-group (PROC-01, P0). (2) `migrate deploy || true` + runner image thiếu Prisma CLI: migration không bao giờ chạy khi release, schema lệch DB âm thầm — đe doạ trực tiếp tính đúng đắn của entitlement (BD-01/INFRA-05, P0). (3) Zero test tự động cho cổng security-first: không gì chặn regression rò rỉ dữ liệu trước prod (TEST-01, P0). (4) Secret production-shaped thật nằm trong .env trên đĩa: nếu tái dùng ở prod cho phép forge JWT bất kỳ role/user (SEC-01/INFRA-01/BD-04, P0 — phải rotate + đưa vào secret manager). (5) nginx prod mount thư mục certbot không tồn tại → không phục vụ được HTTPS lần đầu (INFRA-02, P0). Ngoài ra cần xử lý trước launch: thiếu CSP/HSTS (đã adjusted xuống medium nhưng vẫn bắt buộc cho portal tài liệu mật), backup không mã hoá (PII rời lãnh thổ plaintext — INFRA-04), và luồng upload/lifecycle báo cáo còn là placeholder nên sản phẩm chưa vận hành end-to-end được. Lưu ý: một số finding "approve/reject chỉ toast" bị verdict refuted nên KHÔNG còn là blocker bảo mật — nhưng việc thiếu server-action lifecycle vẫn là gap chức năng sản phẩm.

---

## 2. Bảng điểm theo từng mảng (Scorecard)

| Mảng | Điểm | Loại | Nhận định |
|---|:---:|:---:|---|
| Testing | 8 | F | Zero test tự động trên cổng security-first — dimension yếu nhất, rủi ro chặn-launch. |
| Build & Delivery | 31 | D | migrate deploy fail âm thầm bị || true che, không CI/CD, không git, không versioning. |
| Team & Process | 31 | D | Không git, không CI, không code review — bus factor cực thấp, rủi ro quy trình P0. |
| Observability | 38 | D | Audit log tốt nhưng không error tracking, không alerting, access log không có giao diện đọc. |
| Localization (i18n) | 42 | D | Hạ tầng next-intl chuẩn nhưng độ phủ thực tế cực thấp — viewer crown-jewel hard-code tiếng Việt. |
| Product & Business | 52 | C | Tầm nhìn rõ nhưng lifecycle báo cáo (upload/approve/publish) phần lớn là placeholder. |
| SEO | 52 | C | Chặn index route riêng tư đúng, nhưng 3 locale phục vụ nội dung VI trùng lặp và không hreflang. |
| Infrastructure | 52 | C | Hardening cơ bản tốt nhưng cert certbot thiếu, backup không mã hoá và TLS thiếu HSTS/ciphers. |
| Accessibility (A11y) | 58 | C | Nền form tốt nhưng Dialog thiếu focus-trap và contrast ink-4 rớt WCAG AA. |
| Security — AuthN, Session, Secrets, Web | 62 | C | Nền tảng auth có chất lượng khá tốt cho một bản MVP: argon2id đúng tham số OWASP, gate PENDING/SUSPENDED, re-check entitlement ở data layer trên MỌI request PDF |
| UX/UI & Design System | 68 | C | Design system xuất sắc, nhưng khu app đã xác thực không responsive và dark mode là code chết. |
| State Management | 68 | C | Server-first đúng hướng nhưng zustand/React Query là hạ tầng treo không dùng. |
| API Layer & Server Actions | 68 | C | Tách kiến trúc chuẩn và re-auth tốt, nhưng không rate limiting và không timeout. |
| Dependencies | 68 | C | Cây deps hiện đại nhưng next-auth ghim beta (adjusted medium) và có dead deps. |
| Code Quality | 72 | B | TypeScript strict không một any, nhưng thiếu hẳn ESLint/Prettier và nhiều dead code. |
| Performance | 76 | B | Server-first + font tối ưu tốt, nhưng React Query thừa và viewer render trang hai lần. |
| Security — AuthZ, Entitlements, PDF, IDOR | 78 | B | Lõi bảo mật của Blackcrest được thiết kế tốt và đáng tin cậy ở những điểm quan trọng nhất: cách ly entitlement (canViewReport/visibleWhere) được áp dụng ĐỒNG TH |
| Frontend Architecture | 82 | B | Phân tầng server-first gương mẫu, chỉ vướng god component pdf-viewer 1243 dòng. |
| Routing | 82 | B | Defense-in-depth thật ở mọi tầng; trừ điểm vì callbackUrl bị bỏ qua và page không check status. |
| Data Management & Modeling | 84 | B | Schema/DTO chất lượng cao; lỗ hổng chính là tokenVersion lưu nhưng không so sánh. |

---

## 3. Rủi ro hàng đầu (Top Risks — đã xác minh)

**1. [CRITICAL] Hoàn toàn không có version control (git)** _(Team & Process)_
> Confirmed. Không lịch sử, không rollback, không review — một thay đổi sai ở src/lib/authz.ts có thể lộ báo cáo giữa các nhóm khách mà không có cách truy vết hay khôi phục. Nền tảng bắt buộc cho mọi quy trình khác.

**2. [CRITICAL] migrate deploy fail âm thầm (runner thiếu Prisma CLI + || true)** _(Build & Delivery / Infrastructure)_
> Confirmed (BD-01 confirmed/critical, INFRA-05 confirmed/adjusted high). Migration không chạy khi release → schema DB lệch code mà không cảnh báo; với dữ liệu entitlement, đọc/ghi sai cột là rủi ro toàn vẹn dữ liệu và cô lập khách hàng. Lỗi âm thầm là kịch bản tệ nhất.

**3. [CRITICAL] Zero kiểm thử tự động trên cổng security-first** _(Testing)_
> Confirmed/critical. Mọi bất biến sống còn (entitlement isolation, RBAC, single-use download token, watermark per-user) không có hồi quy. Một refactor vô ý có thể khiến client A xem báo cáo client B mà không gì phát hiện trước prod.

**4. [HIGH] .env chứa secret thật (AUTH_SECRET, DOWNLOAD_TOKEN_SECRET) trên đĩa** _(Security (Secrets) / Infrastructure)_
> Confirmed (SEC-01, INFRA-01, BD-04). Lộ AUTH_SECRET cho phép forge JWT bất kỳ user/role kể cả SUPER_ADMIN — phá vỡ toàn bộ cô lập entitlement. Phải rotate trước prod và chuyển sang secret manager.

**5. [HIGH] nginx prod tham chiếu cert certbot chưa tồn tại** _(Infrastructure)_
> Confirmed (INFRA-02). Block 443 load cert chưa được provision → nginx fail-to-start/bootstrap-loop, không phục vụ HTTPS ngay lần triển khai đầu. Blocker launch về vận hành.

**6. [HIGH] Không có CI: typecheck/build/verify-entitlements chỉ chạy thủ công** _(Build & Delivery / Team & Process)_
> Confirmed (BD-02, PROC-02, PROC-03). Code chạm authz/watermark/token vào prod không qua gate tự động nào; security regression check đã viết sẵn (verify-entitlements.ts) nhưng chưa được nối vào pipeline.

**7. [HIGH] Single-use download token không có test bảo vệ** _(Testing)_
> Confirmed/high (TEST-03). Đây là cơ chế chống chia sẻ lại link PDF watermark; nếu logic consume bị đổi (update thay updateMany, bỏ điều kiện consumedAt:null) token có thể tái dùng mà không ai phát hiện.

**8. [HIGH] Không có error tracking — lỗi server-action/route biến mất** _(Observability)_
> Confirmed/high (OBS-01). Sự cố trên crown-jewel viewer với một client cụ thể không thể phát hiện/tái hiện; xói mòn niềm tin khách định chế và kéo dài MTTR.

**9. [HIGH] ReportAccessLog được ghi nhưng không có giao diện đọc** _(Observability)_
> Confirmed/high (OBS-03). Log truy cập (ai xem/tải báo cáo nào, IP, thời điểm) là bằng chứng forensics quan trọng nhất khi điều tra rò rỉ — thu thập đúng nhưng admin chỉ truy được bằng SQL thủ công, vô dụng trong sự cố.

**10. [HIGH] Backup không mã hoá — PII plaintext rời lãnh thổ qua rclone** _(Infrastructure)_
> Confirmed (INFRA-04). Dump DB (email + argon2 hash + entitlement) và tar tài liệu đầu tư riêng tư được đẩy offsite dạng plaintext; lộ credential rclone/bucket = lộ toàn bộ dữ liệu khách giàu có.

**11. [HIGH] PDF viewer (crown jewel) gần như 100% hard-code tiếng Việt** _(Localization)_
> Confirmed (I18N-01, UX-03). Trên /en, /zh nhà đầu tư quốc tế thấy toàn bộ trạng thái/nút/dialog/cảnh báo bằng tiếng Việt — phá vỡ cam kết đa ngôn ngữ đúng trên màn hình giá trị nhất.

---

## 4. Chủ đề xuyên suốt (Cross-cutting Themes)

- Không có lớp xác minh tự động ở bất kỳ đâu: không git, không CI/CD, zero test (0% coverage trên 7089 LOC). Đây là chủ đề xuyên suốt và nghiêm trọng nhất — nó khuếch đại MỌI rủi ro khác vì không gì chặn được regression bảo mật trước prod (Team & Process, Testing, Build & Delivery).
- Quản lý secret yếu lặp lại ở nhiều dimension: .env chứa secret thật trên đĩa, fallback hardcode cho DOWNLOAD_TOKEN_SECRET, DEV_PASSWORD chung cho SUPER_ADMIN, không secret manager (Security, Infrastructure, Build & Delivery, Team & Process).
- 'Built but not wired' — hạ tầng được viết kỹ nhưng không bao giờ được kích hoạt: React Query + zustand là dead dependency; /api/health không được mắc vào healthcheck nào; keyset pagination có nhưng UI bỏ qua nextCursor; tokenVersion lưu nhưng không so sánh; dark mode token đầy đủ nhưng không bật được (State, API, Observability, Security, UX).
- Localization nửa vời: hạ tầng next-intl chuẩn và catalog parity hoàn hảo, nhưng độ phủ cực thấp — UI thật (viewer, marketing, admin, error) hard-code tiếng Việt, format số/tiền cố định vi-VN. Mâu thuẫn trực tiếp với định vị đa ngôn ngữ (Localization, UX, SEO, Product).
- Sản phẩm 'demo-grade': lifecycle báo cáo (upload/approve/publish) là placeholder/no-op, viewer mô phỏng thị giác chưa render PDF thật, KPI và số liệu tài chính hardcode minh hoạ — nguy hiểm trong bối cảnh wealth vì nhà đầu tư có thể hiểu nhầm là số liệu thật (Product, UX, State, Code Quality).
- Vắng observability/vận hành: không error tracking, không structured logging, không alerting, audit/access log không có giao diện đọc — không thể điều tra rò rẹ hay phát hiện sự cố chủ động trên một portal cần audit trail tuân thủ (Observability, API, Infrastructure).
- Nợ kỹ thuật cấp UI tập trung ở pdf-viewer.tsx (god component 1243 dòng) và duplication (STATUS_* nhân bản 5 file, clientIp lặp) — cản trở refactor khi crown-jewel chuyển sang render PDF thật (Frontend Architecture, Code Quality, Performance).

---

## 5. Lộ trình ưu tiên (Prioritized Roadmap)

### P0 — Chặn launch (làm ngay)

- **(S) git init + commit baseline + push lên remote private; double-check .gitignore loại trừ .env và /storage/ TRƯỚC commit đầu**
  - Không có version control là rủi ro nền tảng P0 (PROC-01 confirmed/critical); không thể rollback/review/truy vết. Là tiền đề bắt buộc cho CI, code review và mọi quy trình khác. _(Team & Process)_
- **(S) Rotate AUTH_SECRET + DOWNLOAD_TOKEN_SECRET, đưa vào secret manager/runtime env, bỏ fallback hardcode + fail-fast khi thiếu secret**
  - Confirmed (SEC-01, INFRA-01, BD-04). Lộ AUTH_SECRET cho phép forge JWT bất kỳ role — phá vỡ cô lập entitlement. Coi secret hiện tại như đã lộ. _(Security (Secrets))_
- **(M) Sửa pipeline migration: bỏ `|| true`, đưa `prisma migrate deploy` thành init-job phải-thành-công từ image có Prisma CLI, fail-fast nếu lỗi**
  - Confirmed/critical (BD-01, INFRA-05). Migration âm thầm không chạy → schema lệch DB, đe doạ toàn vẹn dữ liệu entitlement. _(Build & Delivery)_
- **(M) Bootstrap chứng chỉ TLS cho nginx prod (self-signed tạm + certbot webroot first-run), tạo thư mục certbot/{www,conf}, tài liệu hoá renew**
  - Confirmed (INFRA-02). Hiện nginx không khởi động được lần đầu vì cert chưa tồn tại — không phục vụ được HTTPS. _(Infrastructure)_
- **(L) Thiết lập vitest + Playwright; tuần 1 ưu tiên: consumeDownloadToken single-use, canViewReport staff-bypass + cô lập entitlement, requireRole/requireFreshUser từ chối non-APPROVED**
  - Confirmed/critical (TEST-01, TEST-03). Lưới an toàn hồi quy cho các bất biến lộ-dữ-liệu là điều kiện tối thiểu cho cổng security-first. _(Testing)_
- **(M) Khởi tạo CI tối thiểu: install --frozen-lockfile → prisma generate → typecheck → build → verify-entitlements.ts (Postgres ephemeral) → test; bắt buộc xanh mới merge**
  - Confirmed (BD-02, PROC-03). verify-entitlements.ts đã tồn tại nhưng chạy thủ công; nối vào CI là đòn bẩy lớn nhất với chi phí thấp. _(Build & Delivery)_

### P1 — Bắt buộc trước khi đón khách thật

- **(S) Sửa verify-entitlements.ts để IMPORT visibleWhere/canViewReport thật từ authz.ts thay vì sao chép logic**
  - Adjusted/medium (TEST-02). Bản sao cũ tạo cảm giác an toàn sai — không bắt được drift của production code path. _(Testing)_
- **(M) Thêm CSP chặt + HSTS + Permissions-Policy qua next.config headers() (áp cả khi chạy Node) và ssl_ciphers/session_cache/OCSP ở nginx**
  - SEC-03 adjusted/medium, INFRA-03 confirmed/high, SEC-05. Phòng thủ chiều sâu bắt buộc cho portal tài liệu mật; chống SSL-strip và hạn chế bán kính vụ nổ XSS. _(Security (Web))_
- **(M) Thực thi tokenVersion: so sánh dbUser.tokenVersion với JWT trong requireFreshUser/jwt-callback, bump khi đổi role/suspend**
  - Confirmed (SEC-04/DATA-01/SEC-01 authz adjusted về medium). Hiện là code chết: thu hồi phiên/đổi role không hiệu lực tới 30 phút. _(Security (Session))_
- **(M) Mã hoá backup trước khi rời máy (rclone crypt/gpg/age), tách key, kiểm soát bucket offsite immutable**
  - Confirmed (INFRA-04). PII định chế + tài liệu đầu tư plaintext rời lãnh thổ là rủi ro tuân thủ/danh tiếng cao. _(Infrastructure)_
- **(M) Thêm error tracking (Sentry/GlitchTip self-host) qua instrumentation.ts + global-error.tsx; lọc PII trước khi gửi**
  - Confirmed/high (OBS-01). Lỗi server-action/route hiện biến mất không dấu vết — không thể vận hành portal định chế mà mù sự cố. _(Observability)_
- **(S) Mắc /api/health vào healthcheck của service web (compose + Dockerfile HEALTHCHECK) làm điều kiện blue/green**
  - Confirmed (OBS-02). Health endpoint viết kỹ nhưng vô dụng vì không orchestrator nào gọi. _(Observability)_
- **(M) Thêm rate limiting cho login/register (chống brute-force/enumeration) và download/view (chống lạm dụng sinh PDF)**
  - Adjusted/medium (API-01 partial). nginx có limit_req nhưng cần lớp app theo IP+email/userId trả 429; quan trọng vì mỗi login thử kích hoạt argon2 tốn CPU. _(API Layer)_

### P2 — Hoàn thiện sản phẩm & vận hành

- **(L) Hiện thực luồng upload PDF thật + server-action lifecycle (submit/approve/reject/publish) ghi DB + audit + revalidatePath**
  - Confirmed (PB-01, PB-02). Crown-jewel nội dung hiện là placeholder/no-op; sản phẩm chưa vận hành end-to-end. (Lưu ý: các finding 'approve chỉ toast' bị refuted nên không phải lỗ hổng bảo mật, nhưng gap chức năng vẫn tồn tại.) _(Product & Business)_
- **(L) Tích hợp pdf.js render PDF thật từ /api/reports/[id]/view thay cho 5 trang mô phỏng; tách pdf-viewer.tsx thành module**
  - Confirmed (PB-06, FA-01 adjusted/high). Viewer hiện không hiển thị nội dung được cấp quyền; god component 1243 dòng cản trở việc thay thế. _(Frontend Architecture)_
- **(L) Localize crown-jewel + marketing: đưa pdf-viewer + landing + error/404 vào catalog vi/en/zh; format số/tiền nhận locale; noindex /en,/zh cho tới khi dịch xong**
  - Confirmed (I18N-01, I18N-02, UX-03, SEO-01). Đa ngôn ngữ chỉ phủ khung; nội dung trùng lặp 3x gây hại SEO. _(Localization)_
- **(M) Thêm ReportAccessLog viewer + structured logging (pino) + alerting tối thiểu (health fail, audit-write fail)**
  - Confirmed (OBS-03), OBS-04/05. Audit trail tuân thủ cần giao diện đọc và cảnh báo khi mất bằng chứng. _(Observability)_
- **(M) Thêm ESLint flat config + Prettier (no-floating-promises, exhaustive-deps, no-unused-vars); gỡ dead deps zustand + react-query**
  - Confirmed cluster (CQ-03, CQ-02, DEP-02/03, PERF-01). Không có hàng rào style/lint tự động; dead deps phình bundle và gây hiểu nhầm kiến trúc. _(Code Quality)_
- **(M) Container hardening: pin base image digest, HEALTHCHECK, resource limits, no-new-privileges/cap_drop; restore.sh + diễn tập**
  - Confirmed (BD-05 high) + INFRA-06/07. Không có đường rollback DB và container thiếu giới hạn tài nguyên (noisy-neighbor trên single host). _(Infrastructure)_

### P3 — Polish & dài hạn

- **(L) Responsive cho khu app đã xác thực (sidebar off-canvas, table overflow, viewer mobile) + a11y (focus-trap Dialog, nâng ink-4 contrast, skip-link)**
  - Confirmed (UX-02, A11Y-01, A11Y-04). Nhà đầu tư mở tài liệu trên iPad/điện thoại; chuẩn a11y institutional. _(UX/UI & Design System)_
- **(M) Hoàn thiện SEO công khai: metadataBase, hreflang/alternate, OG/Twitter, robots.ts/sitemap.ts, favicon, canonical**
  - SEO-02 adjusted/medium + SEO-03/04/06/07. Nâng uy tín thương hiệu và sửa index sai ngôn ngữ; ưu tiên thấp vì là bề mặt marketing. _(SEO)_
- **(M) Pagination UI (dùng nextCursor), giới hạn findMany admin, audit log filter/phân trang; lên lịch nâng cấp major deps có kiểm soát**
  - API-03/04/08, DEP-01 (adjusted/medium beta next-auth), DEP-05. Scale dữ liệu và giảm drift dài hạn. _(API Layer)_

### ⚡ Quick wins (giá trị cao, công sức thấp)

- git init + commit baseline + push remote private (kèm kiểm tra .gitignore chặn .env/storage trước) — chặn rủi ro P0 lớn nhất với effort S.
- Rotate AUTH_SECRET + DOWNLOAD_TOKEN_SECRET và bỏ fallback hardcode + fail-fast khi thiếu secret — đóng lỗ hổng forge JWT/download token với effort S.
- Bỏ `|| true` sau `migrate deploy` — biến lỗi migration âm thầm thành fail-fast rõ ràng.
- Mắc /api/health vào healthcheck service web trong docker-compose.prod (OBS-02) — kích hoạt một endpoint đã viết sẵn.
- Sửa verify-entitlements.ts để import authz.ts thật thay vì sao chép logic (TEST-02) — security check thật sự bắt được drift.
- Thêm HSTS vào nginx block 443 (effort S) — chống SSL-strip ngay.
- Gỡ dead dependency zustand + react-query provider trống (DEP-02/03, PERF-01) — giảm bundle và xoá hiểu nhầm kiến trúc.
- Thêm guard NODE_ENV==='production' throw vào seed.ts (SEC-11) — chặn DEV_PASSWORD/SUPER_ADMIN bị seed nhầm lên prod.
- Thêm robots.ts (Disallow /portal,/admin,/api) + favicon từ logo-mark.svg sẵn có — chỉn chu thương hiệu, effort S.

---

## 6. Chi tiết theo từng mảng

Mỗi mảng gồm: điểm & nhận định, bảng chấm điểm sub-tiêu chí, danh sách findings (kèm verdict kiểm chứng cho Critical/High), và điểm mạnh.

### 6.1 Testing — 8/100 (F)

Codebase gần như không có hạ tầng kiểm thử tự động: không một file *.test.* / *.spec.* nào, không có test runner (vitest/jest/playwright/cypress), không config, không dependency kiểm thử, không CI (xác nhận không có .git, không có .github). Với một cổng tài liệu private-wealth security-first, điều này là rủi ro nghiêm trọng vì chính các bất biến mang tính sống còn — entitlement isolation, RBAC staff-bypass, download-token dùng-một-lần, watermark theo người dùng — đều hoàn toàn không được kiểm thử hồi quy. Khoản đầu tư duy nhất là một script ad-hoc duy nhất scripts/verify-entitlements.ts (đúng hướng nhưng SAO CHÉP lại logic authz thay vì import, nên không bắt được drift) và một script sinh PDF mẫu. Đây là dimension yếu nhất của dự án; cần một test strategy thực dụng (vitest + Playwright) ngay trước khi đưa vào vận hành thật.

| Sub-tiêu chí | Điểm | Trạng thái | Ghi chú |
|---|:---:|:---:|---|
| Unit tests | 0/5 | missing | Không có bất kỳ unit test nào. Các unit thuần như consumeDownloadToken (download-token.ts:37), isStaff (rbac.ts:8), resolveTranslation (authz.ts:93), verifyPassword (password.ts:19) hoàn toàn dễ test nhưng không có test nào. |
| Integration tests | 0/5 | missing | Không có integration test cho route /api/reports/[id]/view và /download, server actions hay tầng Prisma. Toàn bộ chuỗi auth → entitlement → watermark → stream chưa từng được kiểm chứng tự động. |
| E2E tests | 0/5 | missing | Không có Playwright/Cypress. Các luồng quan trọng (login/PENDING, viewer PDF, download token 60s, cô lập client) chỉ smoke-test thủ công theo memory, không lặp lại được. |
| Visual regression tests | 0/5 | missing | Không có visual regression dù dự án có quality bar thẩm mỹ monochrome rất khắt khe (UPPERCASE, hairline, squared corners). Không có ảnh chụp baseline nào được giữ. |
| Coverage | 0/5 | missing | Không có công cụ đo coverage (c8/istanbul) vì không có test runner. Coverage thực tế = 0% trên 7089 LOC. |
| Test maintainability | 1/5 | weak | Không có test suite để bàn về maintainability; điểm yếu cụ thể: verify-entitlements.ts SAO CHÉP visibleWhere (dòng 11-21) thay vì import từ authz.ts → drift, không bảo trì được. |
| Mock strategy | 0/5 | missing | Không có chiến lược mock/fixture. Cả hai script phụ thuộc DB đã seed thật (email cứng minhanh@gia-an.vn), không có test DB/transaction rollback/fixture isolation. |
| Test reliability | 1/5 | weak | Không có suite để đo flakiness; script verify chạy trên DB seed chung, không idempotent, không tự dựng/dọn dữ liệu → kết quả phụ thuộc trạng thái DB bên ngoài, không tin cậy trong CI. |
| Verification scripts | 2/5 | weak | Có đúng 1 script verify-entitlements.ts (đúng hướng, exit non-zero khi vi phạm, kiểm 8 assertion cô lập) + generate-sample-pdfs.ts. Nhưng verify chạy thủ công, không trong CI, và sao chép logic nên không phải nguồn chân lý thật. |

**Findings:**

<details><summary><strong>TEST-01 · 🔴 CRITICAL — </strong> — Không tồn tại bất kỳ kiểm thử tự động nào cho một cổng tài sản security-first</summary>

- **Sub-tiêu chí:** Unit tests · **Effort:** L
- **Bằng chứng:** find . cho *.test.*/*.spec.* trả về RỖNG; package.json scripts chỉ có dev/build/start/lint/typecheck/db:* — không có script "test"; không có vitest/jest/playwright/cypress trong dependencies/devDependencies (grep trả về RỖNG). Không có .git và không có .github (xác nhận "NO .git repo", "NO .github"). 7089 LOC hoàn toàn không có test.
- **Tác động:** Mọi bất biến bảo mật cốt lõi (entitlement isolation, RBAC, download-token, watermark) không có lưới an toàn hồi quy. Một thay đổi vô ý ở authz.ts hay download-token.ts có thể khiến client A xem được báo cáo của client B hoặc token tải bị dùng lại — rò rỉ dữ liệu tài sản của khách hàng — mà không có gì phát hiện trước khi lên production. Đối với cổng private-wealth, đây là rủi ro chặn-ra-mắt.
- **Khuyến nghị:** Thiết lập vitest (unit/integration) + Playwright (E2E) ngay. Ưu tiên TUYỆT ĐỐI tuần 1: (1) consumeDownloadToken single-use (download-token.ts:50-54) — gọi 2 lần phải trả về claim rồi null; (2) canViewReport staff-bypass + cô lập entitlement (authz.ts:15-27); (3) requireRole/requireFreshUser từ chối CLIENT và tài khoản non-APPROVED (rbac.ts:26-47). Thêm script "test" và "test:e2e" vào package.json.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>TEST-02 · 🟠 HIGH — </strong> — verify-entitlements.ts SAO CHÉP logic authz thay vì import — không bắt được drift của production code</summary>

- **Sub-tiêu chí:** Verification scripts · **Effort:** S
- **Bằng chứng:** scripts/verify-entitlements.ts:11-21 định nghĩa lại visibleWhere CỦA RIÊNG NÓ: `const memberOf = { group: { members: { some: { userId } } } }; return { status: "PUBLISHED", OR: [ { accessLevel: "PUBLIC" }, { entitlements: { some: memberOf } }, { category: { entitlements: { some: memberOf } } } ] };` — đây là bản sao verbatim của hàm visibleWhere thật trong src/lib/authz.ts:30-40. Comment ở đầu file (dòng 2-3) thừa nhận: "Replicates the visibleWhere fragment".
- **Tác động:** Nếu ai đó sửa visibleWhere trong authz.ts (ví dụ bỏ điều kiện status:"PUBLISHED" hoặc thêm nhánh OR rò rỉ), script verify VẪN PASS vì nó dùng bản sao cũ của chính nó. Script tạo cảm giác an toàn sai: nó xác nhận một bản sao chứ không phải hàm production đang chạy thật trong canViewReport/listVisibleReports.
- **Khuyến nghị:** Sửa script để IMPORT trực tiếp từ src/lib/authz.ts (export visibleWhere hoặc test qua canViewReport/listVisibleReports thật). Tốt hơn: biến nó thành integration test vitest chạy với canViewReport thật trên test DB, để mọi thay đổi authz đều được kiểm chứng bởi cùng một code path mà ứng dụng dùng.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>TEST-03 · 🟠 HIGH — </strong> — Tính dùng-một-lần (single-use) của download token không có test — chỉ dựa vào updateMany count===1</summary>

- **Sub-tiêu chí:** Integration tests · **Effort:** M
- **Bằng chứng:** download-token.ts:50-54 dựa vào atomic updateMany: `where: { jti, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() }` rồi `if (res.count !== 1) return null;`. Không có test nào xác nhận: gọi lần 2 trả về null, token hết hạn (TTL 60s, dòng 10) bị từ chối, hay race condition 2 request đồng thời chỉ 1 thắng. Route download (download/route.ts:33-36) tin tưởng hoàn toàn vào hành vi này.
- **Tác động:** Đây chính là cơ chế chống chia sẻ lại link tải PDF có watermark. Nếu logic consume bị hỏng (ví dụ ai đó đổi updateMany→update, hoặc bỏ điều kiện consumedAt:null), token có thể bị tái sử dụng/chia sẻ mà không ai phát hiện, phá vỡ mô hình truy vết rò rỉ. Không có test = regression âm thầm.
- **Khuyến nghị:** Viết integration test (vitest + test DB) cho consumeDownloadToken: (1) mint→consume trả về claim đúng userId/reportId; (2) consume lần 2 trả về null; (3) token quá expiresAt trả về null; (4) JWT giả/sai chữ ký trả về null; (5) test đồng thời 5 promise consume, chỉ đúng 1 thành công.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>TEST-04 · 🟡 MEDIUM</strong> — Luồng approve/reject báo cáo trong viewer chỉ là toast client-side — không có server action và không có test</summary>

- **Sub-tiêu chí:** E2E tests · **Effort:** M
- **Bằng chứng:** pdf-viewer.tsx:657-658 dùng React state thuần: `const [dialog, setDialog] = React.useState<"approve"|"reject"|null>(null); const [toast, setToast] = React.useState<"approved"|"rejected"|null>(null);` và dòng 958/983 chỉ gọi `setToast("approved")` / `setToast("rejected")` — không có lời gọi server action nào để persist trạng thái lifecycle. Không có E2E test nào phủ luồng draft→approve→publish.
- **Tác động:** Vòng đời báo cáo (tính năng crown-jewel) chưa nối backend và không có test, nên không có cơ chế nào phát hiện rằng hành động phê duyệt không được lưu. Khi flow này được hoàn thiện, việc thiếu E2E test khiến dễ phát hành nhầm báo cáo chưa duyệt tới nhà đầu tư.
- **Khuyến nghị:** Khi nối server action cho lifecycle, kèm theo Playwright E2E: đăng nhập APPROVER → mở báo cáo REVIEW → bấm Phê duyệt → xác nhận status đổi sang APPROVED trong DB và hiển thị đúng; đồng thời kiểm CLIENT không thấy nút duyệt. Thêm test phân quyền âm: EDITOR không được approve.

</details>

<details><summary><strong>TEST-05 · 🟡 MEDIUM</strong> — Watermark cache key dùng SHA-256 cắt 16 hex chars — nguy cơ va chạm/nhiễm chéo không được test</summary>

- **Sub-tiêu chí:** Unit tests · **Effort:** M
- **Bằng chứng:** watermark.ts:25-31: `userHash` = `createHash("sha256").update(userId).digest("hex").slice(0, 16)` và `watermarkKey` = `cache/wm/${reportId}/${userHash(userId)}.pdf`. Bản watermark được cache theo key này (getWatermarkedKey dòng 93-95: nếu cached.exists thì trả luôn). Không có test xác nhận hai userId khác nhau sinh key khác nhau, hay footer chứa đúng email/ip người dùng (dòng 46).
- **Tác động:** Watermark là cơ chế truy vết rò rỉ theo từng người dùng. Nếu cache key trùng (dù xác suất nhỏ với 64-bit) hoặc logic cache trả nhầm file của người khác, một client có thể tải PDF mang dấu watermark của client KHÁC — gây quy kết sai và lộ danh tính người dùng khác. Không có test nào bảo vệ bất biến "một footer đúng cho đúng một người".
- **Khuyến nghị:** Unit test cho watermark: (1) userHash của 2 id khác nhau không trùng; (2) stamp() chèn footer chứa đúng email và ip truyền vào (load lại PDF, đọc text); (3) test cache: cùng (reportId,userId) lần 2 không stamp lại, khác userId thì sinh key mới. Cân nhắc tăng độ dài hash để giảm xác suất va chạm.

</details>

<details><summary><strong>TEST-06 · 🟡 MEDIUM</strong> — Không có test cho bất biến XOR của Entitlement (chỉ ràng buộc ở DB)</summary>

- **Sub-tiêu chí:** Integration tests · **Effort:** S
- **Bằng chứng:** Migration 20260617080152_entitlement_xor_check/migration.sql thêm CHECK `(("reportId" IS NOT NULL) <> ("categoryId" IS NOT NULL))`. Tầng app (entitlements.ts:19-21) dùng zod refine `!!d.reportId !== !!d.categoryId`. Có HAI nguồn thực thi cùng một quy tắc nhưng không có test nào xác nhận cả hai đồng bộ, cũng không kiểm tạo entitlement vi phạm bị từ chối.
- **Tác động:** Nếu zod refine hoặc DB constraint bị nới lỏng/lệch nhau, có thể tạo entitlement vừa trỏ report vừa trỏ category (hoặc không trỏ gì) → hành vi visibility không xác định, có thể rò rỉ. Không có test bảo vệ tính nhất quán của bất biến cốt lõi này.
- **Khuyến nghị:** Integration test trên test DB: tạo entitlement chỉ-report (OK), chỉ-category (OK), cả-hai (Prisma ném lỗi do CHECK), không-cả-hai (lỗi). Đồng thời unit test grantSchema của entitlements.ts cho 4 tổ hợp tương ứng để hai lớp khớp nhau.

</details>

<details><summary><strong>TEST-07 · 🟡 MEDIUM</strong> — Range/206 streaming và phân quyền của API view/download không có test</summary>

- **Sub-tiêu chí:** Integration tests · **Effort:** M
- **Bằng chứng:** view/route.ts:72-92 tự parse header Range bằng regex `bytes=(\d*)-(\d*)` và xử lý 206/416 thủ công (dòng 77 kiểm `start >= size || end >= size || start > end`). Cả view/route.ts:42 và download/route.ts:52 đều gọi canViewReport trên mỗi request. Không có test cho: 401 khi không đăng nhập (view dòng 31), 403 khi không entitled, 416 khi range sai, 206 nội dung đúng byte-range.
- **Tác động:** Logic parse Range thủ công dễ off-by-one (pdf.js dựa vào 206 đúng để hiển thị). Quan trọng hơn, các nhánh phân quyền (401/403/404) là biên bảo mật trực tiếp phục vụ PDF; nếu một refactor làm hỏng kiểm tra canViewReport, PDF của khách bị lộ mà không có test bắt được.
- **Khuyến nghị:** Integration test route handler (gọi GET với NextRequest giả + session mock): không session→401; CLIENT không entitled→403; report không tồn tại→404; range hợp lệ→206 + Content-Range đúng; range vượt size→416. Kèm E2E Playwright mở viewer và xác nhận PDF tải qua 206.

</details>

<details><summary><strong>TEST-08 · ⚪ LOW</strong> — Cả hai script ad-hoc phụ thuộc DB seed chung, không cô lập/idempotent — không dùng được trong CI</summary>

- **Sub-tiêu chí:** Test reliability · **Effort:** M
- **Bằng chứng:** verify-entitlements.ts:39-40 hard-code email seed `minhanh@gia-an.vn` / `trung@tran-family.vn` (khớp prisma/seed.ts:23-24) và dùng `findUniqueOrThrow` (dòng 24) → ném nếu DB chưa seed. generate-sample-pdfs.ts:32 đọc mọi report có fileKey từ DB thật. Cả hai mở PrismaClient tới DATABASE_URL thật, không có test DB riêng, không dọn dữ liệu, không transaction rollback.
- **Tác động:** Script chỉ chạy được trên một DB đã seed đúng thủ công; không thể đưa vào pipeline tự động đáng tin cậy. Kết quả phụ thuộc trạng thái dữ liệu bên ngoài, dễ false-pass/false-fail và không lặp lại được — đối nghịch với một bộ verification dùng làm gác cổng.
- **Khuyến nghị:** Chuyển sang test DB ephemeral (Docker Postgres riêng hoặc schema tách), seed trong beforeAll/dọn trong afterAll, hoặc bọc mỗi test trong transaction rollback. Đưa verify thành job CI chạy trên DB tạm; vì dự án chưa có git/CI (xác nhận NO .git/NO .github), bước đầu tiên là khởi tạo repo + một workflow chạy typecheck + test + verify.

</details>

<details><summary><strong>TEST-09 · ⚪ LOW</strong> — Localization vi/en/zh (next-intl) không có test phát hiện key thiếu hoặc hardcode tiếng Việt</summary>

- **Sub-tiêu chí:** Unit tests · **Effort:** S
- **Bằng chứng:** Dự án có messages/{vi,en,zh}.json và theo memory en/zh "partially hardcoded Vietnamese". Ví dụ trong pdf-viewer.tsx:60-61 các nhãn trạng thái là chuỗi tiếng Việt cứng (`REVIEW: "Chờ duyệt", APPROVED: "Đã duyệt"`) thay vì lấy từ next-intl. Không có test nào so khớp tập key giữa 3 file message hay phát hiện chuỗi cứng.
- **Tác động:** Quality bar yêu cầu fully-localized; nhưng không có test bảo đảm en.json/zh.json không thiếu key so với vi.json, dẫn tới rò chuỗi tiếng Việt sang giao diện en/zh mà không bị chặn ở pipeline.
- **Khuyến nghị:** Thêm unit test so sánh đệ quy tập key của vi/en/zh (mọi key trong vi phải tồn tại ở en và zh, và ngược lại). Cân nhắc lint rule/test phát hiện literal có dấu tiếng Việt trong .tsx ngoài file messages.

</details>

**Điểm mạnh:**

- ✅ Tồn tại một verification script có chủ đích đúng hướng (scripts/verify-entitlements.ts): kiểm 8 assertion cô lập bao gồm chính bất biến bảo mật cốt lõi (Gia An KHÔNG thấy thematic của Trần, DRAFT/REVIEW không lộ cho client), exit non-zero khi vi phạm (dòng 64-67) — đây là nền móng tốt để nâng cấp thành integration test thật.
- ✅ Code production được viết theo hướng RẤT dễ test: các hàm thuần và tách bạch tốt như consumeDownloadToken (atomic updateMany), resolveTranslation, isStaff/requireRole, verifyPassword — testability cao, chỉ thiếu test chứ không thiếu khả năng test.
- ✅ Bất biến quan trọng được phòng thủ nhiều lớp (defense-in-depth) ngay trong code dù chưa có test: route download re-check user APPROVED + canViewReport SAU khi consume token (download/route.ts:38-54), và XOR entitlement được thực thi cả ở DB CHECK lẫn zod — giúp các test tương lai có biên rõ ràng để khẳng định.

---

### 6.2 Build & Delivery — 31/100 (D)

Build process cục bộ ổn (next build standalone + prisma generate đúng thứ tự, Dockerfile multi-stage gọn), nhưng tầng delivery cho một cổng tài sản tư nhân "security-first" gần như trống. Lỗi nghiêm trọng nhất: Dockerfile runner (line 33) chỉ copy `@prisma+client*` nên `migrate deploy` trong docker-compose.prod (line 43) chắc chắn fail, lại bị `|| true` nuốt lỗi — migration âm thầm KHÔNG chạy khi release, schema lệch DB mà không ai biết. Không có CI/CD, không git, không image tag (build: . → :latest), không rollback/restore, version đứng yên 0.1.0, không feature flag, và .env chứa secret thật nằm cạnh .env.example. Đây là vùng rủi ro lớn cần dựng pipeline tối thiểu trước khi go-live.

| Sub-tiêu chí | Điểm | Trạng thái | Ghi chú |
|---|:---:|:---:|---|
| Build process | 3/5 | adequate | Dockerfile multi-stage chuẩn (deps/builder/runner), prisma generate trước build (Dockerfile:18), output standalone (next.config.ts:8). Nhưng runner thiếu prisma CLI + engine (line 33) làm hỏng bước migrate; bodySizeLimit 1mb (next.config.ts:15) lệch nginx 12m. |
| CI pipeline | 0/5 | missing | Không có .github, không git, không chạy typecheck/build/lint/test tự động. Lint script tồn tại nhưng không có eslintrc; 0 test. Mọi gate chất lượng đều thủ công. |
| CD pipeline | 0/5 | missing | Không có pipeline deploy. Release = build & docker compose thủ công trên VPS. Không build/push image registry, không artifact, không promotion dev→prod. |
| Environment management | 2/5 | weak | .env.example đầy đủ biến (DATABASE_URL, AUTH_SECRET, DOWNLOAD_TOKEN_SECRET...), prod compose dùng ${VAR:?} bắt buộc. Nhưng .env chứa secret THẬT nằm trên đĩa cạnh repo (.env line 3,7); không có secret manager, không phân tách rõ dev/staging/prod. |
| Release strategy | 1/5 | weak | Có ý tưởng blue/green (nginx upstream, /api/health) ghi trong README/comment nhưng chưa hiện thực: prod compose chỉ 1 service web, không tag image, command migrate bị che lỗi bằng || true. |
| Rollback strategy | 1/5 | weak | backup.sh có pg_dump + rclone offsite + retention 14 ngày (tốt), nhưng KHÔNG có script/đường dẫn restore (chỉ comment 'test-restore monthly'), không có migration down, không pin image cũ để revert. |
| Versioning | 1/5 | weak | package.json version đứng yên 0.1.0 (line 3). Không git → không tag, không CHANGELOG/VERSION, image không gắn version/sha → không truy vết được bản đang chạy. |
| Feature flags | 0/5 | missing | Hoàn toàn không có cơ chế feature flag. Các tính năng dở dang (upload PDF placeholder, approve/reject toast-only) không thể bật/tắt an toàn theo môi trường. |

**Findings:**

<details><summary><strong>BD-01 · 🔴 CRITICAL — </strong> — Runner image thiếu Prisma CLI + engine khiến `migrate deploy` luôn fail và bị `|| true` che lỗi</summary>

- **Sub-tiêu chí:** Build process · **Effort:** M
- **Bằng chứng:** Dockerfile:33 `COPY --from=builder /app/node_modules/.pnpm/@prisma+client* ./node_modules/.pnpm/` — glob này CHỈ khớp `@prisma+client@...`, KHÔNG copy `node_modules/prisma` (symlink top-level), `.pnpm/prisma@6.19.3...` (CLI), hay `.pnpm/@prisma+engines@6.19.3` (migration engine). docker-compose.prod.yml:43 `command: sh -c "node node_modules/prisma/build/index.js migrate deploy || true; node server.js"` — đường dẫn này KHÔNG tồn tại trong runner → lệnh ném lỗi nhưng `|| true` nuốt sạch, web vẫn start.
- **Tác động:** Migration KHÔNG BAO GIỜ chạy khi release qua image. Mỗi lần thêm migration mới (vd download_token), schema DB lệch với code mà không có cảnh báo: query Prisma sẽ lỗi runtime hoặc tệ hơn là đọc/ghi sai cột entitlement — đe doạ trực tiếp cách ly dữ liệu client của cổng tài sản. Lỗi âm thầm là kịch bản tồi nhất cho một hệ security-first.
- **Khuyến nghị:** Bỏ glob mong manh; trong runner copy nguyên `prisma` schema + chạy migrate bằng `prisma migrate deploy` từ một image có CLI. Tốt nhất: tách bước migrate thành init-container / job riêng (`pnpm exec prisma migrate deploy`) chạy TRƯỚC khi web start, BỎ `|| true` để fail-fast và chặn release nếu migrate lỗi. Hoặc copy đủ `.pnpm/prisma@*`, `.pnpm/@prisma+engines@*` và symlink `node_modules/prisma`, `node_modules/.bin/prisma`.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>BD-02 · 🟠 HIGH — </strong> — Không có CI: không gate typecheck/build/lint/test trước khi release</summary>

- **Sub-tiêu chí:** CI pipeline · **Effort:** M
- **Bằng chứng:** Không tồn tại thư mục .github (`ls .github` → No such file or directory), dự án không phải git repo (`ls .git` → No such file or directory). package.json:11 có `typecheck` và :10 `lint` nhưng không có file eslintrc, và không hề có cấu hình CI nào (`find ... -name '*.yml'` chỉ ra compose + pnpm-lock).
- **Tác động:** Mọi thay đổi vào main không qua bất kỳ kiểm tra tự động nào. Với 0 test sẵn có, một regression ở tầng authz/entitlement/watermark có thể lên production mà không ai phát hiện. Đây là rủi ro vận hành cao cho cổng dữ liệu nhạy cảm.
- **Khuyến nghị:** Khởi tạo git repo và một workflow CI tối thiểu (GitHub Actions/GitLab CI): `pnpm install --frozen-lockfile` → `pnpm exec prisma generate` → `pnpm typecheck` → `pnpm build` → (sau này) test + `docker build`. Bắt buộc xanh mới merge. Thêm eslint config để `next lint` có ý nghĩa.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>BD-03 · 🟠 HIGH — </strong> — Không có CD: deploy hoàn toàn thủ công, không artifact/registry</summary>

- **Sub-tiêu chí:** CD pipeline · **Effort:** L
- **Bằng chứng:** docker-compose.prod.yml:27 `build: .` — image build tại chỗ trên host, không có `image:` cho service web, không push registry. Không có script deploy/release nào (`grep migrate deploy` chỉ thấy comment ở compose:42). README.md:59-63 mô tả triển khai như hướng dẫn thủ công.
- **Tác động:** Release phụ thuộc thao tác tay trên VPS, dễ sai khác môi trường (build trên prod host = không reproducible). Không có bản ghi artifact để audit 'cái gì đã deploy', khó tuân thủ kỳ vọng kiểm soát của khối tài sản tư nhân.
- **Khuyến nghị:** Pipeline build image trong CI, push lên registry với tag bất biến (sha/semver), prod chỉ `docker compose pull` + flip. Tách build khỏi runtime host. Lưu lại bản ghi image:tag theo từng release.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>BD-04 · 🟠 HIGH — </strong> — File .env chứa secret thật nằm trên đĩa cạnh .env.example</summary>

- **Sub-tiêu chí:** Environment management · **Effort:** M
- **Bằng chứng:** .env:3 `AUTH_SECRET="rHwjSOI5mClTJehpuQhJbx8uY460VZUjVW1iibNkV3w="` và .env:7 `DOWNLOAD_TOKEN_SECRET="QxYt0//76LfTcvibV+OAh4X4nM8ij1iMZLmaoeiAgKs="` là secret thực, đã sinh sẵn. .gitignore:19 có chặn `.env` nhưng file vẫn hiện diện vật lý trong thư mục dự án.
- **Tác động:** AUTH_SECRET ký JWT phiên đăng nhập và DOWNLOAD_TOKEN_SECRET ký token tải PDF một lần — đây là nền tảng cách ly entitlement. Secret để dạng plaintext trong cây dự án dễ lọt qua backup/đồng bộ/chia sẻ thư mục. Nếu dùng lại cho prod là thảm hoạ.
- **Khuyến nghị:** Không lưu secret prod trên đĩa repo. Dùng secret manager (Docker secrets / Vault / biến môi trường được inject lúc deploy). Sinh secret riêng cho từng môi trường; coi secret dev hiện tại là đã lộ và xoay vòng trước go-live. Ghi rõ quy trình provisioning + rotation.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>BD-05 · 🟠 HIGH — </strong> — Không có chiến lược rollback: thiếu script restore và migration-down</summary>

- **Sub-tiêu chí:** Rollback strategy · **Effort:** M
- **Bằng chứng:** scripts/backup.sh chỉ có backup (pg_dump line 20, tar storage line 24, rclone line 28, retention line 32-33) — KHÔNG có lệnh restore; chỉ là comment line 7 `A backup you have never restored is not a backup — test-restore monthly`. `grep pg_restore` không có kết quả. Migration Prisma không có down-script; image web không tag (compose:27 `build: .` → :latest) nên không thể revert về bản trước.
- **Tác động:** Khi release lỗi (vd migration làm hỏng dữ liệu, hoặc bug entitlement lộ báo cáo), đội vận hành không có đường lùi nhanh: không restore DB theo runbook, không pin lại image cũ. Thời gian phục hồi (RTO) không xác định — rủi ro cao cho dữ liệu tài chính khách hàng.
- **Khuyến nghị:** Viết `scripts/restore.sh` (pg_restore từ dump + giải nén storage) và diễn tập định kỳ. Tag image bất biến để rollback = đổi tag + restart. Định nghĩa migration tương thích ngược (expand/contract) để rollback code không vỡ schema. Ghi runbook rollback rõ ràng.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>BD-06 · 🟡 MEDIUM</strong> — Versioning đứng yên 0.1.0, không tag/CHANGELOG, image không gắn version</summary>

- **Sub-tiêu chí:** Versioning · **Effort:** S
- **Bằng chứng:** package.json:3 `"version": "0.1.0"`. Không git nên không có tag. Không có CHANGELOG/VERSION (`ls CHANGELOG* VERSION*` → no matches). docker-compose.prod.yml:27 dùng `build: .` không tag → image chạy là `:latest` không truy vết được.
- **Tác động:** Không xác định được bản nào đang chạy trên prod, không liên kết bug ↔ release. Cản trở audit và điều tra sự cố — yếu tố quan trọng với chế độ kiểm soát của cổng tài sản.
- **Khuyến nghị:** Khởi tạo git + semver, tag mỗi release (vd v0.2.0) và gắn cùng tag/sha vào image. Hiển thị version qua /api/health hoặc build-arg để xác minh nhanh bản đang chạy. Duy trì CHANGELOG.

</details>

<details><summary><strong>BD-07 · 🟡 MEDIUM</strong> — Không có feature flag — tính năng dở dang không thể tách khỏi prod an toàn</summary>

- **Sub-tiêu chí:** Feature flags · **Effort:** M
- **Bằng chứng:** Không có cơ chế flag nào trong code/env (.env.example chỉ có biến hạ tầng). Theo handoff: PDF upload là placeholder, approve/reject trong viewer mới là toast-only, en/zh còn hardcode tiếng Việt — tất cả đều lộ thẳng trong build, không có công tắc bật/tắt.
- **Tác động:** Phải merge tính năng chưa hoàn thiện vào cùng một build production hoặc giữ nhánh dài hạn (mà ở đây còn không có git). Không thể trunk-based dev, không thể tắt nhanh tính năng lỗi mà không redeploy.
- **Khuyến nghị:** Thêm flag tối thiểu qua biến môi trường (vd FEATURE_PDF_UPLOAD, FEATURE_REPORT_LIFECYCLE) đọc ở server boundary, để ẩn/khoá tính năng chưa xong trên prod trong khi vẫn dev được. Khi quy mô lớn hơn cân nhắc bảng flag trong DB.

</details>

<details><summary><strong>BD-08 · ⚪ LOW</strong> — bodySizeLimit 1mb của Server Actions lệch với nginx client_max_body_size 12m</summary>

- **Sub-tiêu chí:** Build process · **Effort:** S
- **Bằng chứng:** next.config.ts:15 `bodySizeLimit: "1mb"` cho serverActions, trong khi nginx/blackcrest.conf:40 `client_max_body_size 12m;` (dành cho upload PDF). README.md:62 cũng nêu 12m. Hai cấu hình mô tả hai giới hạn khác nhau trong cùng đường đi request.
- **Tác động:** Khi flow upload PDF được hiện thực, nếu đi qua Server Action sẽ bị chặn ở 1mb dù nginx cho 12m — gây lỗi khó hiểu lúc release. Hiện chỉ là rủi ro tiềm ẩn vì upload còn placeholder.
- **Khuyến nghị:** Đảm bảo upload PDF đi qua Route Handler streaming (đúng như comment next.config.ts:11-13) chứ không qua Server Action; tài liệu hoá rõ giới hạn 12m thống nhất giữa nginx và tầng app, kiểm thử với file gần ngưỡng.

</details>

<details><summary><strong>BD-09 · ⚪ LOW</strong> — backup.sh hardcode tên DB container có thể không khớp tên do compose sinh ra</summary>

- **Sub-tiêu chí:** Rollback strategy · **Effort:** S
- **Bằng chứng:** scripts/backup.sh:13 `DB_CONTAINER="${DB_CONTAINER:-blackcrest-db-1}"` và :14 `STORAGE_DIR=...blackcrest_storage/_data`. docker-compose.prod.yml service `db` không đặt `container_name`, nên tên container/volume phụ thuộc project name của compose (thường `<dir>-db-1`, `<dir>_storage`) — dễ lệch với mặc định hardcode.
- **Tác động:** Cron backup có thể thất bại âm thầm (docker exec sai tên container) → tưởng có backup mà thực ra không có. Trực tiếp phá vỡ năng lực khôi phục.
- **Khuyến nghị:** Đặt `container_name` cố định trong compose hoặc truyền DB_CONTAINER/STORAGE_DIR đúng qua env của cron; thêm kiểm tra fail-fast (script đã có set -euo pipefail — tốt) và cảnh báo nếu dump rỗng. Diễn tập restore để phát hiện sớm.

</details>

**Điểm mạnh:**

- ✅ Build process cục bộ vững: Dockerfile multi-stage (deps/builder/runner) với `pnpm install --frozen-lockfile` đảm bảo reproducible deps, chạy `prisma generate` trước `pnpm build` đúng thứ tự (Dockerfile:18), và dùng `output: standalone` (next.config.ts:8) cho image gọn.
- ✅ Image runtime được làm cứng hợp lý: chạy bằng user non-root `nextjs` (Dockerfile:24,35), NEXT_TELEMETRY_DISABLED, và chỉ EXPOSE 3000.
- ✅ Có healthcheck phục vụ blue/green: /api/health trả 503 khi DB không reachable (api/health/route.ts:9-12), force-dynamic + runtime nodejs đúng mục đích.
- ✅ Hạ tầng prod được tư duy bảo mật: Postgres bind 127.0.0.1 ONLY (compose:17) tránh Docker bypass UFW, nginx có limit_req cho /api/auth (5r/m) và /api/reports view|download (60r/m), security headers, TLS 1.2/1.3 (nginx/blackcrest.conf).
- ✅ Backup tuân theo 3-2-1: pg_dump custom format + tar storage + rclone offsite tại nhà cung cấp VN (data localization) + retention 14 ngày (backup.sh), script dùng `set -euo pipefail` fail-fast.
- ✅ Quản lý biến môi trường có nền tảng tốt: .env.example đầy đủ và prod compose ép biến bắt buộc bằng cú pháp `${AUTH_SECRET:?}` / `${POSTGRES_PASSWORD:?set in .env}` để fail-fast khi thiếu secret.

---

### 6.3 Team & Process — 31/100 (D)

Dự án KHÔNG nằm dưới version control nào (không có thư mục .git, `git rev-parse` báo lỗi) — đây là rủi ro quy trình P0 lớn nhất: không có lịch sử, không thể review, không thể rollback, không có nền tảng cộng tác cho một cổng tài liệu gia sản tư nhân. Toàn bộ tầng branch/PR/code-review không tồn tại, không CI/CD, zero test tự động. Bù lại, tài liệu kỹ thuật lại là điểm sáng bất ngờ: README.md cho phép một dev mới chạy được từ con số 0 trong vài phút, và thư mục design-reference/ là một knowledge base thiết kế phong phú, có quy ước port rõ ràng. Tuy nhiên các quyết định kiến trúc/bảo mật cốt lõi được README dẫn chiếu tới một "blueprint" KHÔNG tồn tại trong repo, và không có CLAUDE.md/CONTRIBUTING/ADR nào ghi lại lý do thiết kế.

| Sub-tiêu chí | Điểm | Trạng thái | Ghi chú |
|---|:---:|:---:|---|
| Git workflow | 0/5 | missing | Không có .git; `git rev-parse --is-inside-work-tree` trả về 'not a git repository'. Không lịch sử, không commit, không rollback. Rủi ro P0. |
| Branch strategy | 0/5 | missing | Không có version control nên không tồn tại bất kỳ branch/trunk/release nào. Không thể cô lập công việc đang dở. |
| PR process | 0/5 | missing | Không repo, không .github/, không có PR/MR nào. Mọi thay đổi áp thẳng lên working tree không qua cổng kiểm soát. |
| Code review process | 0/5 | missing | Không có cơ chế review (không PR, không CODEOWNERS, không CI gate). Với portal bảo mật, code chạm authz/watermark/token vào prod không có cặp mắt thứ hai. |
| Development workflow | 3/5 | adequate | pnpm scripts gọn (dev/build/typecheck/db:migrate/db:seed/db:studio), .claude/launch.json cố định Node 22 qua nvm, scripts/ hữu ích. Nhưng `lint` mồ côi (không eslintrc) và không có test runner. |
| Documentation quality | 3/5 | adequate | README.md đầy đủ để onboard (các bước chạy, tài khoản mẫu, tóm tắt bảo mật, cấu trúc). design-reference/ phong phú. Trừ điểm: dẫn chiếu 'blueprint §5/§6/§6.14' tới tài liệu không tồn tại trong repo. |
| Knowledge sharing | 2/5 | weak | design-reference/ (PORTING/SCREENS-CONVENTIONS, SKILL.md, DESIGN-CHAT.md 916 dòng) là điểm sáng; scripts/verify-entitlements.ts mã hoá tri thức bảo mật. Nhưng lý do kiến trúc nằm ngoài repo ('blueprint') và không có ADR/CLAUDE.md. |
| Onboarding experience | 3/5 | adequate | README 'Chạy local' + bảng tài khoản mẫu + mật khẩu dev cho phép dev mới chạy được nhanh. Nhưng thiếu phần 'làm việc nhóm/đóng góp như thế nào' (không git, không CONTRIBUTING). |
| Ownership model | 0/5 | missing | Không CODEOWNERS, không tên tác giả/maintainer, không LICENSE, không git blame (vì không có git). Không thể truy vết ai sở hữu module nào. |
| Long-term sustainability | 1/5 | weak | Không git + 0 test + không CI + lý do thiết kế ngoài repo = bus factor cực thấp, không thể audit thay đổi, mọi regression bảo mật không được chặn. Không bền vững cho định chế. |

**Findings:**

<details><summary><strong>PROC-01 · 🔴 CRITICAL — </strong> — Dự án hoàn toàn không có version control (không git) — rủi ro quy trình P0</summary>

- **Sub-tiêu chí:** Git workflow · **Effort:** S
- **Bằng chứng:** Lệnh `git rev-parse --is-inside-work-tree` trong /Users/luuphuc/Projects/blackcrest trả về: 'fatal: not a git repository (or any of the parent directories): .git'. `ls -la` thư mục gốc không có entry `.git` (chỉ có .claude, .next, node_modules...). Tuy vậy .gitignore (line 1-32) lại tồn tại — repo được chuẩn bị cho git nhưng chưa từng `git init`.
- **Tác động:** Không có lịch sử thay đổi, không thể rollback khi một bản vá chạm authz/watermark/download-token gây regression, không thể review, không nền tảng cộng tác đa người. Với cổng tài liệu gia sản tư nhân (dữ liệu nhạy cảm, cô lập entitlement), việc một thay đổi sai có thể lộ báo cáo giữa các nhóm khách mà không có cách nào truy vết hay khôi phục là rủi ro chặn-launch.
- **Khuyến nghị:** Thực hiện NGAY: `git init`, commit toàn bộ trạng thái hiện tại làm baseline, đẩy lên remote riêng tư (GitHub/GitLab private). Xác minh .gitignore loại trừ .env và /storage/ TRƯỚC commit đầu để tránh lộ secret. Đây là việc bắt buộc đầu tiên trước mọi quy trình khác.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>PROC-02 · 🟠 HIGH — </strong> — Không có branch strategy / PR / code review — thay đổi vào prod không qua cổng kiểm soát</summary>

- **Sub-tiêu chí:** PR process · **Effort:** M
- **Bằng chứng:** Hệ quả trực tiếp của PROC-01: không có .git nên không tồn tại branch nào; `ls -d .github/` trả về NONE (không có template PR, không CODEOWNERS, không workflow). Không có file CI nào (.github/, .gitlab-ci.yml, .circleci/ đều NONE).
- **Tác động:** Code chạm các bề mặt bảo mật trọng yếu — src/lib/authz.ts (canViewReport), src/lib/watermark.ts, src/lib/download-token.ts — được sửa và chạy thẳng không có cặp mắt thứ hai và không có gate tự động (typecheck/test). Một dev có thể vô tình gỡ một guard entitlement mà không ai phát hiện cho tới khi khách báo lộ dữ liệu.
- **Khuyến nghị:** Sau khi có git: thiết lập quy trình tối thiểu — branch `main` được bảo vệ, mọi thay đổi qua feature branch + PR + ít nhất 1 reviewer; thêm CODEOWNERS gán src/lib/authz.ts, src/auth*, src/server/* cho người chịu trách nhiệm bảo mật; bật required status checks (typecheck) trước merge.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>PROC-03 · 🟠 HIGH — </strong> — Không có CI: typecheck và verify-entitlements.ts chỉ chạy thủ công</summary>

- **Sub-tiêu chí:** Development workflow · **Effort:** M
- **Bằng chứng:** Không có .github/workflows hay file CI nào (xác nhận NONE). scripts/verify-entitlements.ts:1-6 là test cô lập entitlement chất lượng tốt ('Exits non-zero on any violation', dòng 64-67 `process.exit(1)` khi có vi phạm) nhưng chỉ chạy bằng tay `pnpm tsx scripts/verify-entitlements.ts`. package.json:11 có `"typecheck": "tsc --noEmit"` nhưng không được tự động hoá.
- **Tác động:** Thuộc tính bảo mật cốt lõi (cô lập cross-group, dòng 54-57 của script: 'Gia An CANNOT see Trần thematic') không được enforce ở mỗi thay đổi. Một regression sẽ lọt nếu dev quên chạy script. Đây là một security guard đã viết sẵn nhưng chưa được kết nối vào quy trình.
- **Khuyến nghị:** Sau khi có git+remote: tạo CI workflow tối thiểu chạy `pnpm typecheck` + `pnpm tsx scripts/verify-entitlements.ts` (cần Postgres ephemeral, service container) trên mỗi PR; đặt làm required check. Đây là đòn bẩy lớn nhất vì test đã tồn tại, chỉ thiếu tự động hoá.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>PROC-04 · 🟡 MEDIUM</strong> — Quyết định kiến trúc/bảo mật dẫn chiếu 'blueprint' không tồn tại trong repo</summary>

- **Sub-tiêu chí:** Knowledge sharing · **Effort:** M
- **Bằng chứng:** README.md dẫn chiếu blueprint ba lần như nguồn chân lý: dòng 51 '## Bảo mật (đã hiện thực — blueprint §6)', dòng 59 '## Triển khai (blueprint §5)', dòng 42 'Kiểm thử cô lập entitlement (blueprint §6.14)'. `find . -iname "*blueprint*"` (loại node_modules) không trả về kết quả nào — tài liệu blueprint không nằm trong repo. Cũng không có CLAUDE.md, CONTRIBUTING, thư mục docs/ hay ADR nào (đều xác nhận NONE).
- **Tác động:** Lý do (rationale) đằng sau các lựa chọn bảo mật quan trọng — vì sao middleware KHÔNG là biên bảo mật (CVE-2025-29927, README dòng 57), vì sao token tải xuống 60s, mô hình entitlement XOR — sống ngoài codebase. Dev mới đọc được 'cái gì' nhưng không có 'tại sao'; nếu blueprint thất lạc, tri thức kiến trúc biến mất (bus factor = 1).
- **Khuyến nghị:** Đưa blueprint vào repo dưới docs/ARCHITECTURE.md hoặc tách thành các ADR (docs/adr/0001-middleware-not-security-boundary.md, ...). Thêm CLAUDE.md tóm tắt quy ước (đã có sẵn nội dung tốt trong design-reference/PORTING-CONVENTIONS.md để tham khảo). Sửa các dẫn chiếu '§' thành link nội bộ.

</details>

<details><summary><strong>PROC-05 · 🟡 MEDIUM</strong> — Không có mô hình ownership: thiếu CODEOWNERS, maintainer, LICENSE</summary>

- **Sub-tiêu chí:** Ownership model · **Effort:** S
- **Bằng chứng:** `ls CODEOWNERS LICENSE*` → NONE. Không có .git nên không có git blame/author history. package.json:2 chỉ có `"name": "blackcrest"`, không trường `author`/`contributors`. Không tồn tại CONTRIBUTING.md.
- **Tác động:** Không thể xác định ai chịu trách nhiệm cho các module nhạy cảm (authz, auth, download-token). Khi sự cố bảo mật xảy ra, không có đường escalation rõ ràng. Thiếu LICENSE cũng gây mơ hồ pháp lý về quyền sở hữu mã cho một sản phẩm thương mại.
- **Khuyến nghị:** Thêm LICENSE (proprietary/private là phù hợp cho sản phẩm gia sản tư nhân), điền `author`/`repository` vào package.json, và sau khi có git thêm .github/CODEOWNERS gán các đường dẫn bảo mật trọng yếu cho chủ sở hữu cụ thể.

</details>

<details><summary><strong>PROC-06 · ⚪ LOW</strong> — Script `lint` mồ côi — gọi `next lint` nhưng không có ESLint config</summary>

- **Sub-tiêu chí:** Development workflow · **Effort:** S
- **Bằng chứng:** package.json:10 `"lint": "next lint"` nhưng `ls .eslintrc* eslint.config.*` trả về 'NO ESLINT CONFIG'. Không có .prettierrc nào. .gitignore:31 ignore `.vscode` nên cấu hình editor không được chia sẻ.
- **Tác động:** `pnpm lint` sẽ hoặc thất bại hoặc chạy interactive-setup không xác định, gây nhiễu cho dev mới làm theo README. Không có chuẩn style/lint chung khiến chất lượng mã phân kỳ giữa các người đóng góp — vấn đề khi đội mở rộng.
- **Khuyến nghị:** Thêm eslint.config (flat config) với next/core-web-vitals + @typescript-eslint, và prettier; hoặc gỡ script `lint` nếu chủ đích dựa vào typecheck. Đưa cấu hình vào CI (PROC-03).

</details>

<details><summary><strong>PROC-07 · ⚪ LOW</strong> — File .env chứa secret dev thật nằm trên đĩa — chưa có quy trình quản lý/luân chuyển bí mật</summary>

- **Sub-tiêu chí:** Long-term sustainability · **Effort:** S
- **Bằng chứng:** .env (dòng 3, 7) chứa giá trị thật: `AUTH_SECRET="rHwjSOI5mClTJehpuQhJbx8uY460VZUjVW1iibNkV3w="` và `DOWNLOAD_TOKEN_SECRET="QxYt0//76LfTcvibV+OAh4X4nM8ij1iMZLmaoeiAgKs="`. .gitignore:19 đúng là có `.env` nên sẽ không bị commit (điểm tốt), và .env.example dùng placeholder 'replace-me'. Tuy nhiên không có quy trình tài liệu hoá việc tạo/luân chuyển/lưu trữ secret prod.
- **Tác động:** Hiện tại chưa rò rỉ (vì chưa có git và .gitignore đã chặn .env). Nhưng khi `git init` (PROC-01) được chạy, nếu thực thi bất cẩn có nguy cơ commit nhầm .env. Dài hạn, không có quy trình secret-management khiến việc luân chuyển AUTH_SECRET/DOWNLOAD_TOKEN_SECRET (cần thiết khi thu hồi token) trở nên ad-hoc.
- **Khuyến nghị:** Trước khi git init, double-check `.env` bị ignore. Ghi tài liệu trong README/docs về quy trình sinh secret (đã có hint `openssl rand -base64 32` trong .env.example) và nơi lưu secret prod (secret manager, không file phẳng). Cân nhắc luân chuyển 2 secret dev này nếu chúng từng được chia sẻ.

</details>

**Điểm mạnh:**

- ✅ README.md là một tài liệu onboarding thực sự tốt: phần 'Chạy local' (dòng 21-30) liệt kê đủ chuỗi lệnh từ `pnpm install` → docker compose db → db:migrate → db:seed → generate-sample-pdfs → dev; bảng tài khoản mẫu kèm vai trò/trạng thái (dòng 32-40) và mật khẩu dev cho phép dev mới đăng nhập ngay; phần tóm tắt bảo mật (dòng 51-57) và cấu trúc thư mục (dòng 65-76) cô đọng, đúng trọng tâm.
- ✅ Thư mục design-reference/ là một knowledge base thiết kế phong phú và có tổ chức: PORTING-CONVENTIONS.md (89 dòng, quy ước port component + cheat-sheet token) và SCREENS-CONVENTIONS.md (54 dòng, quy ước dựng màn hình + chữ ký API tầng dữ liệu) là tài liệu chuyển giao tri thức chất lượng cao, giúp người mới hiểu nhanh các bất biến kiến trúc (RSC-first, không sửa tokens, gọi tầng authz/data thay vì Prisma thô).
- ✅ scripts/verify-entitlements.ts là một security regression check viết tốt, có tài liệu (header dòng 1-6), tự sao chép `visibleWhere` từ authz.ts và assert các thuộc tính cô lập cross-group quan trọng, exit non-zero khi vi phạm — sẵn sàng để cắm vào CI.
- ✅ Vệ sinh secret cơ bản đúng: .gitignore (dòng 19-20) loại trừ .env và .env*.local, dòng 23 loại trừ /storage/; .env.example (dòng 7, 18) dùng placeholder 'replace-me' kèm gợi ý `openssl rand -base64 32` thay vì secret thật.
- ✅ .claude/launch.json cố định toolchain chính xác (Node v22.15.0 qua nvm + `pnpm dev`, cổng 3000), giúp môi trường dev nhất quán và khớp với yêu cầu Node ≥ 22 nêu trong README dòng 18.

---

### 6.4 Observability — 38/100 (D)

Blackcrest có một nền móng observability tốt về mặt bảo mật-kiểm toán (audit log append-only được index và có trang admin/audit; report access log được ghi nhận; /api/health kiểm tra kết nối DB), nhưng thiếu gần như toàn bộ observability vận hành ở mức tối thiểu cho một cổng tài liệu private-wealth chạy production. Không có error tracking (không Sentry/tương đương, lỗi server-action/route đi vào hư vô), không có monitoring/APM/metrics, không có alerting, không có structured logging (chỉ 3 chỗ console.error rời rạc), không có global-error.tsx hay instrumentation.ts. Đáng lo nhất: /api/health tồn tại nhưng KHÔNG được mắc vào bất kỳ healthcheck orchestrator nào (cả Dockerfile lẫn service web trong docker-compose đều không có healthcheck), và ReportAccessLog — bằng chứng pháp lý ai đã xem/tải báo cáo nào — không được hiển thị ở bất kỳ giao diện nào. Việc thiếu analytics/session replay là phù hợp về quyền riêng tư, không bị trừ điểm.

| Sub-tiêu chí | Điểm | Trạng thái | Ghi chú |
|---|:---:|:---:|---|
| Error tracking | 0/5 | missing | Không có Sentry hay bất kỳ công cụ nào; lỗi route/server-action không được ghi nhận tập trung. error.tsx chỉ console.error; không có global-error.tsx, không có instrumentation.ts. |
| Monitoring | 1/5 | weak | Chỉ có /api/health kiểm tra DB. Không APM, không metrics, không uptime monitor. Health endpoint không được orchestrator nào gọi. |
| Analytics | 0/5 | na | Không có analytics. Với cổng tài liệu private-wealth, không tracking là lựa chọn riêng tư hợp lý — không trừ điểm chất lượng, đánh dấu na. |
| User tracking | 0/5 | na | Không có user tracking pixel/SDK. Phù hợp bối cảnh bảo mật-riêng tư; tuy nhiên audit/access log đã ghi nhận hành vi người dùng ở mức security. |
| Session replay | 0/5 | na | Không có session replay (LogRocket/FullStory). Đối với portal tài chính, session replay là rủi ro lộ dữ liệu nhạy cảm — việc không có là đúng đắn. |
| Logging | 1/5 | weak | Chỉ 3 lệnh console.error rời rạc (error.tsx, audit.ts). Không structured logger, không log level, không request-id/correlation, không cấu hình log driver Docker. Prisma log chỉ ['error'] ở prod. |
| Alerting | 0/5 | missing | Không có cảnh báo nào. health 503, audit-write fail, hay lỗi stream PDF đều không kích hoạt thông báo cho ai. |
| Performance monitoring | 0/5 | missing | Không có Web Vitals, không tracing, không đo thời gian stream PDF/argon2/watermark — các thao tác nặng nhất hoàn toàn không được đo. |
| Health checks | 2/5 | weak | /api/health kiểm tra DB qua SELECT 1 (tốt) nhưng KHÔNG được mắc vào healthcheck của service web trong docker-compose.prod.yml, cũng không có HEALTHCHECK trong Dockerfile; chỉ db có pg_isready. |

**Findings:**

<details><summary><strong>OBS-01 · 🟠 HIGH — </strong> — Không có error tracking — lỗi server-action và API route biến mất không dấu vết</summary>

- **Sub-tiêu chí:** Error tracking · **Effort:** M
- **Bằng chứng:** grep toàn bộ src/ và package.json cho sentry|bugsnag|opentelemetry|datadog|newrelic trả về 0 kết quả. src/app/[locale]/error.tsx:16 chỉ `console.error(error);`. loginAction tại src/server/auth-actions.ts:135 `throw error;` ném lỗi không xác định lên trên mà không log/capture. Các route stream PDF (src/app/api/reports/[id]/view/route.ts, download/route.ts) không có try/catch quanh storage.stat/getWatermarkedKey/getStream — lỗi đi thẳng vào handler mặc định của Next, không nơi nào ghi nhận.
- **Tác động:** Khi PDF viewer (crown jewel) lỗi với một client cụ thể, đội ngũ không có cách nào biết hay tái hiện. Với cổng tài chính, sự cố âm thầm làm xói mòn niềm tin của khách hàng tổ chức và kéo dài thời gian khắc phục.
- **Khuyến nghị:** Thêm Sentry (hoặc tương đương self-host như GlitchTip) qua src/instrumentation.ts + instrumentation-client.ts theo chuẩn Next 15; thêm src/app/global-error.tsx để bắt lỗi ở root layout; bọc captureException trong logAudit/route stream. Lọc PII (email, IP) trước khi gửi.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>OBS-02 · 🟠 HIGH — </strong> — /api/health tồn tại nhưng KHÔNG được mắc vào healthcheck của service web (production)</summary>

- **Sub-tiêu chí:** Health checks · **Effort:** S
- **Bằng chứng:** src/app/api/health/route.ts:9 chạy `await prisma.$queryRaw\`SELECT 1\`` và trả 503 nếu fail — đúng chuẩn. NHƯNG trong docker-compose.prod.yml chỉ service `db` (dòng 20-24) có healthcheck `pg_isready`; khối service `web` (dòng 26-46) KHÔNG có khối healthcheck nào. Dockerfile (dòng 36-37) chỉ có `EXPOSE 3000` và `CMD ["node", "server.js"]`, không có chỉ thị HEALTHCHECK. nginx upstream cũng không có active health probe.
- **Tác động:** Endpoint health được viết kỹ nhưng vô dụng trong thực tế: nếu app treo (DB rớt, sự kiện loop, OOM) thì Docker/nginx không phát hiện và không restart/loại khỏi upstream. Triển khai blue/green mà blueprint nhắc tới không thể tự xác minh container 'khoẻ' trước khi cắt traffic.
- **Khuyến nghị:** Thêm `healthcheck` cho service web trong docker-compose.prod.yml (wget -qO- http://127.0.0.1:3000/api/health hoặc CMD-SHELL), và/hoặc HEALTHCHECK trong Dockerfile. Dùng kết quả này làm điều kiện cho `depends_on: web: condition: service_healthy` của nginx và cho cắt traffic blue/green.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>OBS-03 · 🟠 HIGH — </strong> — ReportAccessLog được ghi nhưng không hề được hiển thị — điểm mù pháp lý cho ai đã xem/tải báo cáo</summary>

- **Sub-tiêu chí:** Monitoring · **Effort:** M
- **Bằng chứng:** src/lib/audit.ts:33-45 ghi ReportAccessLog cho mọi VIEW/DOWNLOAD (gọi từ view/route.ts:64 và download/route.ts:66), model có index đầy đủ tại prisma/schema.prisma:251-265 (@@index reportId/userId + createdAt, lưu cả ip, userAgent). NHƯNG grep `reportAccessLog|listReportAccess` cho thấy chỉ có chỗ GHI; không có hàm server nào ĐỌC nó và admin/audit/page.tsx chỉ gọi listAuditLog (admin-data.ts:62), không đụng tới ReportAccessLog.
- **Tác động:** Đối với portal tài liệu mật, log truy cập (ai mở/tải báo cáo nào, khi nào, từ IP nào) là bằng chứng forensics quan trọng nhất khi điều tra rò rỉ. Dữ liệu được thu thập đúng nhưng admin không có cách nào xem — chỉ truy vấn được bằng SQL thủ công, vô dụng trong sự cố thực tế.
- **Khuyến nghị:** Thêm hàm listReportAccess (giới hạn role staff như listAuditLog) và một trang/khu vực admin hiển thị access log với lọc theo report, user, khoảng thời gian. Cân nhắc cảnh báo khi một user tải bất thường nhiều báo cáo.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>OBS-04 · 🟡 MEDIUM</strong> — Không có structured logging, log level, hay correlation id</summary>

- **Sub-tiêu chí:** Logging · **Effort:** M
- **Bằng chứng:** Toàn bộ codebase chỉ có 3 lệnh log: src/app/[locale]/error.tsx:16, src/lib/audit.ts:28 và :43 (`console.error('[audit] failed to write', ...)`, `console.error('[access-log] failed to write', ...)`). Không có thư viện logger (pino/winston — grep 0 kết quả). src/lib/prisma.ts:11 đặt Prisma log = ['error'] ở prod. docker-compose không cấu hình logging driver (grep logging:|json-file|max-size = 0 kết quả) nên log container không xoay vòng/giới hạn dung lượng.
- **Tác động:** Khi audit-write thất bại (mất bằng chứng tuân thủ!), thông tin chỉ nằm trong stdout không cấu trúc, không gắn request-id/user-id, không gửi đi đâu, và không được cảnh báo. Không thể truy vết một request end-to-end. Log không xoay vòng có thể đầy đĩa theo thời gian.
- **Khuyến nghị:** Đưa vào structured logger (pino) với JSON, level, và request-id/trace-id; chuyển 3 console.error sang logger; cấu hình logging driver json-file với max-size/max-file trong compose (hoặc forward sang Loki/Datadog). Đặc biệt nâng mức nghiêm trọng cho audit-write failure (nó hiện chỉ là console.error nuốt lỗi tại audit.ts:26-29).

</details>

<details><summary><strong>OBS-05 · 🟡 MEDIUM</strong> — Không có alerting trên các tín hiệu nghiêm trọng (health 503, audit/access-log write fail)</summary>

- **Sub-tiêu chí:** Alerting · **Effort:** M
- **Bằng chứng:** Không tìm thấy bất kỳ tích hợp cảnh báo nào (grep pagerduty/slack/alert SDK trong src/ = 0). health route trả 503 (route.ts:12) nhưng không ai được báo. audit.ts:26-29 và :42-44 nuốt lỗi ghi log chỉ bằng console.error — sự kiện 'mất bằng chứng kiểm toán' xảy ra trong im lặng.
- **Tác động:** Sự cố quan trọng nhất với một wealth portal — DB rớt, ghi audit log thất bại (vi phạm tuân thủ), tỉ lệ lỗi tăng — sẽ không kích hoạt thông báo cho con người. Phát hiện sự cố phụ thuộc vào khách hàng phàn nàn.
- **Khuyến nghị:** Sau khi có error tracking (OBS-01) và health probe (OBS-02), gắn alert rule tối thiểu: health fail liên tục, error rate vượt ngưỡng, audit-write failure. Có thể dùng uptime monitor bên ngoài (UptimeRobot/Better Uptime) gọi /api/health + webhook Slack/email.

</details>

<details><summary><strong>OBS-06 · ⚪ LOW</strong> — Không đo lường hiệu năng các thao tác nặng (stream PDF, watermark, argon2)</summary>

- **Sub-tiêu chí:** Performance monitoring · **Effort:** M
- **Bằng chứng:** Không có Web Vitals/Speed Insights/tracing (grep web-vitals|reportWebVitals|speed-insights|otel = 0). Các thao tác tốn kém — getWatermarkedKey (pdf-lib + fontkit, view/route.ts:46) và stream theo Range (view/route.ts:72-98) — không có đo thời gian hay span nào.
- **Tác động:** Không thể biết watermark/stream PDF có phải nút thắt hiệu năng khi tải tăng hay không, cũng không phát hiện hồi quy hiệu năng. Tác động ít cấp bách hơn vì lưu lượng portal nội bộ thường thấp.
- **Khuyến nghị:** Khi có tracing (OpenTelemetry qua instrumentation.ts), thêm span quanh getWatermarkedKey và storage.getStream; tuỳ chọn ghi nhận Web Vitals của PDF viewer. Đây là cải thiện chất lượng, không chặn launch.

</details>

<details><summary><strong>OBS-07 · ⚪ LOW</strong> — Bảng audit không có lọc/phân trang/tìm kiếm và metadata chứa PII (email)</summary>

- **Sub-tiêu chí:** Logging · **Effort:** M
- **Bằng chứng:** admin/audit/page.tsx:56 `listAuditLog(80)` cứng 80 dòng mới nhất, không lọc theo actor/action/thời gian, không phân trang (admin-data.ts:62 chỉ `take`). Metadata audit lưu email người dùng: src/server/accounts.ts:32 `metadata: { email: updated.email, status }`. Không có chính sách retention cho AuditLog/ReportAccessLog/DownloadToken (DownloadToken có comment 'Sweep expired rows periodically' tại schema.prisma:283 nhưng download-token.ts không có job dọn dẹp).
- **Tác động:** Khi log tích luỹ, điều tra viên không thể truy vết sự kiện cũ hơn 80 dòng qua UI. Email trong metadata là PII cần cân nhắc khi xuất/chia sẻ log. DownloadToken phình to vô hạn vì không có sweep.
- **Khuyến nghị:** Thêm lọc + phân trang cho trang audit; cân nhắc retention/ẩn danh PII; hiện thực job dọn DownloadToken hết hạn (cron hoặc deleteMany trong route) như comment đã hứa.

</details>

**Điểm mạnh:**

- ✅ Audit log được thiết kế đúng chuẩn append-only, never-update/delete (src/lib/audit.ts:5-30), bao quát đầy đủ các sự kiện vòng đời quan trọng (duyệt tài khoản, cấp/thu hồi quyền, các trạng thái báo cáo) qua enum AuditAction, và được index hợp lý (prisma/schema.prisma:278-279: @@index([action, createdAt]) và @@index([targetType, targetId])).
- ✅ Audit log có giao diện truy vấn thực tế cho staff: trang admin/audit (src/app/[locale]/(admin)/admin/audit/page.tsx) hiển thị thời gian/người thực hiện/hành động/đối tượng với nhãn tiếng Việt, và listAuditLog có gác quyền requireRole('SUPER_ADMIN','APPROVER') (admin-data.ts:63).
- ✅ Ghi log không bao giờ làm hỏng thao tác chính: cả logAudit và logReportAccess đều bọc try/catch và access log dùng fire-and-forget `void logReportAccess(...)` (view/route.ts:64) — đúng nguyên tắc audit không chặn nghiệp vụ.
- ✅ /api/health kiểm tra đúng thứ cần kiểm tra — kết nối DB qua `SELECT 1`, dùng runtime nodejs + force-dynamic, trả 503 khi degraded (src/app/api/health/route.ts:7-13).
- ✅ ReportAccessLog ghi nhận đủ chiều forensics (userId, reportId, action, ip, userAgent, createdAt) và được index theo cả report lẫn user kèm thời gian (prisma/schema.prisma:263-264) — dữ liệu nền tảng cho điều tra rò rỉ đã sẵn sàng, chỉ thiếu giao diện đọc.
- ✅ Không triển khai analytics/session replay/user-tracking của bên thứ ba — lựa chọn đúng đắn về quyền riêng tư cho một cổng tài liệu private-wealth, tránh rủi ro ghi lại nội dung báo cáo nhạy cảm.

---

### 6.5 Localization (i18n) — 42/100 (D)

Hạ tầng i18n (next-intl 4) được cấu hình bài bản: locale routing với localePrefix "always", navigation helpers locale-aware, html lang đúng, fallback an toàn, và ba catalog vi/en/zh có parity hoàn hảo (72 key, không thiếu/thừa, đã dịch đủ). Tuy nhiên độ phủ thực tế cực thấp: catalog chỉ chứa nav + nút + nhãn auth, còn gần như toàn bộ nội dung UI là chuỗi tiếng Việt hard-code vượt qua next-intl — đặc biệt surface quan trọng nhất là PDF viewer (1244 dòng) gần như 100% hard-code VI và trang chủ marketing. Hệ quả: /en và /zh chỉ dịch được phần khung, còn hero, viewer, dialog, toast, bảng admin, trang lỗi/404 và mọi định dạng số/tiền tệ đều hiện ra tiếng Việt — đây là lỗi nghiêm trọng cho một portal đa ngôn ngữ phục vụ nhà đầu tư tổ chức.

| Sub-tiêu chí | Điểm | Trạng thái | Ghi chú |
|---|:---:|:---:|---|
| Locale routing | 5/5 | strong | defineRouting với locales vi/en/zh, defaultLocale vi, localePrefix "always", localeCookie 1 năm; navigation.ts dùng createNavigation; html lang={locale} đúng (layout.tsx:39); generateStaticParams prerender đủ locale. |
| Message catalog completeness | 3/5 | adequate | Parity hoàn hảo 72/72 key giữa vi/en/zh, không key thiếu/thừa, giá trị đã dịch (trừ Brand.name, Locale.* hợp lệ). Nhưng catalog quá nhỏ so với lượng text thực tế trong UI. |
| Hardcoded strings | 1/5 | weak | 18 file chứa chuỗi VI hard-code; pdf-viewer.tsx (~1244 dòng) và page.tsx marketing gần như toàn bộ hard-code; cả file dùng useTranslations vẫn hard-code phần body. Đây là điểm yếu lớn nhất. |
| Pluralization | 0/5 | missing | Không có ICU plural/select ở bất kỳ đâu; đơn vị đếm nối chuỗi cứng ("tài liệu", "trang") sau formatNumber — sai trên en/zh và không số ít/số nhiều. |
| Date/number/currency formatting | 2/5 | weak | formatDate/formatDateTime có nhận locale (tốt), nhưng formatVND/formatVNDCompact/formatNumber/formatPercent hard-code vi-VN và hậu tố VI (tỷ/tr) — sai trên /en và /zh. |
| Locale fallback | 4/5 | strong | request.ts dùng hasLocale → defaultLocale; layout.tsx gọi notFound() cho locale không hợp lệ; middleware suy ra locale an toàn từ segment đầu. Hành vi fallback đúng và an toàn. |
| RTL readiness | 0/5 | na | Cả ba locale vi/en/zh đều LTR; không có yêu cầu RTL. Không có dir=/logical-property nhưng không cần thiết — đánh dấu N/A, không trừ điểm tổng. |

**Findings:**

<details><summary><strong>I18N-01 · 🟠 HIGH — </strong> — PDF viewer — surface quan trọng nhất — gần như 100% hard-code tiếng Việt, bỏ qua next-intl</summary>

- **Sub-tiêu chí:** Hardcoded strings · **Effort:** L
- **Bằng chứng:** src/app/[locale]/(client)/reports/[slug]/pdf-viewer.tsx không import next-intl. Toàn bộ nhãn hard-code VI: STATUS_LABEL={DRAFT:"Nháp",...} (dòng 58-65); watermark "BẢO MẬT" (dòng 91); footer "Bảo mật — chỉ dành cho nhà đầu tư · Trang {n} / {total}" (dòng 131); tooltip/IconButton "Quay lại thư viện"/"Tải xuống"/"In"/"Chia sẻ" (dòng 735-789); Dialog "Phê duyệt báo cáo?"/"Từ chối báo cáo?" (dòng 947,972); Toast "Đã phê duyệt báo cáo" (dòng 1003); SidePanel "Thông tin"/"Quyền truy cập"/"Phân loại"/"Quy trình duyệt" (dòng 1099-1131); chỉ dùng locale cho formatDate.
- **Tác động:** Trên /en và /zh, toàn bộ trải nghiệm xem báo cáo (crown jewel) hiển thị tiếng Việt: nhà đầu tư quốc tế không đọc được trạng thái, nút, dialog phê duyệt, cảnh báo bảo mật. Phá vỡ hoàn toàn cam kết đa ngôn ngữ trên đúng màn hình có giá trị nhất.
- **Khuyến nghị:** Đưa toàn bộ chuỗi của pdf-viewer.tsx vào catalog (namespace Viewer/Status), dùng useTranslations cho client component; STATUS_LABEL dùng t(`Status.${status}`) thay vì map cứng; nhãn watermark/footer cân nhắc dùng Common.confidential đã có sẵn cho mỗi locale.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>I18N-02 · 🟠 HIGH — </strong> — Trang chủ marketing: hero, badge, trust stats, features, metadata hard-code tiếng Việt</summary>

- **Sub-tiêu chí:** Hardcoded strings · **Effort:** M
- **Bằng chứng:** src/app/[locale]/(public)/page.tsx: metadata title/description hard-code VI (dòng 12-14); Badge "Dành cho quản lý gia sản tư nhân" (dòng 134); h1 "Tài liệu đầu tư, được kiểm soát đến từng trang" (dòng 139); sub "Blackcrest phát hành, phê duyệt..." (dòng 143-144); "Tuân thủ bảo mật cấp tổ chức · Không cần thẻ tín dụng" (dòng 169); Trust stats labels "nhà đầu tư đang hoạt động"... (dòng 273-276); Features "Quy trình phê duyệt"/"Bảo mật theo vai trò"/"Nhanh như bàn phím" (dòng 303-314). Chỉ nav/nút dùng t().
- **Tác động:** Khách truy cập /en và /zh thấy trang giới thiệu hoàn toàn tiếng Việt (chỉ vài nút được dịch). Ấn tượng đầu tiên với nhà đầu tư nước ngoài bị hỏng; metadata SEO/hreflang cũng chỉ một ngôn ngữ.
- **Khuyến nghị:** Tách toàn bộ marketing copy + metadata sang namespace Marketing/Home trong vi/en/zh; metadata dùng generateMetadata async với getTranslations theo locale.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>I18N-03 · 🟡 MEDIUM</strong> — Định dạng số/tiền tệ/phần trăm cố định vi-VN với hậu tố tiếng Việt, sai trên en/zh</summary>

- **Sub-tiêu chí:** Date/number/currency formatting · **Effort:** M
- **Bằng chứng:** src/lib/format.ts: formatVND dùng new Intl.NumberFormat("vi-VN") (dòng 9); formatVNDCompact trả "₫ ... tỷ"/"₫ ... tr" với hậu tố VI cứng (dòng 16-17); formatNumber/formatPercent cũng cố định "vi-VN" (dòng 22,31). Không hàm nào nhận locale, trong khi portal.tsx gọi formatVNDCompact/formatPercent/formatNumber (dòng 52-70) trên mọi locale.
- **Tác động:** Trên /en, /zh: dấu phân tách nghìn/thập phân theo kiểu Việt (1.280 / 8,42) và đơn vị "tỷ"/"tr" hiển thị cho người dùng en/zh — gây hiểu nhầm số liệu tài chính, vốn là dữ liệu nhạy cảm của nhà đầu tư.
- **Khuyến nghị:** Cho các hàm format nhận tham số locale (như formatDate đã làm) và map locale→Intl locale; thay hậu tố "tỷ"/"tr" bằng compact notation của Intl ({notation:"compact"}) hoặc khóa dịch theo locale.

</details>

<details><summary><strong>I18N-04 · 🟡 MEDIUM</strong> — Không có pluralization; đơn vị đếm nối chuỗi cứng tiếng Việt</summary>

- **Sub-tiêu chí:** Pluralization · **Effort:** M
- **Bằng chứng:** Không có ICU plural/select trong messages/ (grep "plural|select" = NONE) và không dùng useFormatter/t.rich. Đơn vị nối cứng: src/app/[locale]/(client)/reports/page.tsx dòng 90 `{formatNumber(items.length, 0)} tài liệu` và dòng 175 `{formatNumber(d.pageCount, 0)} trang`; portal.tsx dòng 53 `formatPercent(2.4) + " tháng này"`.
- **Tác động:** Trên en/zh các đơn vị "tài liệu"/"trang"/"tháng này" vẫn là tiếng Việt; không có cơ chế số ít/số nhiều cho en ("1 document" vs "2 documents"). Câu hiển thị lai ngôn ngữ, thiếu chuyên nghiệp.
- **Khuyến nghị:** Dùng ICU plural trong catalog, ví dụ `"docCount": "{count, plural, other {# tài liệu}}"` và bản en/zh tương ứng, gọi qua t() thay vì nối chuỗi.

</details>

<details><summary><strong>I18N-05 · 🟡 MEDIUM</strong> — Trang lỗi và 404 hard-code tiếng Việt hoàn toàn</summary>

- **Sub-tiêu chí:** Hardcoded strings · **Effort:** S
- **Bằng chứng:** src/app/[locale]/error.tsx: "Lỗi hệ thống" (dòng 24), "Đã xảy ra sự cố" (dòng 27), đoạn mô tả + "Thử lại" (dòng 30,39). src/app/[locale]/not-found.tsx: "Không tìm thấy trang" (dòng 19), mô tả quyền truy cập (dòng 22), "Về trang chủ" (dòng 31). Cả hai không dùng next-intl.
- **Tác động:** Người dùng en/zh gặp lỗi hoặc trang không tồn tại sẽ thấy thông báo tiếng Việt — đặc biệt 404 cũng là ranh giới bảo mật cho báo cáo không có quyền, nên thông điệp cần đa ngôn ngữ.
- **Khuyến nghị:** Đưa chuỗi vào catalog (namespace Error/NotFound). error.tsx là client component nên dùng useTranslations; not-found.tsx có thể dùng getTranslations.

</details>

<details><summary><strong>I18N-06 · 🟡 MEDIUM</strong> — Trang admin & portal: tiêu đề, mô tả, header bảng, nhãn hành động audit hard-code VI</summary>

- **Sub-tiêu chí:** Hardcoded strings · **Effort:** L
- **Bằng chứng:** admin/audit/page.tsx có map nhãn hành động cứng "Phê duyệt tài khoản"/"Từ chối tài khoản"... (dòng 12-26) và header bảng "Thời gian"/"Người thực hiện"/"Hành động"/"Đối tượng" (dòng 83-92), "Nhật ký kiểm toán" (dòng 69); admin/reports/page.tsx header "Tài liệu"/"Quỹ"/"Trạng thái"/"Số trang"/"Cập nhật" (dòng 141-156), "Chưa có báo cáo nào" (dòng 222); admin/entitlements/page.tsx mô tả + "Chưa có nhóm nào" (dòng 54-63); portal/page.tsx KPI labels & "Tài liệu gần đây"/"Chưa có tài liệu nào dành cho bạn" (dòng 51-179). Các trang này có useTranslations nhưng chỉ dịch nav/nút.
- **Tác động:** Khu admin (EDITOR/APPROVER/SUPER_ADMIN) và portal nhà đầu tư trên /en, /zh phần lớn vẫn tiếng Việt: bảng audit, danh sách báo cáo, KPI. Nhân sự/nhà đầu tư quốc tế không vận hành được.
- **Khuyến nghị:** Bổ sung namespace cho từng trang (Audit/Reports/Entitlements/Accounts/Portal) gồm header bảng, empty state, mô tả; nhãn hành động audit map qua khóa dịch theo loại sự kiện.

</details>

<details><summary><strong>I18N-07 · ⚪ LOW</strong> — Chuỗi UI rải rác hard-code: 'Ghi nhớ đăng nhập', aria-label 'Đăng xuất', placeholder, thông báo lỗi tải</summary>

- **Sub-tiêu chí:** Hardcoded strings · **Effort:** S
- **Bằng chứng:** src/app/[locale]/(public)/login/login-form.tsx dòng 52 `<Checkbox name="remember" defaultChecked label="Ghi nhớ đăng nhập" />` (file có useTranslations nhưng nhãn này hard-code); src/components/app-shell.tsx dòng 136 `aria-label="Đăng xuất"`; pdf-viewer.tsx dòng 673 fallback `"Không thể tạo liên kết tải xuống."`; register-form.tsx placeholder "Nguyễn Minh Anh"/"Quỹ Cân bằng Blackcrest" (dòng 62,80) và hint mật khẩu (dòng 90-92).
- **Tác động:** Các chi tiết nhỏ (checkbox remember, aria-label cho screen reader, placeholder, toast lỗi) hiển thị tiếng Việt trên en/zh; ảnh hưởng accessibility đa ngôn ngữ và độ chỉn chu.
- **Khuyến nghị:** Chuyển sang t() từ namespace tương ứng (Auth/Common); aria-label cũng cần dịch để screen reader theo đúng locale.

</details>

<details><summary><strong>I18N-08 · ⚪ LOW</strong> — Metadata mặc định ở root layout hard-code tiếng Việt cho mọi locale</summary>

- **Sub-tiêu chí:** Hardcoded strings · **Effort:** S
- **Bằng chứng:** src/app/[locale]/layout.tsx dòng 10-18: metadata.title.default = "Blackcrest — Cổng tài liệu đầu tư", description = "Cổng phân phối tài liệu đầu tư tư nhân, kiểm soát truy cập đến từng trang." — là export static, không theo locale.
- **Tác động:** Tiêu đề/description trình duyệt và thẻ social/SEO luôn tiếng Việt kể cả khi người dùng đang ở /en hoặc /zh, làm giảm chất lượng hreflang/SEO đa ngôn ngữ.
- **Khuyến nghị:** Thay export metadata tĩnh bằng generateMetadata async đọc getTranslations theo params.locale.

</details>

**Điểm mạnh:**

- ✅ Locale routing cấu hình chuẩn next-intl 4: defineRouting với locales [vi,en,zh], defaultLocale vi, localePrefix "always" (URL là nguồn sự thật), localeCookie nhớ lựa chọn 1 năm (src/i18n/routing.ts).
- ✅ Navigation luôn locale-aware: createNavigation export Link/redirect/useRouter (src/i18n/navigation.ts) và được dùng nhất quán; nav.ts xây nav qua translator nên menu sidebar dịch đúng ba ngôn ngữ.
- ✅ Catalog có parity hoàn hảo: 72/72 leaf key trùng khớp giữa vi/en/zh, không key thiếu hay thừa, giá trị đã dịch thực sự (kiểm chứng bằng diff flatten) — phần catalog tồn tại được bảo trì tốt.
- ✅ Fallback locale an toàn: request.ts dùng hasLocale → defaultLocale, layout.tsx gọi notFound() cho locale không hợp lệ, middleware suy luận locale từ segment đầu một cách phòng thủ.
- ✅ html lang={locale} được set đúng theo từng locale (layout.tsx:39) và generateStaticParams prerender đủ ba locale.
- ✅ formatDate/formatDateTime đã nhận tham số locale và được truyền locale từ các trang (reports, accounts, audit, viewer), nên định dạng NGÀY là locale-aware đúng (dù số/tiền tệ thì chưa).
- ✅ LanguageSwitcher hoàn chỉnh và accessible: dùng useLocale + routing.locales, giữ nguyên path khi đổi locale qua router.replace, có aria-haspopup/listbox/option (src/components/language-switcher.tsx).

---

### 6.6 Product & Business — 52/100 (C)

Tầm nhìn sản phẩm rất rõ và nhất quán: một cổng tài liệu đầu tư tư nhân có kiểm soát truy cập, Vietnamese-first, lấy trình xem PDF bảo mật làm crown-jewel. Các persona (SUPER_ADMIN/EDITOR/APPROVER/CLIENT) được định nghĩa trong schema/seed và luồng cốt lõi "đăng ký → PENDING → duyệt → cấp entitlement → xem PDF có watermark → tải one-time token" được hiện thực thật và hoạt động end-to-end cho dữ liệu seed. Tuy nhiên có một khoảng cách lớn giữa câu chuyện sản phẩm và phần đã triển khai: vòng đời báo cáo (upload, submit, approve, publish) gần như chỉ là placeholder — nút Upload không làm gì, approve/reject chỉ hiện toast không lưu DB, và persona EDITOR thực tế không có bất kỳ năng lực nào (còn bị requireRole khóa khỏi dữ liệu admin). Hoàn toàn không có instrumentation analytics/KPI/conversion funnel; mọi chỉ số trên dashboard và landing đều là số liệu minh họa hardcode.

| Sub-tiêu chí | Điểm | Trạng thái | Ghi chú |
|---|:---:|:---:|---|
| Product vision | 4/5 | strong | Tầm nhìn rõ, nhất quán xuyên README, landing, schema: cổng tài liệu đầu tư gated, bảo mật là trục. Định vị 'kiểm soát đến từng trang' mạch lạc. |
| Business goals | 3/5 | adequate | Mục tiêu kinh doanh ngầm rõ (thay quy trình email rời rạc bằng cổng kiểm toán được). Nhưng không có model doanh thu/pricing nào trong code; CTA chỉ 'liên hệ đội ngũ'. |
| Target users | 4/5 | strong | Đối tượng rõ: quỹ gia sản tư nhân VN + nhà đầu tư được cấp quyền. 4 vai trò định nghĩa tường minh trong Prisma enum và seed. |
| User personas | 2/5 | weak | Persona EDITOR (Phạm Thu Hà) phi chức năng: không có hành động nào dành cho EDITOR và bị requireRole('SUPER_ADMIN','APPROVER') loại khỏi accounts/entitlements/audit. |
| User journeys | 3/5 | adequate | Hành trình client (đăng ký→chờ duyệt→xem/tải) hoàn chỉnh và thật. Hành trình staff sản xuất nội dung (tạo→duyệt→phát hành) thiếu hoàn toàn ở backend. |
| Core user flows | 2/5 | weak | Luồng xem/tải PDF + duyệt tài khoản + cấp entitlement là thật. Nhưng luồng cốt lõi nhất — đưa báo cáo vào hệ thống và phê duyệt — chỉ là UI rỗng (no-op + toast). |
| Feature usage | 1/5 | missing | Không có bất kỳ instrumentation đo lường sử dụng tính năng nào (grep analytics/posthog/segment… = 0). Chỉ có audit log VIEW/DOWNLOAD, không phải analytics sản phẩm. |
| Conversion funnel | 1/5 | missing | Không có theo dõi funnel (landing→register→approve→active). Không có sự kiện/tracking nào; trang register không phát event. Với portal gated, funnel cần analytics — hiện không tồn tại. |
| KPIs | 1/5 | missing | KPI dashboard portal (portal/page.tsx:40-74) và trust band landing (page.tsx:272-277) đều là số liệu hardcode minh họa; comment thừa nhận 'deliberately ILLUSTRATIVE'. Không có KPI thật nào được tính. |
| Product roadmap | 2/5 | weak | Không có tài liệu roadmap/changelog/issue tracking (dự án không có git, không CI). Các gap lớn (upload, lifecycle, i18n trang) chỉ tồn tại ngầm trong handoff, không được lập kế hoạch trong repo. |

**Findings:**

<details><summary><strong>PB-01 · 🔴 CRITICAL — </strong> — Nút 'Tải lên PDF' là no-op — toàn bộ luồng đưa nội dung vào hệ thống chưa tồn tại</summary>

- **Sub-tiêu chí:** Core user flows · **Effort:** L
- **Bằng chứng:** src/app/[locale]/(admin)/admin/reports/page.tsx:93-95 `<Button variant="primary" leadingIcon={<Icon name="upload" .../>}>{tActions("upload")}</Button>` — không có onClick/form/href. Tìm toàn repo: không có route upload, không có createReport/report.create (chỉ watermark.ts:106 `storage.put`). Không có server action nào tạo/đưa báo cáo vào DB.
- **Tác động:** Crown-jewel của sản phẩm là báo cáo PDF, nhưng không có cách nào để EDITOR/admin đưa một báo cáo mới vào hệ thống qua ứng dụng. Mọi báo cáo chỉ tồn tại nhờ prisma/seed.ts. Đây là tính năng cốt lõi bị thiếu, chặn vận hành thực tế.
- **Khuyến nghị:** Hiện thực luồng upload thật: form multipart → server action validate (zod, kích thước, MIME PDF) → storage.put(fileKey) → tạo Report (status DRAFT) + ghi audit REPORT_UPLOAD. Gắn bodySizeLimit phù hợp (hiện next.config = 1mb, quá nhỏ cho PDF).
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>PB-02 · 🔴 CRITICAL — </strong> — Vòng đời báo cáo (approve/reject/publish) không được lưu — chỉ hiện toast</summary>

- **Sub-tiêu chí:** User journeys · **Effort:** M
- **Bằng chứng:** src/app/[locale]/(client)/reports/[slug]/pdf-viewer.tsx:956-963 nút Phê duyệt `onClick={() => { setDialog(null); setToast("approved"); }}` và :980-987 nút Từ chối tương tự — không gọi server action nào. Trong src/server/* không có submitReport/approveReport/publishReport (grep = 0); AuditAction có REPORT_APPROVE/REPORT_PUBLISH nhưng không nơi nào phát ra.
- **Tác động:** Quy trình draft→duyệt→phát hành — điểm bán hàng trung tâm trên landing (page.tsx Workflow) — là giả lập thị giác. APPROVER bấm 'Phê duyệt' nhưng trạng thái DB không đổi, audit không ghi. Vi phạm cam kết 'mỗi quyết định được đóng dấu thời gian và lưu vào nhật ký kiểm toán'.
- **Khuyến nghị:** Thêm server actions submitReport/approveReport/rejectReport/publishReport với requireRole('SUPER_ADMIN','APPROVER'), cập nhật ReportStatus + publishedAt và ghi audit tương ứng; nối vào dialog viewer thay cho setToast.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>PB-03 · 🟠 HIGH — </strong> — Persona EDITOR phi chức năng và bị khóa khỏi dữ liệu admin</summary>

- **Sub-tiêu chí:** User personas · **Effort:** M
- **Bằng chứng:** isStaff (src/lib/rbac.ts:8) cho EDITOR vào /admin (layout.tsx dùng isStaff), nhưng listAccounts/listGroupsWithEntitlements/listAuditLog đều gọi `requireRole("SUPER_ADMIN","APPROVER")` (src/server/admin-data.ts:9,31,63) → ném lỗi cho EDITOR. Không có hành động nào dành riêng EDITOR (grep EDITOR ngoài type chỉ thấy trong STAFF list + chuỗi marketing). Seed tạo editor@blackcrest.vn (seed.ts:21).
- **Tác động:** EDITOR — vai trò mà landing và blueprint mô tả là người 'tải PDF, gắn danh mục' — không làm được gì: vào trang accounts/entitlements/audit sẽ gặp lỗi ném, còn upload thì là no-op (PB-01). Một trong bốn persona cốt lõi không có giá trị sử dụng.
- **Khuyến nghị:** Định nghĩa rõ quyền EDITOR (upload, tạo bản nháp, submit duyệt) và nới requireRole cho các tác vụ nội dung; hoặc bỏ EDITOR khỏi sản phẩm nếu không có phạm vi. Đảm bảo trang admin không ném lỗi với staff role được phép vào.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>PB-04 · 🟠 HIGH — </strong> — Không có instrumentation analytics / feature-usage / conversion funnel</summary>

- **Sub-tiêu chí:** Feature usage · **Effort:** M
- **Bằng chứng:** grep toàn repo cho analytics|gtag|posthog|mixpanel|segment|amplitude|plausible|sentry|vercel/analytics = 0 kết quả (chỉ false-positive 'segments' trong middleware.ts). package.json không có thư viện đo lường nào. register-form.tsx và landing không phát event nào.
- **Tác động:** Không thể đo conversion funnel (landing→register→approve→active), không biết tính năng nào được dùng, không có KPI sản phẩm thực. Với portal gated B2B đây có thể chấp nhận ở MVP nhưng cần nói rõ — hiện không có cả nền tảng tối thiểu để theo dõi tăng trưởng/giữ chân.
- **Khuyến nghị:** Thêm tối thiểu một lớp event server-side (tận dụng audit log đã có) cho các mốc: register submitted, account approved, first login, report viewed, download minted. Cân nhắc một analytics privacy-first (Plausium/Umami self-host) để hợp tinh thần bảo mật.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>PB-06 · 🟠 HIGH — </strong> — Trình xem PDF là mô phỏng thị giác, không render PDF thật của báo cáo</summary>

- **Sub-tiêu chí:** Core user flows · **Effort:** L
- **Bằng chứng:** src/app/[locale]/(client)/reports/[slug]/pdf-viewer.tsx:78 'This is a VISUAL recreation — no real PDF renderer'. 5 trang (Cover/Summary/Performance/Allocation/Notes) là React tĩnh với số liệu quỹ hardcode (vd :292-296, :346-355, :486-492); nội dung không lấy từ tệp PDF thật. Nút 'In' chỉ mở viewUrl ở tab mới (pdf-viewer.tsx:774-783).
- **Tác động:** Người dùng trên màn hình /reports/[slug] thấy báo cáo mẫu giống nhau bất kể báo cáo nào (chỉ tiêu đề/danh mục/tác giả thay đổi), không phải nội dung PDF được cấp quyền. Backend stream PDF watermark là thật nhưng UI viewer không hiển thị nó — crown-jewel UX chưa hoàn thiện.
- **Khuyến nghị:** Tích hợp pdf.js render từ endpoint /api/reports/[id]/view (đã hỗ trợ Range/206) để hiển thị PDF thật có watermark; giữ side-panel metadata/approval. Bỏ các trang nội dung cứng.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>PB-05 · 🟡 MEDIUM</strong> — KPI dashboard và số liệu landing là dữ liệu giả hardcode</summary>

- **Sub-tiêu chí:** KPIs · **Effort:** M
- **Bằng chứng:** src/app/[locale]/(client)/portal/page.tsx:40-74 KPIS (NAV 1.28 tỷ, +8,42% YTD…) với comment :41-42 'deliberately ILLUSTRATIVE figures'. Landing src/app/[locale]/(public)/page.tsx:272-277 Trust stats ['248','12.400+','99,98%','< 180ms'] hardcode. SummaryPage viewer cũng KPI cứng (pdf-viewer.tsx:292-296).
- **Tác động:** Với khách hàng quản lý gia sản, hiển thị KPI tài chính bịa (NAV, lợi nhuận) ngay trên dashboard nhà đầu tư có rủi ro hiểu nhầm nghiêm trọng — nhà đầu tư có thể tưởng đó là số liệu danh mục thật của họ. Số liệu landing cũng là tuyên bố tiếp thị không có cơ sở.
- **Khuyến nghị:** Hoặc tính KPI thật từ dữ liệu (số tài liệu được cấp, lượt xem/tải, mốc phát hành gần nhất qua getPortalSummary), hoặc gắn nhãn rõ 'số liệu minh họa/demo'. Tránh phô số tài chính giả trong bối cảnh wealth.

</details>

<details><summary><strong>PB-07 · 🟡 MEDIUM</strong> — UI cấp trang hardcode tiếng Việt dù message catalog en/zh đã dịch đầy đủ</summary>

- **Sub-tiêu chí:** Target users · **Effort:** L
- **Bằng chứng:** messages/{vi,en,zh}.json đều 92 dòng, đã dịch (en.json có 'Investment documents, controlled to the page'…). Nhưng portal/page.tsx dùng chuỗi cứng 'Chào buổi sáng', nhãn KPI 'Tổng tài sản (NAV)' (:51-74); reports/page.tsx 'Thư viện tài liệu' (:79); toàn bộ admin pages (vd accounts/page.tsx:71 title="Tài khoản", entitlements 'Quyền hiện có'); landing page.tsx hero/features/workflow cứng VI.
- **Tác động:** Tuyên bố đa ngôn ngữ vi/en/zh chỉ đúng một phần: chuyển sang en/zh phần lớn nội dung sản phẩm vẫn hiện tiếng Việt. Hạn chế đối tượng quốc tế và mâu thuẫn với định vị 'đa ngôn ngữ' trong README.
- **Khuyến nghị:** Chuyển các chuỗi UI cấp trang sang next-intl t() (đã có hạ tầng và catalog). Ưu tiên portal, reports, admin, viewer — những bề mặt người dùng thật sự thấy.

</details>

<details><summary><strong>PB-08 · ⚪ LOW</strong> — Không có roadmap/changelog/issue-tracking trong repo cho các gap đã biết</summary>

- **Sub-tiêu chí:** Product roadmap · **Effort:** S
- **Bằng chứng:** Không git, không .github, không CI (ground truth). Không có ROADMAP.md/CHANGELOG.md/TODO. README (đã đọc toàn bộ) mô tả tính năng như đã-hiện-thực ('§6 đã hiện thực') mà không liệt kê các phần placeholder (upload, lifecycle, i18n trang), tạo lệch kỳ vọng.
- **Tác động:** Stakeholder đọc README sẽ tin sản phẩm hoàn chỉnh hơn thực tế; các gap then chốt không được ưu tiên/lập kế hoạch minh bạch, rủi ro cho lập kế hoạch phát hành cho khách hàng tổ chức.
- **Khuyến nghị:** Thêm mục 'Trạng thái & lộ trình' trong README liệt kê rõ phần đã xong vs placeholder (upload, report lifecycle, viewer thật, i18n trang, analytics) với mức ưu tiên; cân nhắc đưa repo vào git + issue tracker.

</details>

**Điểm mạnh:**

- ✅ Tầm nhìn sản phẩm rõ ràng và nhất quán xuyên suốt README, landing page và schema: cổng tài liệu đầu tư tư nhân VN có kiểm soát truy cập, bảo mật là trục thiết kế — định vị 'kiểm soát đến từng trang' mạch lạc, dễ hiểu.
- ✅ Luồng cốt lõi xem & tải PDF được hiện thực thật và hoàn chỉnh ở backend: kiểm tra auth + entitlement trên mọi request (api/reports/[id]/view/route.ts:30-44), watermark theo user, hỗ trợ Range/206, audit log lượt xem, và download bằng token một lần ngắn hạn (download-actions.ts) — đúng tinh thần security-first.
- ✅ Luồng đăng ký → PENDING → duyệt tài khoản và luồng cấp/thu hồi entitlement là thật và được lưu DB + ghi audit (auth-actions.ts:74-83 tạo PENDING; accounts.ts & entitlements.ts với requireRole), khớp với câu chuyện 'duyệt thủ công bởi đội ngũ Blackcrest'.
- ✅ Personas và phân tách dữ liệu được mô hình hóa tốt trong seed (2 nhóm khách hàng độc lập với entitlement khác nhau để kiểm thử cô lập cross-group §6.14), tạo nền tảng tốt cho kịch bản đa khách hàng.
- ✅ Câu chuyện sản phẩm trên landing (Workflow draft→duyệt→phát hành, Features bảo mật theo vai trò) được trình bày chuyên nghiệp, đúng đối tượng quỹ gia sản, củng cố định vị thương hiệu institutional.

---

### 6.7 SEO — 52/100 (C)

Blackcrest xử lý đúng phần khó nhất của một cổng riêng tư: mặc định toàn site là robots noindex/nofollow ở root layout (layout.tsx:17), các route auth (login/register, portal, admin) đều bị loại khỏi index — built HTML xác nhận login trả về `noindex, nofollow`. Landing marketing được prerender tĩnh (SSG) đúng chuẩn cho SEO. Tuy nhiên phần SEO "công khai" lại sơ sài nghiêm trọng: KHÔNG có hreflang/alternate dù routing.ts tự nhận "clean hreflang/SEO", KHÔNG có Open Graph/Twitter card, KHÔNG structured data, KHÔNG canonical, KHÔNG metadataBase, KHÔNG robots.ts/sitemap.ts/manifest, KHÔNG favicon. Nghiêm trọng nhất: ba locale vi/en/zh đều phục vụ nội dung tiếng Việt y hệt nhau và cùng được set `index, follow` → trùng lặp nội dung 3 lần và index sai ngôn ngữ.

| Sub-tiêu chí | Điểm | Trạng thái | Ghi chú |
|---|:---:|:---:|---|
| Metadata | 3/5 | adequate | Có title template, description, viewport, charset, lang đúng theo locale (built HTML: <html lang="vi">). Nhưng thiếu canonical và metadataBase; en/zh dùng metadata tiếng Việt hardcode. |
| Structured data | 0/5 | missing | Không có bất kỳ JSON-LD nào (grep application/ld+json trên built HTML = NONE). Thiếu Organization/WebSite schema cho thương hiệu wealth. |
| Sitemap | 0/5 | missing | Không có sitemap.ts/sitemap.xml. Crawler không có map các URL công khai cần index (vi/en/zh, login). |
| Robots | 3/5 | adequate | Mặc định noindex toàn site (layout.tsx:17) bảo vệ route riêng tư rất tốt; landing override index đúng. Nhưng KHÔNG có robots.ts/robots.txt nên không có file chỉ thị + không trỏ tới sitemap. |
| Open Graph | 0/5 | missing | Không có openGraph hay opengraph-image; built HTML không có thẻ og: nào. Chia sẻ link landing sẽ không có preview — kém cho thương hiệu cao cấp. |
| SSR/SSG | 5/5 | strong | Landing + login + register prerender tĩnh (prerender-manifest xác nhận); route auth dùng force-dynamic, không prerender/cache. Chiến lược render chính xác cho gated portal. |
| Crawlability | 3/5 | adequate | Route riêng tư chặn index qua meta robots (đúng). Nhưng thiếu sitemap + robots.txt làm việc khám phá URL công khai phụ thuộc hoàn toàn vào crawl thô. |
| Indexability | 2/5 | weak | en/zh phục vụ nội dung VI y hệt nhau và đều index → trùng lặp nội dung 3x, index sai ngôn ngữ, không hreflang để gom nhóm. Login/portal/admin noindex đúng. |

**Findings:**

<details><summary><strong>SEO-01 · 🟠 HIGH — </strong> — Ba locale vi/en/zh phục vụ nội dung tiếng Việt y hệt nhau nhưng đều được index — trùng lặp nội dung và index sai ngôn ngữ</summary>

- **Sub-tiêu chí:** Indexability · **Effort:** M
- **Bằng chứng:** page.tsx:15 đặt `robots: { index: true, follow: true }` cho cả 3 locale. Built HTML xác nhận /en và /zh có title + H1 BYTE-FOR-BYTE tiếng Việt: `.next/server/app/en.html` và `zh.html` đều có `<title>Tài liệu đầu tư, được kiểm soát đến từng trang · Blackcrest</title>` và `<h1 ...>Tài liệu đầu tư, được kiểm soát đến từng trang`. Toàn bộ string trong page.tsx (Hero, Features, Workflow...) là tiếng Việt hardcode (vd page.tsx:139, 143-144), không dùng t() cho nội dung body.
- **Tác động:** Google thấy 3 URL (/vi, /en, /zh) với nội dung tiếng Việt giống hệt → bị coi là trùng lặp, làm loãng ranking signal và có thể chọn nhầm URL canonical. /en và /zh sẽ index như trang tiếng Việt, gây trải nghiệm sai cho người dùng tìm bằng tiếng Anh/Trung — phản tác dụng với định vị 'Vietnamese-first' đa ngôn ngữ.
- **Khuyến nghị:** Trước mắt: chỉ set `index: true` cho locale vi và noindex /en, /zh cho tới khi nội dung được dịch thật (dùng generateMetadata theo locale). Dài hạn: localize nội dung landing (chuyển string body sang messages/{en,zh}.json) rồi mở index kèm hreflang (SEO-02).
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>SEO-02 · 🟠 HIGH — </strong> — Thiếu hoàn toàn hreflang/alternate dù routing tự nhận 'clean hreflang/SEO'</summary>

- **Sub-tiêu chí:** Metadata · **Effort:** M
- **Bằng chứng:** routing.ts:6 ghi chú `localePrefix: "always" → clean hreflang/SEO`, nhưng KHÔNG có `alternates` trong bất kỳ metadata export nào (grep alternates/hreflang trên src = chỉ trúng comment). Built HTML xác nhận: `grep rel="alternate"|canonical` trên .next/server/app/*.html = NONE. Không có metadataBase (grep metadataBase = NONE) nên Next cũng không thể tự sinh alternate URL tuyệt đối.
- **Tác động:** Không có thẻ <link rel="alternate" hreflang> để gom 3 phiên bản locale thành một cụm → công cụ tìm kiếm không hiểu quan hệ vi/en/zh, làm trầm trọng thêm vấn đề trùng lặp ở SEO-01 và không phục vụ đúng phiên bản ngôn ngữ cho người dùng từng vùng.
- **Khuyến nghị:** Thêm `metadataBase` (từ env như NEXT_PUBLIC_SITE_URL) vào root layout, và dùng `generateMetadata` trả `alternates: { canonical, languages: { vi, en, zh } }` cho các trang công khai. next-intl có helper để sinh alternate theo locale.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>SEO-03 · 🟡 MEDIUM</strong> — Không có Open Graph / Twitter card / opengraph-image trên landing công khai</summary>

- **Sub-tiêu chí:** Open Graph · **Effort:** M
- **Bằng chứng:** page.tsx:11-16 metadata chỉ có title/description/robots — không có `openGraph` hay `twitter`. Built HTML xác nhận: grep og:/twitter: trên vi.html = không có thẻ nào. Không có file opengraph-image (find trên src/app + public = NONE); public/ chỉ có fonts/ rỗng và logos/ (4 SVG).
- **Tác động:** Khi chia sẻ link blackcrest.app lên LinkedIn/Slack/Zalo/WhatsApp sẽ không có tiêu đề, mô tả hay ảnh preview — chỉ hiện URL trần. Với cổng wealth cao cấp, thiếu preview chuyên nghiệp làm giảm uy tín và tỉ lệ click khi đối tác/nhà đầu tư chia sẻ.
- **Khuyến nghị:** Thêm `openGraph` (title, description, url, siteName, locale, images) và `twitter: { card: 'summary_large_image' }` vào metadata landing; tạo `opengraph-image.tsx` (hoặc PNG tĩnh) theo phong cách monochrome B&W. Cần metadataBase để URL ảnh tuyệt đối.

</details>

<details><summary><strong>SEO-04 · 🟡 MEDIUM</strong> — Không có robots.ts/robots.txt và sitemap.ts</summary>

- **Sub-tiêu chí:** Robots · **Effort:** S
- **Bằng chứng:** find trong src/app cho robots.*/sitemap.*/manifest.* = NONE. Không có public/robots.txt. Việc chặn index hiện chỉ dựa vào meta robots ở từng trang (layout.tsx:17 mặc định noindex), không có file robots.txt cấp domain để khai báo Disallow hay trỏ tới sitemap.
- **Tác động:** Crawler không có chỉ thị cấp site và không có sitemap để khám phá URL công khai (chỉ /vi cần index). Với gated portal, robots.txt nên Disallow rõ ràng các đường dẫn /portal, /admin, /api để giảm crawl budget lãng phí và rủi ro lộ cấu trúc URL nội bộ (dù meta robots đã chặn index).
- **Khuyến nghị:** Thêm `src/app/robots.ts` với Disallow cho /portal, /admin, /api và trỏ host tới sitemap; thêm `src/app/sitemap.ts` liệt kê các URL công khai có index (vi và, sau khi localize, en/zh kèm alternates).

</details>

<details><summary><strong>SEO-05 · ⚪ LOW</strong> — Không có structured data (JSON-LD Organization/WebSite)</summary>

- **Sub-tiêu chí:** Structured data · **Effort:** S
- **Bằng chứng:** grep `application/ld+json` trên toàn bộ built HTML (.next/server/app/*.html) = NONE. Không có component JsonLd trong src (grep jsonld/JsonLd = không trúng).
- **Tác động:** Mất cơ hội rich result / knowledge panel cho thương hiệu Blackcrest Wealth (logo, tên tổ chức, sameAs). Không nghiêm trọng vì đây là cổng riêng tư, nhưng là điểm trừ về độ hoàn thiện cho landing marketing thương hiệu cao cấp.
- **Khuyến nghị:** Thêm JSON-LD Organization (name, url, logo từ public/logos, sameAs) và WebSite vào landing công khai qua thẻ <script type="application/ld+json"> trong RSC.

</details>

<details><summary><strong>SEO-06 · ⚪ LOW</strong> — Thiếu favicon / apple-touch-icon / web manifest</summary>

- **Sub-tiêu chí:** Metadata · **Effort:** S
- **Bằng chứng:** Built HTML vi.html: grep `<link rel="icon|apple-touch-icon|manifest">` = NONE. find favicon.*/icon.*/apple-icon.*/manifest.* trong src/app + public = NONE. public/ chỉ có logos/ (SVG) và fonts/ (rỗng).
- **Tác động:** Không có icon trên tab trình duyệt, bookmark, kết quả tìm kiếm hay khi thêm vào màn hình chính — kém chỉn chu cho thương hiệu institutional. Một số crawler/social cũng dùng favicon làm fallback hình ảnh.
- **Khuyến nghị:** Thêm `src/app/icon.svg`/`favicon.ico` và `apple-icon.png` (Next tự sinh link), tận dụng public/logos/logo-mark.svg sẵn có. Cân nhắc manifest.ts nếu muốn PWA/installable.

</details>

<details><summary><strong>SEO-07 · ⚪ LOW</strong> — Thiếu canonical URL trên trang công khai</summary>

- **Sub-tiêu chí:** Metadata · **Effort:** S
- **Bằng chứng:** page.tsx:11-16 không khai báo `alternates.canonical`; không có metadataBase (grep = NONE). Built HTML: grep `rel="canonical"` = NONE.
- **Tác động:** Không có canonical tự khai báo → tăng rủi ro Google chọn nhầm URL đại diện khi có biến thể (query string, trailing slash) hoặc trùng lặp giữa các locale (SEO-01). Tác động giảm bớt vì site nhỏ, nhưng nên có để chuẩn hoá.
- **Khuyến nghị:** Khi thêm metadataBase, set `alternates.canonical` per-route qua generateMetadata để chỉ định URL đại diện rõ ràng (thường là bản /vi cho nội dung tiếng Việt hiện tại).

</details>

**Điểm mạnh:**

- ✅ Bảo vệ index cho route riêng tư đúng triết lý gated portal: root layout đặt mặc định `robots: { index: false, follow: false }` (layout.tsx:17) nên mọi route auth thừa kế noindex/nofollow — built HTML xác nhận /vi/login trả `noindex, nofollow`.
- ✅ Chiến lược render chuẩn xác: landing + login + register được prerender tĩnh (SSG, xác nhận trong prerender-manifest), còn các route nhạy cảm (portal, admin) dùng `export const dynamic = "force-dynamic"` ((client)/layout.tsx:5, (admin)/layout.tsx:6) nên không bao giờ bị prerender/cache — vừa nhanh vừa an toàn.
- ✅ Landing marketing chủ động override để index (page.tsx:15) — đúng ý đồ: chỉ bề mặt marketing công khai mới được crawl, phần còn lại bị loại.
- ✅ Có nền tảng metadata cơ bản tốt: title template `%s · Blackcrest` (layout.tsx:13), description rõ ràng, `<html lang={locale}>` set đúng ngôn ngữ theo locale (layout.tsx:39), charset utf-8 và viewport responsive đều có trong built HTML.
- ✅ localePrefix: 'always' (routing.ts:11) tạo URL sạch, ổn định theo locale — nền tảng tốt để bổ sung hreflang/alternate về sau.

---

### 6.8 Infrastructure — 52/100 (C)

Bộ khung hạ tầng có nền tảng tốt hơn mức trung bình cho một MVP: Dockerfile multi-stage chạy non-root, Postgres bind 127.0.0.1, nginx có rate-limit và TLS 1.2/1.3, backup.sh theo mô hình 3-2-1. Tuy nhiên với một cổng tài liệu private-wealth, còn nhiều khoảng trống chặn launch: secret thật bị commit vào working tree (.env), nginx thiếu HSTS/ciphers/OCSP/ssl_session/CSP, prod compose mount thư mục certbot không tồn tại (nginx không khởi động được lần đầu) và migrate deploy nuốt lỗi, container không có HEALTHCHECK/resource-limit/cap_drop, backup không mã hóa (PII rời lãnh thổ ở dạng plaintext), và lớp storage chỉ có filesystem trong khi watermark cache phình vô hạn cùng volume. Đánh giá tổng thể: chưa production-ready cho định chế.

| Sub-tiêu chí | Điểm | Trạng thái | Ghi chú |
|---|:---:|:---:|---|
| Hosting | 3/5 | adequate | Single VN VPS theo blueprint (docker-compose.prod.yml dòng 1). Hợp lý cho MVP nhưng SPOF, không HA, không tài liệu sizing/region. |
| CDN | 1/5 | missing | Không có CDN. Static asset (.next/static, fonts) phục vụ trực tiếp từ nginx→Next, không có edge POP. Chấp nhận được vì PDF phải authed, nhưng asset công khai nên qua CDN. |
| Edge caching | 2/5 | weak | Không cấu hình cache nginx cho static; PDF đúng là private no-store (view/route.ts:59). Thiếu cache_control/expires cho /_next/static gây lãng phí băng thông. |
| Environment configuration | 1/5 | weak | Secret PRODUCTION-shaped thật nằm trong .env ở working tree (AUTH_SECRET, DOWNLOAD_TOKEN_SECRET). Prod compose dùng ${VAR:?} đúng cách nhưng không có secret manager. |
| Deployment architecture | 3/5 | adequate | nginx→web standalone→Postgres rõ ràng; blue/green chỉ là comment chưa hiện thực. migrate deploy || true che lỗi migration (prod compose:43). |
| DNS | 2/5 | weak | server_name _ (catch-all) ở cả 80/443; không khớp SNI/host cụ thể, không tài liệu DNS/zone. Không có evidence quản lý DNS. |
| SSL/TLS | 2/5 | weak | Có TLSv1.2/1.3 + prefer_server_ciphers (blackcrest.conf:36-37) nhưng THIẾU ssl_ciphers, ssl_dhparam, HSTS, OCSP stapling, ssl_session_cache. Cert certbot chưa được provision (thư mục không tồn tại). |
| Reverse proxy | 3/5 | adequate | proxy_params hợp lý, rate-limit auth/api, proxy_buffering off cho stream PDF + Range hoạt động. Thiếu gzip, X-Forwarded-Proto tin cậy không khóa, không CSP/Permissions-Policy. |
| Backups | 2/5 | weak | backup.sh có pg_dump -Fc + tar + rclone offsite (3-2-1), nhưng KHÔNG mã hóa backup (PII plaintext rời lãnh thổ), --max-age dùng sai làm retention, không có restore test tự động, DB_CONTAINER hardcode có thể lệch tên. |
| Container hardening | 3/5 | adequate | Multi-stage, non-root nextjs, libc6-compat/openssl (Dockerfile:24,35). Nhưng base image dùng tag trôi node:22-alpine (không pin digest), KHÔNG HEALTHCHECK, không cap_drop/read_only/no-new-privileges/resource limits, không apk upgrade. |

**Findings:**

<details><summary><strong>INFRA-01 · 🟠 HIGH — </strong> — Secret production-shaped thật bị ghi vào working tree (.env)</summary>

- **Sub-tiêu chí:** Environment configuration · **Effort:** S
- **Bằng chứng:** .env dòng 3 & 7 chứa secret 32-byte base64 thật: AUTH_SECRET="rHwjSOI5mClTJehpuQhJbx8uY460VZUjVW1iibNkV3w=" và DOWNLOAD_TOKEN_SECRET="QxYt0//76LfTcvibV+OAh4X4nM8ij1iMZLmaoeiAgKs=". Header dòng 1: "Local development environment — generated 2026-06-17".
- **Tác động:** Hai secret này ký JWT session NextAuth và download token một-lần. Nếu chúng bị tái dùng ở prod (rất dễ vì .env được bàn giao sẵn) thì bất kỳ ai có file này có thể forge session bất kỳ user/role nào và giả mạo download token, phá vỡ toàn bộ entitlement isolation của cổng wealth. .env nằm trong working tree được bàn giao là kênh rò rỉ thực tế (gitignored không cứu được vì repo không dùng git).
- **Khuyến nghị:** Sinh secret riêng cho từng môi trường lúc deploy (không bao giờ tái dùng dev secret ở prod). Quản lý qua secret manager hoặc docker secret/biến môi trường runtime, không ghi vào file trong repo. Xoay (rotate) ngay AUTH_SECRET và DOWNLOAD_TOKEN_SECRET trước khi go-live và xóa .env khỏi mọi bàn giao.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>INFRA-02 · 🟠 HIGH — </strong> — nginx prod mount thư mục certbot không tồn tại → cold-start thất bại + chứng chỉ chưa được cấp</summary>

- **Sub-tiêu chí:** SSL/TLS · **Effort:** M
- **Bằng chứng:** docker-compose.prod.yml:57-58 mount "./nginx/certbot/www" và "./nginx/certbot/conf". Thực tế `find nginx -type d` chỉ trả về thư mục nginx (không có nginx/certbot). blackcrest.conf:34-35 trỏ ssl_certificate /etc/letsencrypt/live/blackcrest/fullchain.pem — file này chưa tồn tại.
- **Tác động:** Khi `docker compose -f docker-compose.prod.yml up`, server block 443 tham chiếu cert chưa có; nginx sẽ fail to start (emerg: cannot load certificate) hoặc bootstrap-loop. Không có quy trình bootstrap cert (chicken-and-egg: nginx phục vụ ACME challenge nhưng 443 không lên được). Cổng không thể phục vụ HTTPS ngay từ lần triển khai đầu — blocker launch.
- **Khuyến nghị:** Thêm bước bootstrap: tạo nginx/certbot/{www,conf}, dùng self-signed tạm cho 443 hoặc một stage HTTP-only để chạy certbot certonly --webroot lần đầu, rồi mới mount cert thật. Tài liệu hóa quy trình renew (certbot renew + nginx -s reload). Cân nhắc service certbot trong compose với deploy hook reload nginx.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>INFRA-03 · 🟠 HIGH — </strong> — Thiếu HSTS, ssl_ciphers, ssl_dhparam, OCSP stapling và ssl_session_cache</summary>

- **Sub-tiêu chí:** SSL/TLS · **Effort:** M
- **Bằng chứng:** blackcrest.conf:36-37 chỉ có `ssl_protocols TLSv1.2 TLSv1.3; ssl_prefer_server_ciphers on;`. `grep -ni 'gzip|strict-transport|ocsp|ssl_session|ssl_ciphers|ssl_dhparam|content-security'` trả về NONE. Security headers (dòng 43-45) chỉ có X-Content-Type-Options, X-Frame-Options, Referrer-Policy.
- **Tác động:** Không HSTS → cổng wealth dễ bị SSL-strip/downgrade (HTTP→HTTPS redirect dòng 24 có thể bị MITM ở request đầu). prefer_server_ciphers on nhưng không khai báo ssl_ciphers nghĩa là phụ thuộc default OpenSSL, có thể cho phép cipher yếu trên TLSv1.2. Không ssl_session_cache làm tăng full-handshake (latency + CPU). Thiếu CSP cho một viewer PDF authenticated là gap phòng thủ XSS.
- **Khuyến nghị:** Thêm `add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;` (chỉ trên block 443), khai báo ssl_ciphers theo Mozilla intermediate, ssl_dhparam, ssl_session_cache shared:SSL:10m + ssl_session_timeout, bật OCSP stapling, và bổ sung Content-Security-Policy + Permissions-Policy phù hợp với pdf.js.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>INFRA-04 · 🟠 HIGH — </strong> — Backup không mã hóa — PII định chế plaintext rời lãnh thổ qua rclone</summary>

- **Sub-tiêu chí:** Backups · **Effort:** M
- **Bằng chứng:** backup.sh:20 `pg_dump ... -Fc > db-$STAMP.dump` (không mã hóa), :24 `tar ... -czf storage-$STAMP.tar.gz` (PDF báo cáo + watermark cache, không mã hóa), :28 `rclone sync "$BACKUP_DIR" "$RCLONE_REMOTE"` đẩy lên provider offsite mà không có lớp mã hóa client-side.
- **Tác động:** Dump DB chứa user/email/argon2 hash + toàn bộ entitlement; tar storage chứa tài liệu đầu tư riêng tư của khách hàng giàu có. Đẩy plaintext lên kho offsite (bên thứ ba) là rủi ro lộ dữ liệu nghiêm trọng nếu credential rclone hoặc bucket bị lộ. Với cổng private-wealth đây là rủi ro tuân thủ/danh tiếng cao.
- **Khuyến nghị:** Mã hóa backup trước khi rời máy: dùng rclone crypt remote hoặc gpg --encrypt (age/gpg) cho cả db dump và tar. Lưu key tách biệt khỏi backup. Đặt quyền 600 cho file backup, và kiểm soát truy cập bucket offsite (immutable/object-lock chống ransomware).
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>INFRA-05 · 🟠 HIGH — </strong> — migrate deploy || true nuốt lỗi migration ở prod</summary>

- **Sub-tiêu chí:** Deployment architecture · **Effort:** S
- **Bằng chứng:** docker-compose.prod.yml:43 `command: sh -c "node node_modules/prisma/build/index.js migrate deploy || true; node server.js"`.
- **Tác động:** `|| true` khiến container web vẫn start dù migration thất bại. App sẽ chạy trên schema cũ/không nhất quán → lỗi runtime khó chẩn đoán, hoặc tệ hơn là ghi dữ liệu lên schema sai. Với dữ liệu tài chính, một migration nửa-vời âm thầm là nguy cơ toàn vẹn dữ liệu. Healthcheck /api/health chỉ kiểm tra SELECT 1 nên không phát hiện schema lệch.
- **Khuyến nghị:** Bỏ `|| true`. Chạy migrate deploy như một init job riêng (one-shot service) phải thành công trước khi web start; nếu fail thì fail-fast và chặn rollout. Trong mô hình blue/green, migration phải backward-compatible và chạy ngoài vòng đời container app.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>INFRA-06 · 🟡 MEDIUM</strong> — Container thiếu HEALTHCHECK, resource limits và hardening flags</summary>

- **Sub-tiêu chí:** Container hardening · **Effort:** M
- **Bằng chứng:** `grep HEALTHCHECK Dockerfile` = NONE. `grep cap_drop|read_only|security_opt|mem_limit|cpus|no-new-privileges|deploy:` trên cả hai compose = NONE FOUND. web service trong prod compose (dòng 26-45) không có healthcheck riêng.
- **Tác động:** Không HEALTHCHECK ở image → orchestrator/compose không biết web liveness (blue/green flip dựa vào /api/health phải làm thủ công). Không mem/cpu limit → một container PDF watermarking (pdf-lib nặng CPU/RAM) có thể làm cạn tài nguyên VPS, kéo sập cả DB và nginx (noisy-neighbor trên single host). Thiếu no-new-privileges/cap_drop/read_only giảm khả năng chống leo thang đặc quyền.
- **Khuyến nghị:** Thêm HEALTHCHECK CMD curl -f http://localhost:3000/api/health trong Dockerfile và/hoặc healthcheck cho web service. Đặt deploy.resources.limits (mem/cpu) cho web và db. Thêm security_opt: [no-new-privileges:true], cap_drop: [ALL], và cân nhắc read_only: true với tmpfs cho /tmp.

</details>

<details><summary><strong>INFRA-07 · 🟡 MEDIUM</strong> — Base image dùng tag trôi node:22-alpine, không pin digest, không apk upgrade</summary>

- **Sub-tiêu chí:** Container hardening · **Effort:** S
- **Bằng chứng:** Dockerfile:2 `FROM node:22-alpine AS base`. `grep @sha256` không có kết quả. Không có dòng `apk upgrade` sau `apk add`.
- **Tác động:** Build không tái lập (reproducible) — cùng Dockerfile build hai thời điểm cho image khác nhau, khó truy vết khi sự cố. Tag trôi cũng có thể kéo về layer chứa CVE mới mà không kiểm soát. Không git/CI nên không có scan image (trivy/grype) nào chặn lỗ hổng.
- **Khuyến nghị:** Pin base image theo digest (node:22-alpine@sha256:...) và cập nhật có chủ đích. Thêm `apk upgrade --no-cache` cho package OS. Bổ sung bước quét image (trivy) vào quy trình build thủ công trước khi push.

</details>

<details><summary><strong>INFRA-08 · 🟡 MEDIUM</strong> — Storage chỉ có filesystem; S3/SeaweedFS được quảng cáo nhưng chưa hiện thực, watermark cache phình vô hạn cùng volume</summary>

- **Sub-tiêu chí:** Hosting · **Effort:** L
- **Bằng chứng:** storage.ts:59-61 `getStorage()` luôn trả filesystemAdapter với comment "Only the filesystem driver is implemented in the MVP." Nhưng .env.example:12-13 và docker-compose.prod.yml:37 vẫn để STORAGE_DRIVER (gợi ý có lựa chọn s3). watermark.ts:30 ghi cache `cache/wm/${reportId}/${userHash}.pdf` qua storage.put (dòng 106) vào CÙNG volume, không có TTL/eviction.
- **Tác động:** Toàn bộ độ bền tài liệu phụ thuộc một volume Docker trên một VPS — không object-storage replication. Watermark cache tạo một file PDF MỚI cho mỗi cặp (report × user) và không bao giờ dọn → volume phình tuyến tính theo số khách × số báo cáo, có thể lấp đầy đĩa và làm hỏng cả Postgres (cùng host). Khi đĩa đầy, write watermark và pg_dump đều fail.
- **Khuyến nghị:** Hoặc hiện thực driver S3/SeaweedFS (như interface đã hứa) cho độ bền/replication, hoặc tài liệu hóa rõ rằng filesystem là vĩnh viễn và thêm giám sát dung lượng. Thêm cơ chế eviction/TTL cho cache/wm (cron dọn theo mtime) và/hoặc tách cache khỏi volume nguồn. Giám sát disk usage với cảnh báo.

</details>

<details><summary><strong>INFRA-09 · 🟡 MEDIUM</strong> — Mật khẩu Postgres hardcode trong compose dev và dùng lại tên DB/credential yếu</summary>

- **Sub-tiêu chí:** Environment configuration · **Effort:** S
- **Bằng chứng:** docker-compose.yml:12-13 `POSTGRES_USER: blackcrest / POSTGRES_PASSWORD: blackcrest`. .env.example:3 và .env:2 dùng cùng credential blackcrest:blackcrest. Prod compose dùng ${POSTGRES_PASSWORD:?} (tốt) nhưng DATABASE_URL nội suy lại password vào connection string (dòng 33).
- **Tác động:** Credential dev cực yếu (user=password=blackcrest). Dù DB bind 127.0.0.1, bất kỳ process nào trên host hoặc container cùng mạng Docker đều đăng nhập được. Rủi ro cao nếu lập trình viên vô tình deploy cấu hình dev hoặc tái dùng password này. Connection string với password inline cũng dễ rò qua logs/ps.
- **Khuyến nghị:** Không dùng credential trùng tên ở bất kỳ đâu, kể cả dev. Ở prod, cân nhắc dùng .pgpass hoặc docker secret thay vì nội suy password vào DATABASE_URL. Bật scram-sha-256 (mặc định PG17) và giới hạn pg_hba phù hợp.

</details>

<details><summary><strong>INFRA-10 · ⚪ LOW</strong> — nginx thiếu gzip và caching cho static asset</summary>

- **Sub-tiêu chí:** Edge caching · **Effort:** S
- **Bằng chứng:** blackcrest.conf không có directive gzip nào (grep gzip = NONE) và không có location riêng cho /_next/static với expires/Cache-Control immutable. location / (dòng 60-63) proxy tất cả về Next không qua lớp cache nào.
- **Tác động:** Mọi HTML/JS/CSS/JSON i18n truyền không nén → tốn băng thông và chậm hơn ở mạng VN. Static asset bất biến của Next (/_next/static với hash) lẽ ra cache 1 năm nhưng đang đi thẳng vào app server mỗi lần, lãng phí tài nguyên.
- **Khuyến nghị:** Bật gzip (hoặc brotli) cho text/css/js/json/svg với gzip_types phù hợp. Thêm location ^~ /_next/static/ với `expires 1y; add_header Cache-Control "public, immutable";`. Cân nhắc proxy_cache cho asset công khai.

</details>

<details><summary><strong>INFRA-11 · ⚪ LOW</strong> — Restore chưa được tự động hóa/kiểm chứng; retention dựa rclone --max-age sai mục đích</summary>

- **Sub-tiêu chí:** Backups · **Effort:** M
- **Bằng chứng:** backup.sh:7 ghi comment "A backup you have never restored is not a backup — test-restore monthly" nhưng không có script restore/verify nào trong scripts/. Dòng 28 `rclone sync ... --max-age "${RETENTION_DAYS}d"` dùng --max-age (lọc theo tuổi file nguồn để sync) chứ không phải cơ chế retention thực sự ở remote.
- **Tác động:** Không có bằng chứng restore từng được kiểm thử; backup chưa-test là rủi ro DR thực tế. --max-age chỉ bỏ qua file nguồn cũ hơn ngưỡng khi sync — nó không xóa bản cũ ở offsite theo retention, dẫn tới hiểu nhầm về vòng đời backup offsite.
- **Khuyến nghị:** Viết scripts/restore.sh và một job restore-verify hàng tháng (khôi phục dump vào DB tạm + kiểm tra row count) như comment đã yêu cầu. Quản lý retention offsite bằng lifecycle policy của bucket hoặc rclone với cờ phù hợp, tách bạch khỏi --max-age.

</details>

<details><summary><strong>INFRA-12 · ⚪ LOW</strong> — Mismatch giới hạn kích thước upload giữa nginx (12m) và Next serverActions (1mb)</summary>

- **Sub-tiêu chí:** Reverse proxy · **Effort:** S
- **Bằng chứng:** blackcrest.conf:40 `client_max_body_size 12m;` (cho upload PDF). next.config.ts:14-16 `serverActions: { bodySizeLimit: "1mb" }`. Upload flow hiện là placeholder theo handoff.
- **Tác động:** Cấu hình mâu thuẫn: nginx cho qua tới 12MB nhưng nếu upload đi qua Server Action sẽ bị chặn ở 1MB. Khi flow upload thật được hiện thực, đây sẽ là nguồn lỗi 413/runtime gây nhầm lẫn. Hiện chưa khai thác được vì upload chưa hoạt động.
- **Khuyến nghị:** Thống nhất chiến lược upload: nếu PDF upload qua Route Handler streaming (không qua Server Action) thì 1mb của serverActions là đúng — cần tài liệu hóa rõ. Đảm bảo client_max_body_size khớp giới hạn thực của endpoint upload khi triển khai.

</details>

**Điểm mạnh:**

- ✅ Dockerfile multi-stage gọn (deps → builder → runner) với output standalone, chạy bằng user non-root nextjs (adduser -S, USER nextjs — Dockerfile:24,35) và copy --chown đúng cho .next/standalone.
- ✅ Postgres được bind 127.0.0.1:5432 ở cả dev và prod compose với comment giải thích Docker bypass UFW — chống lộ DB ra 0.0.0.0 đúng nguyên tắc hardening.
- ✅ nginx có rate-limit phân tách: zone auth 5r/m cho /api/auth (chống brute-force) và zone api 60r/m cho view/download (chống scrape PDF), kèm burst hợp lý (blackcrest.conf:5-7,48,54).
- ✅ Stream PDF đúng kỹ thuật: proxy_buffering off cho endpoint view/download (blackcrest.conf:57) + hỗ trợ Range/206 trong view/route.ts (dòng 72-92) cho pdf.js, và header Cache-Control: private, no-store để không cache tài liệu nhạy cảm.
- ✅ Healthcheck Postgres bằng pg_isready với depends_on condition: service_healthy (prod compose:20-24,29-31) đảm bảo web chỉ start khi DB sẵn sàng; /api/health kiểm tra SELECT 1 phục vụ blue/green.
- ✅ Backup theo tinh thần 3-2-1: pg_dump custom-format + tar storage + đẩy offsite qua rclone tới provider trong lãnh thổ VN (data localization), set -euo pipefail và có retention dọn file cục bộ.
- ✅ TLS chỉ bật TLSv1.2/1.3 (không có giao thức cũ) và có redirect HTTP→HTTPS 301 cùng location ACME challenge cho certbot, HTTP/2 được bật trên 443.
- ✅ .dockerignore và .gitignore loại trừ đúng các mục nhạy cảm/nặng (.env, storage/, *.pem, node_modules, .next) khỏi image build và khỏi việc commit.

---

### 6.9 Accessibility (A11y) — 58/100 (C)

Codebase có nền tảng a11y khá tốt ở lớp form (native input/select/checkbox/switch luôn dùng phần tử gốc + label htmlFor, IconButton bắt buộc aria-label, có focus-visible ring đậm cho link/button), nhưng các custom widget tương tác lại thiếu hợp đồng ARIA và keyboard chuẩn: Dialog không có focus trap/focus restore/aria-labelledby, Tabs thiếu role tablist/tab và điều hướng phím mũi tên, LanguageSwitcher dùng role=listbox nhưng không hỗ trợ phím mũi tên, Tooltip không đóng được bằng Esc và không liên kết aria-describedby. Vấn đề nghiêm trọng nhất cho một portal đọc tài liệu là color contrast: token ink-4 (#9aa0a8 = 2.64:1) dùng làm placeholder và chữ phụ rớt AA, prefers-reduced-motion chỉ bảo vệ page-enter mà bỏ sót dialog/toast/spinner, thiếu skip-link và landmark <main> trên trang public, và các nút thumbnail trong PDF viewer không có tên truy cập. Đây là mức "tạm dùng được nhưng chưa đạt chuẩn institutional".

| Sub-tiêu chí | Điểm | Trạng thái | Ghi chú |
|---|:---:|:---:|---|
| Semantic HTML | 3.5/5 | adequate | Dùng nhiều phần tử ngữ nghĩa đúng (button, label, h1/h2, aside, header, table, form). Nhưng trang public thiếu <main> (page.tsx) và Dialog không phải dialog gốc. |
| ARIA roles/labels | 2.5/5 | weak | Form/IconButton tốt. Nhưng Tabs thiếu role tablist/tab/tabpanel, Dialog thiếu aria-labelledby/describedby, LanguageSwitcher listbox không đúng pattern, Tooltip không aria-describedby. |
| Keyboard navigation | 2.5/5 | weak | Esc đóng Dialog/menu OK, mọi control là button thật nên tab được. Nhưng Tabs & listbox không có điều hướng phím mũi tên; Tooltip không đóng bằng Esc (WCAG 1.4.13). |
| Focus management | 2/5 | weak | Dialog mở không set focus, không trap, không restore focus khi đóng — lỗi nặng cho modal phê duyệt. focus-visible ring cho link/button thì tốt. |
| Color contrast | 2/5 | weak | ink-4 #9aa0a8 = 2.64:1 dùng làm placeholder/chữ phụ/số trang rớt AA. Border hairline <1.6:1 và focus-ring form rgba(...,0.28) yếu. Chữ trạng thái nhỏ (draft/warning) ~3.25:1. |
| Screen-reader support | 3/5 | adequate | <html lang> đặt đúng theo locale, form có role=alert cho lỗi, Toast có role=status. Nhưng toast lỗi nên là role=alert, Tabs/Dialog đọc thiếu ngữ cảnh, nút thumbnail PDF không có nhãn. |
| Alt text | 3.5/5 | adequate | Avatar img có alt={name}; các SVG trang trí đều aria-hidden đúng. Trừ trường hợp Logo variant="mark" hoàn toàn không có tên truy cập. |
| Reduced motion | 2/5 | weak | Chỉ .bc-page-enter có @media prefers-reduced-motion. Dialog bc-pop/bc-fade, Toast bc-toast, button animate-spin, skeleton animate-pulse đều không được bảo vệ. |

**Findings:**

<details><summary><strong>A11Y-01 · 🟠 HIGH — </strong> — Dialog không có focus trap, không set focus ban đầu và không khôi phục focus khi đóng</summary>

- **Sub-tiêu chí:** Focus management · **Effort:** M
- **Bằng chứng:** src/components/ui/dialog.tsx:38-69 — useEffect chỉ nghe phím Escape; panel render `role="dialog" aria-modal="true"` (dòng 61-62) nhưng không có ref để focus, không bẫy Tab trong modal, không lưu/khôi phục document.activeElement. Modal phê duyệt/từ chối báo cáo (pdf-viewer.tsx:944-995) dùng Dialog này.
- **Tác động:** Người dùng bàn phím/screen-reader có thể Tab ra ngoài modal phê duyệt (về toolbar PDF phía sau scrim), không biết modal đang mở; khi đóng, focus mất về <body> thay vì về nút đã mở. Với modal quyết định draft→approve, đây là rủi ro thao tác sai trên surface bảo mật.
- **Khuyến nghị:** Khi open=true: lưu activeElement, focus phần tử focusable đầu tiên (hoặc panel với tabIndex=-1), bẫy Tab/Shift+Tab trong panel, và restore focus khi unmount. Có thể dùng <dialog> gốc với showModal() hoặc một thư viện focus-trap nhẹ.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>A11Y-04 · 🟠 HIGH — </strong> — Color contrast: token ink-4 (#9aa0a8 = 2.64:1) dùng làm placeholder và chữ phụ, rớt WCAG AA</summary>

- **Sub-tiêu chí:** Color contrast · **Effort:** M
- **Bằng chứng:** src/styles/tokens/colors.css:49 `--color-text-quaternary: #9aa0a8;` → đo được 2.64:1 trên nền trắng (yêu cầu AA 4.5 cho text thường). Dùng làm placeholder: input.tsx:88 `placeholder:text-ink-4`; số trang/đếm: pdf-viewer.tsx:846,893; metadata phụ pdf-viewer.tsx:752,1158; footer tài liệu pdf-viewer.tsx:127 `color:#9aa0a8`.
- **Tác động:** Placeholder (ten@quy.vn, ••••••••), số trang PDF và nhiều nhãn phụ không đọc được với người thị lực yếu/ánh sáng mạnh — quan trọng vì người dùng là nhà đầu tư lớn tuổi đọc báo cáo tài chính.
- **Khuyến nghị:** Nâng ink-4 lên ≥ #767b84 (~4.5:1) hoặc chỉ dùng ink-4 cho phần tử phi-văn-bản. Không dựa vào placeholder làm nhãn (đã có label, tốt). Kiểm lại số trang/đếm trong viewer dùng ink-3 thay vì ink-4.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>A11Y-02 · 🟡 MEDIUM</strong> — Dialog thiếu aria-labelledby/aria-describedby liên kết tiêu đề và mô tả</summary>

- **Sub-tiêu chí:** ARIA roles/labels · **Effort:** S
- **Bằng chứng:** src/components/ui/dialog.tsx:60-83 — panel có aria-modal nhưng title render là <h2> (dòng 74) và description là <p> (dòng 79) không có id, và phần tử role=dialog không trỏ aria-labelledby/aria-describedby tới chúng.
- **Tác động:** Screen-reader khi vào modal sẽ không tự đọc tiêu đề/mô tả ('Phê duyệt báo cáo?' / 'Báo cáo sẽ chuyển sang trạng thái Đã duyệt...'), làm mất ngữ cảnh của hành động quan trọng.
- **Khuyến nghị:** Sinh id cho title/description (useId), gắn aria-labelledby={titleId} và aria-describedby={descId} lên phần tử role=dialog. Nếu không có title nên yêu cầu aria-label.

</details>

<details><summary><strong>A11Y-03 · 🟡 MEDIUM</strong> — Tabs không tuân theo ARIA tab pattern (thiếu role tablist/tab/tabpanel và phím mũi tên)</summary>

- **Sub-tiêu chí:** ARIA roles/labels · **Effort:** M
- **Bằng chứng:** src/components/ui/tabs.tsx:50-86 — container là <div> không role, mỗi tab là <button> không có role="tab"/aria-selected/aria-controls; không có điều hướng ArrowLeft/Right (roving tabindex). Dùng trong SidePanel viewer (pdf-viewer.tsx:1095-1102).
- **Tác động:** Screen-reader không thông báo 'tab 1/2 selected'; người dùng bàn phím phải Tab qua từng tab thay vì dùng mũi tên theo kỳ vọng. Trải nghiệm AT kém trên panel Thông tin/Quyền truy cập.
- **Khuyến nghị:** Thêm role=tablist trên container, role=tab + aria-selected + tabIndex roving trên từng nút, xử lý ArrowLeft/Right/Home/End; panel nội dung nên có role=tabpanel + aria-labelledby tab tương ứng.

</details>

<details><summary><strong>A11Y-05 · 🟡 MEDIUM</strong> — prefers-reduced-motion chỉ bảo vệ page-enter, bỏ sót dialog/toast/spinner/skeleton</summary>

- **Sub-tiêu chí:** Reduced motion · **Effort:** S
- **Bằng chứng:** src/app/globals.css:189-193 chỉ có @media reduce cho .bc-page-enter. Các animation không guard: dialog.tsx:53,66 (bc-fade/bc-pop translateY+scale), toast.tsx:59,67 (bc-toast translateY), button.tsx:93 `animate-spin`, skeleton.tsx:8 `animate-pulse`.
- **Tác động:** Người bật reduce-motion (tiền đình, nhạy cảm chuyển động) vẫn thấy modal pop, toast trượt, spinner xoay, skeleton nhấp nháy — vi phạm WCAG 2.3.3 Animation from Interactions.
- **Khuyến nghị:** Thêm một block toàn cục trong @media (prefers-reduced-motion: reduce) để tắt/giảm các keyframe bc-* và animate-spin/animate-pulse (ví dụ animation: none hoặc duration ~0), hoặc đọc media query trong các component client để bỏ inline animation.

</details>

<details><summary><strong>A11Y-06 · 🟡 MEDIUM</strong> — Tooltip không đóng được bằng Esc và không liên kết aria-describedby với trigger</summary>

- **Sub-tiêu chí:** Keyboard navigation · **Effort:** M
- **Bằng chứng:** src/components/ui/tooltip.tsx:31-55 — chỉ toggle open theo onMouseEnter/Leave/Focus/Blur; bubble có role="tooltip" (dòng 45) nhưng trigger không nhận aria-describedby trỏ tới nó, và không có handler Escape để ẩn.
- **Tác động:** Vi phạm WCAG 1.4.13 (nội dung hover/focus phải dismissible bằng Esc). Ngoài ra screen-reader không liên kết tooltip với nút, nên nội dung ('Tải xuống', 'In'...) không được đọc — dù trong viewer các IconButton đã có aria-label nên ít nghiêm trọng hơn.
- **Khuyến nghị:** Thêm onKeyDown Escape để đóng; sinh id cho bubble và gán aria-describedby lên trigger (cloneElement). Cân nhắc bỏ Tooltip trên các IconButton đã có aria-label trùng nội dung để tránh đọc lặp.

</details>

<details><summary><strong>A11Y-07 · 🟡 MEDIUM</strong> — Nút thumbnail trong PDF viewer không có tên truy cập (accessible name)</summary>

- **Sub-tiêu chí:** Screen-reader support · **Effort:** S
- **Bằng chứng:** src/app/[locale]/(client)/reports/[slug]/pdf-viewer.tsx:810-852 — mỗi thumbnail là <button> chỉ chứa bản thu nhỏ trang (pointer-events-none) và số trang dạng số; không có aria-label/visible text mô tả ('Trang 1', 'Tóm tắt điều hành').
- **Tác động:** Screen-reader đọc các nút này là 'button' rỗng (hoặc chỉ '1','2'), người dùng AT không biết nút dẫn tới trang nào — rào cản điều hướng tài liệu, surface chính của sản phẩm.
- **Khuyến nghị:** Thêm aria-label={`Trang ${i+1}: ${p.title}`} cho mỗi nút thumbnail, và aria-current khi active. Cân nhắc bọc rail trong <nav aria-label="Thu nhỏ trang">.

</details>

<details><summary><strong>A11Y-08 · 🟡 MEDIUM</strong> — Thiếu skip-link 'Bỏ qua tới nội dung' trên mọi layout</summary>

- **Sub-tiêu chí:** Keyboard navigation · **Effort:** S
- **Bằng chứng:** grep toàn bộ src/ không có skip/sr-only link nào (chỉ trùng từ khóa 'skip' trong authz.ts:70 của Prisma). AppShell có sidebar nav dài (app-shell.tsx:90-143) và trang public có header+nav (page.tsx:72-78) nhưng không có anchor nhảy tới nội dung chính.
- **Tác động:** Người dùng bàn phím phải Tab qua toàn bộ sidebar/nav trên mỗi trang admin/portal trước khi tới nội dung — vi phạm WCAG 2.4.1 Bypass Blocks.
- **Khuyến nghị:** Thêm một skip-link đầu <body> (ẩn cho tới khi focus) trỏ tới id của vùng <main>; đặt id và tabIndex=-1 trên <main> trong app-shell.tsx (dòng 146) và trang public.

</details>

<details><summary><strong>A11Y-09 · ⚪ LOW</strong> — Trang public không có landmark <main></summary>

- **Sub-tiêu chí:** Semantic HTML · **Effort:** S
- **Bằng chứng:** grep '<main' trong src/app/[locale]/(public)/page.tsx → không có; trang chỉ gồm <header> (dòng 72) và chuỗi <section> (128,279,318,388,464,489). AppShell thì có <main> (app-shell.tsx:146) nên đây là vấn đề riêng của trang marketing.
- **Tác động:** Screen-reader thiếu landmark 'main' để nhảy nhanh tới nội dung chính của trang chủ; cũng làm skip-link khó neo.
- **Khuyến nghị:** Bọc các section nội dung trong <main id="main">…</main> (giữ <header> ngoài main).

</details>

<details><summary><strong>A11Y-10 · ⚪ LOW</strong> — Toast lỗi dùng role=status (polite) thay vì role=alert (assertive)</summary>

- **Sub-tiêu chí:** Screen-reader support · **Effort:** S
- **Bằng chứng:** src/components/ui/toast.tsx:58 luôn render `role="status"` (aria-live polite). Các toast lỗi dùng cùng component: pdf-viewer.tsx:1021-1031 ('Không thể tải xuống') và 1009-1016 (từ chối báo cáo, tone danger).
- **Tác động:** Thông báo lỗi tải xuống / từ chối có thể bị screen-reader trì hoãn hoặc không ngắt lời người dùng, làm họ bỏ lỡ lỗi trên thao tác bảo mật (mint download token).
- **Khuyến nghị:** Cho phép Toast nhận prop role/aria-live và dùng role="alert" khi tone="danger"/"warning"; giữ role="status" cho success/info.

</details>

<details><summary><strong>A11Y-11 · ⚪ LOW</strong> — LanguageSwitcher dùng role=listbox/option nhưng không hỗ trợ điều hướng phím mũi tên</summary>

- **Sub-tiêu chí:** ARIA roles/labels · **Effort:** M
- **Bằng chứng:** src/components/language-switcher.tsx:68-104 — div role="listbox" chứa các <button role="option" aria-selected>; trigger có aria-haspopup="listbox"/aria-expanded (dòng 50-54). Không có xử lý ArrowUp/Down/Home/End và các option là tab-stop riêng (không roving tabindex), trái với listbox pattern.
- **Tác động:** Hành vi bàn phím lệch kỳ vọng của AT cho listbox; người dùng screen-reader có thể bối rối khi listbox không điều hướng bằng mũi tên. Tác động thấp vì menu nhỏ (3 ngôn ngữ) và vẫn Tab/Enter được.
- **Khuyến nghị:** Hoặc chuyển sang role="menu"/menuitem với điều hướng mũi tên, hoặc giữ listbox nhưng thêm roving tabindex + ArrowUp/Down + focus quản lý option. Đơn giản nhất: dùng <button>+menu thường, bỏ role listbox.

</details>

<details><summary><strong>A11Y-12 · ⚪ LOW</strong> — Logo variant="mark" không có tên truy cập</summary>

- **Sub-tiêu chí:** Alt text · **Effort:** S
- **Bằng chứng:** src/components/logo.tsx:15-55 — SVG crest có aria-hidden (dòng 28); wordmark 'Blackcrest' chỉ render khi variant="full" (dòng 46). Khi variant="mark" toàn bộ logo không có text/aria-label nào.
- **Tác động:** Nếu Logo mark được dùng làm liên kết về trang chủ ở đâu đó, screen-reader sẽ đọc link rỗng. Hiện tại các nơi dùng kèm aria-label ở wrapper (vd public page.tsx:74 Link aria-label="Blackcrest") nên rủi ro thực tế thấp.
- **Khuyến nghị:** Khi variant="mark" thêm aria-label="Blackcrest" (hoặc role=img + aria-label) trên container, để mark luôn có tên truy cập độc lập.

</details>

<details><summary><strong>A11Y-13 · ⚪ LOW</strong> — Focus ring của form field (rgba accent 0.28) có thể không đạt tương phản 3:1</summary>

- **Sub-tiêu chí:** Color contrast · **Effort:** S
- **Bằng chứng:** src/styles/tokens/colors.css:18 `--color-focus-ring: rgba(20, 22, 27, 0.28)`; dùng làm box-shadow 3px focus cho Input (input.tsx:74), Select (select.tsx:72), Checkbox (checkbox.tsx:50), Switch (switch.tsx:50). Lớp accent mờ 28% trên nền trắng cho tương phản thấp; border-accent đi kèm thì đậm nên đỡ hơn.
- **Tác động:** Chỉ báo focus cho trường nhập có thể khó thấy với người thị lực yếu (WCAG 1.4.11 yêu cầu chỉ báo focus ≥3:1). Link/button thì dùng ring inset accent đậm — đạt tốt.
- **Khuyến nghị:** Tăng độ đậm focus-ring (vd rgba 0.45–0.6 hoặc dùng màu đặc accent ở viền) và đảm bảo viền focus đạt ≥3:1 so với nền và trạng thái không-focus.

</details>

**Điểm mạnh:**

- ✅ Tất cả control form đều dựng trên phần tử gốc (input/select/checkbox/switch) với label htmlFor liên kết qua useId — nền tảng a11y vững (input.tsx:60-66, select.tsx:54-65, checkbox.tsx:29-48, switch.tsx:29-48).
- ✅ IconButton bắt buộc prop label và gán đồng thời aria-label + title (icon-button.tsx:23,64-65), buộc mọi nút chỉ-icon trong toolbar PDF đều có tên truy cập.
- ✅ Có quy tắc focus-visible toàn cục với ring inset accent đậm cho link/button/tab/option (globals.css:156-160) — chỉ báo focus rõ cho phần tử hành động.
- ✅ <html lang={locale}> đặt đúng theo ngôn ngữ hiện tại (layout.tsx:39), hỗ trợ phát âm screen-reader đa ngôn ngữ vi/en/zh.
- ✅ Lỗi form auth dùng role="alert" để thông báo ngay (login-form.tsx:57, register-form.tsx:108); SVG trang trí đều aria-hidden nhất quán (logo, select chevron, checkbox tick, spinner).
- ✅ Dialog và các menu (LanguageSwitcher, MobileMenu) đều đóng bằng phím Escape (dialog.tsx:40-42, language-switcher.tsx:31), và menu còn đóng khi click ra ngoài.
- ✅ Avatar có img alt={name} đầy đủ (avatar.tsx:64-66); fallback initials khi không có ảnh.

---

### 6.10 Security — AuthN, Session, Secrets, Web — 62/100 (C)

Nền tảng auth có chất lượng khá tốt cho một bản MVP: argon2id đúng tham số OWASP, gate PENDING/SUSPENDED, re-check entitlement ở data layer trên MỌI request PDF, download token một lần dùng atomic, và chống path traversal trong storage. Tuy nhiên với một portal tài sản tư nhân "security-first" còn các lỗ hổng nghiêm trọng: file .env chứa secret thật (AUTH_SECRET, DOWNLOAD_TOKEN_SECRET) nằm trên đĩa; DOWNLOAD_TOKEN_SECRET có fallback hardcode "insecure-dev-download-secret"; HOÀN TOÀN không có Content-Security-Policy và không có HSTS; và cơ chế tokenVersion để thu hồi phiên/đổi vai trò thực chất KHÔNG hoạt động (chỉ select chứ không so sánh). Cần xử lý nhóm secret + CSP + revocation trước khi launch.

| Sub-tiêu chí | Điểm | Trạng thái | Ghi chú |
|---|:---:|:---:|---|
| Authentication | 4/5 | strong | argon2id (64MiB, t=3, p=1) đúng chuẩn OWASP 2026, gate PENDING/SUSPENDED ở authorize + re-check ở data layer. Trừ điểm vì thiếu chính sách độ phức tạp mật khẩu và có timing oracle khi user không tồn tại. |
| Session management | 2/5 | weak | JWT strategy maxAge 30 phút hợp lý, nhưng tokenVersion được nhúng vào JWT và select từ DB mà KHÔNG BAO GIỜ so sánh → thu hồi phiên/đổi vai trò không có hiệu lực tới khi JWT hết hạn; role đọc từ JWT cũ chứ không từ DB. |
| Token storage | 3/5 | adequate | Download token JWT HS256 một lần dùng, jti persist + consume atomic, TTL 60s — thiết kế tốt; nhưng truyền qua query string (lộ trong log/Referer) và thiếu ràng buộc aud/iss. |
| Secret exposure | 1/5 | weak | .env chứa AUTH_SECRET và DOWNLOAD_TOKEN_SECRET dạng base64 thật nằm trên đĩa; DOWNLOAD_TOKEN_SECRET có fallback hardcode bất an. NEXT_PUBLIC_ chỉ có APP_NAME (an toàn). |
| XSS protection | 4/5 | strong | Không có dangerouslySetInnerHTML/innerHTML/eval; React auto-escape; dữ liệu báo cáo (title/summary/author) render qua JSX an toàn. Trừ điểm vì thiếu CSP làm lớp phòng thủ chiều sâu. |
| CSRF protection | 4/5 | strong | Server Actions Next.js 15 có chống CSRF tích hợp (same-origin/Origin check); NextAuth v5 có CSRF token riêng. Không thấy state-changing GET. Ổn. |
| CSP | 0/5 | missing | Không có Content-Security-Policy ở bất kỳ đâu (next.config.ts lẫn nginx). Với portal tài liệu nhạy cảm đây là thiếu sót lớn. |
| Security headers | 2/5 | weak | nginx có X-Content-Type-Options, X-Frame-Options, Referrer-Policy nhưng THIẾU Strict-Transport-Security (HSTS) dù đã terminate TLS, thiếu Permissions-Policy; headers chỉ tồn tại ở nginx (không có khi chạy trực tiếp Node). |
| Input validation | 4/5 | strong | zod validate nhất quán ở mọi Server Action (cuid, email, enum locale), normalize email lowercase, refine XOR entitlement; route handler validate token + range. Tốt. |
| Output sanitization | 4/5 | strong | Content-Disposition filename dùng report.slug (server-controlled, regex-safe), Content-Type cố định application/pdf, watermark nhúng email/IP qua pdf-lib (không phải HTML). Không có sink nguy hiểm. |

**Findings:**

<details><summary><strong>SEC-01 · 🟠 HIGH — </strong> — File .env chứa secret thật (AUTH_SECRET, DOWNLOAD_TOKEN_SECRET) nằm trên đĩa dự án</summary>

- **Sub-tiêu chí:** Secret exposure · **Effort:** S
- **Bằng chứng:** .env:3 `AUTH_SECRET="rHwjSOI5mClTJehpuQhJbx8uY460VZUjVW1iibNkV3w="` và .env:7 `DOWNLOAD_TOKEN_SECRET="QxYt0//76LfTcvibV+OAh4X4nM8ij1iMZLmaoeiAgKs="` là giá trị base64 thật (khác hẳn .env.example:7 `AUTH_SECRET="replace-me"`). .gitignore:19 có liệt kê `.env` nhưng dự án không nằm dưới git nên file vẫn hiện diện trên đĩa và dễ bị đóng gói/sao chép nhầm.
- **Tác động:** Lộ AUTH_SECRET cho phép kẻ tấn công tự ký JWT phiên hợp lệ (giả mạo bất kỳ user/role nào, kể cả SUPER_ADMIN). Lộ DOWNLOAD_TOKEN_SECRET cho phép tự đúc download token, dù vẫn cần jti tồn tại trong DB nên rủi ro thấp hơn. Đây là khoá tạo phiên cho portal tài sản tư nhân.
- **Khuyến nghị:** Coi cặp secret này là đã lộ: xoay (rotate) ngay cả AUTH_SECRET và DOWNLOAD_TOKEN_SECRET trước khi lên prod. Không bao giờ commit/giữ .env có secret thật trong cây dự án; nạp secret qua biến môi trường runtime hoặc secret manager (docker-compose.prod.yml:34-36 đã yêu cầu chúng qua env — giữ mô hình đó). Bổ sung kiểm tra khởi động fail-fast nếu secret trùng giá trị mẫu/yếu.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>SEC-02 · 🟠 HIGH — </strong> — DOWNLOAD_TOKEN_SECRET có fallback hardcode bất an</summary>

- **Sub-tiêu chí:** Secret exposure · **Effort:** S
- **Bằng chứng:** src/lib/download-token.ts:11-13 `const secret = new TextEncoder().encode(process.env.DOWNLOAD_TOKEN_SECRET ?? "insecure-dev-download-secret");`. Nếu biến môi trường không được set, hệ thống tự dùng secret công khai này để ký/verify token.
- **Tác động:** Nếu deploy thiếu env (sai cấu hình, container không nạp env), download token sẽ được ký bằng một secret ai cũng biết → kẻ tấn công có thể tự tạo token tải PDF. Sự cố cấu hình âm thầm thay vì fail rõ ràng.
- **Khuyến nghị:** Bỏ fallback; ném lỗi khi process.env.DOWNLOAD_TOKEN_SECRET không tồn tại (fail-fast tại boot). Tương tự xác nhận AUTH_SECRET bắt buộc.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>SEC-03 · 🟠 HIGH — </strong> — Hoàn toàn không có Content-Security-Policy</summary>

- **Sub-tiêu chí:** CSP · **Effort:** M
- **Bằng chứng:** grep toàn repo không tìm thấy 'content-security' trong next.config.ts, nginx/blackcrest.conf hay bất kỳ file nào. next.config.ts:6-18 không có khối headers(). nginx/blackcrest.conf:43-45 chỉ có X-Content-Type-Options, X-Frame-Options, Referrer-Policy.
- **Tác động:** Không có CSP nghĩa là một lỗ XSS bất kỳ (kể cả từ dependency tương lai) sẽ có toàn quyền nạp script ngoài, exfiltrate session/JWT và nội dung PDF nhạy cảm. Đối với portal tài sản tư nhân, CSP là lớp phòng thủ chiều sâu bắt buộc.
- **Khuyến nghị:** Thêm CSP chặt (default-src 'self'; object-src 'none'; frame-ancestors 'self'; base-uri 'self'; ...) qua next.config.ts headers() (áp cả khi chạy Node, không chỉ nginx). Next 15 có thể cần nonce cho inline style/script; cân nhắc strict-dynamic + nonce. Bổ sung Permissions-Policy.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>SEC-04 · 🟠 HIGH — </strong> — Cơ chế tokenVersion thu hồi phiên / đổi vai trò không hoạt động</summary>

- **Sub-tiêu chí:** Session management · **Effort:** M
- **Bằng chứng:** src/lib/rbac.ts:37-47 requireFreshUser() `select: { id, role, status, tokenVersion }` rồi chỉ kiểm tra `dbUser.status !== "APPROVED"` — KHÔNG so sánh dbUser.tokenVersion với token. src/server/accounts.ts:23 bump tokenVersion khi SUSPENDED, nhưng comment src/auth.config.ts:15 và rbac.ts:34 hứa 're-check tokenVersion against the DB'. Vai trò trong middleware (src/middleware.ts:38 `session.user.role`) và requireRole (rbac.ts:28) đọc từ JWT cũ, không từ DB.
- **Tác động:** Hạ vai trò một staff (vd EDITOR→CLIENT) hoặc cưỡng bức đăng xuất KHÔNG có hiệu lực cho tới khi JWT hết hạn (tối đa 30 phút). Suspend chỉ chặn được nhờ kiểm tra status (may mắn), còn tokenVersion là code chết. Cửa sổ 30 phút lạm quyền sau khi thu hồi.
- **Khuyến nghị:** So sánh thực sự: trong requireFreshUser, nếu dbUser.tokenVersion !== token.tokenVersion thì ném lỗi/buộc đăng nhập lại; bump tokenVersion khi đổi role nữa (không chỉ suspend). Cân nhắc đọc role/status hiện thời từ DB cho các kiểm tra nhạy cảm thay vì tin JWT. Cập nhật callback jwt để refresh khi cần.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>SEC-05 · 🟡 MEDIUM</strong> — Thiếu HSTS dù đã terminate TLS</summary>

- **Sub-tiêu chí:** Security headers · **Effort:** S
- **Bằng chứng:** nginx/blackcrest.conf:28-45 server block 443 có ssl_certificate và add_header cho X-Content-Type-Options/X-Frame-Options/Referrer-Policy nhưng KHÔNG có `add_header Strict-Transport-Security`. Block 80 (dòng 23-25) chỉ redirect 301.
- **Tác động:** Không có HSTS, trình duyệt có thể bị hạ cấp xuống HTTP qua SSL-strip ở lần truy cập đầu hoặc mạng thù địch, lộ cookie phiên của nhà đầu tư.
- **Khuyến nghị:** Thêm `add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;` vào server block 443 sau khi đã xác nhận toàn bộ subdomain dùng HTTPS.

</details>

<details><summary><strong>SEC-06 · 🟡 MEDIUM</strong> — Account enumeration qua timing khi đăng nhập</summary>

- **Sub-tiêu chí:** Authentication · **Effort:** S
- **Bằng chứng:** src/auth.ts:36-42: `findUnique` rồi `if (!user?.passwordHash) return null;` — khi email không tồn tại, hàm trả về ngay mà KHÔNG chạy verifyPassword (argon2). Khi email tồn tại, argon2 verify (64MiB, t=3) chạy tốn ~hàng chục ms. Chênh lệch thời gian phản hồi lộ email nào đã đăng ký.
- **Tác động:** Kẻ tấn công đo thời gian phản hồi để liệt kê email khách hàng hợp lệ của một quỹ tư nhân (thông tin nhạy cảm về danh sách nhà đầu tư) và tập trung brute-force/phishing. nginx rate-limit 5r/m giảm nhẹ nhưng không loại bỏ.
- **Khuyến nghị:** Khi user không tồn tại, vẫn chạy một argon2 verify giả với một hash dummy cố định để cân bằng thời gian (constant-time path). Trả cùng thông báo lỗi chung như hiện tại.

</details>

<details><summary><strong>SEC-07 · 🟡 MEDIUM</strong> — Đăng ký tiết lộ rõ email đã tồn tại</summary>

- **Sub-tiêu chí:** Authentication · **Effort:** S
- **Bằng chứng:** src/server/auth-actions.ts:65-71: khi `existing` khác null trả về fieldErrors.email = "Email này đã được đăng ký." — xác nhận trực tiếp email đã có tài khoản (dù comment dòng 66 tự nhận là tránh lộ).
- **Tác động:** Cho phép liệt kê email khách hàng hợp lệ qua form đăng ký công khai — rò rỉ thành viên/nhà đầu tư của quỹ.
- **Khuyến nghị:** Trả thông báo trung lập ("Nếu email hợp lệ, chúng tôi sẽ liên hệ") hoặc luôn báo thành công ở mức UI và xử lý trùng lặp âm thầm phía server; đặt rate-limit cho endpoint register.

</details>

<details><summary><strong>SEC-08 · 🟡 MEDIUM</strong> — Thiếu chính sách độ phức tạp mật khẩu</summary>

- **Sub-tiêu chí:** Authentication · **Effort:** M
- **Bằng chứng:** src/server/auth-actions.ts:26 `password: z.string().min(8, ...)` — chỉ ràng buộc độ dài tối thiểu 8. UI register-form.tsx:92 gợi ý 'chữ hoa, số, ký tự đặc biệt' nhưng KHÔNG được enforce ở schema. Login schema (auth.ts:11) min(1).
- **Tác động:** Cho phép mật khẩu yếu (vd '12345678') cho tài khoản truy cập tài liệu tài chính nhạy cảm; tăng rủi ro brute-force/credential-stuffing.
- **Khuyến nghị:** Thêm kiểm tra độ mạnh: tối thiểu 10-12 ký tự và/hoặc đối chiếu danh sách mật khẩu lộ (vd zxcvbn hoặc HaveIBeenPwned k-anonymity). Giữ thông điệp lỗi tiếng Việt.

</details>

<details><summary><strong>SEC-09 · 🟡 MEDIUM</strong> — Download token truyền qua query string và thiếu ràng buộc aud/iss</summary>

- **Sub-tiêu chí:** Token storage · **Effort:** M
- **Bằng chứng:** src/server/download-actions.ts:28 `url: /api/reports/${id.data}/download?token=${token}` và route download/route.ts:30 đọc token từ `searchParams.get("token")`. mintDownloadToken (download-token.ts:26-31) chỉ set rid/sub/jti/exp — không setAudience/setIssuer; consume (dòng 42) jwtVerify không truyền {audience, issuer}.
- **Tác động:** Token nằm trong URL có thể lọt vào access log nginx, Referer, lịch sử trình duyệt. Vì là one-time + TTL 60s + consume atomic nên tác động bị giới hạn nhiều, nhưng thiếu aud/iss khiến token tái dùng được nếu cùng secret bị dùng cho mục đích khác.
- **Khuyến nghị:** Cân nhắc gửi token qua header/POST thay vì query (hoặc chấp nhận rủi ro do TTL ngắn + one-time). Thêm setIssuer/setAudience khi ký và truyền {issuer, audience} vào jwtVerify để ràng buộc mục đích. Đảm bảo nginx không log query string cho route download.

</details>

<details><summary><strong>SEC-10 · ⚪ LOW</strong> — Không cấu hình cookie phiên tường minh; trustHost: true ở mọi môi trường</summary>

- **Sub-tiêu chí:** Session management · **Effort:** S
- **Bằng chứng:** src/auth.config.ts không khai báo khối `cookies`/`useSecureCookies` (dựa hoàn toàn vào mặc định NextAuth v5). auth.config.ts:18 `trustHost: true` được set cứng (kể cả dev/prod). NextAuth v5 mặc định httpOnly + sameSite=lax + secure (theo __Secure- prefix khi HTTPS), nên mặc định chấp nhận được nhưng không được khẳng định rõ.
- **Tác động:** Phụ thuộc ngầm vào mặc định framework; trustHost cứng có thể cho phép host header spoofing trong callback nếu nginx không chuẩn hoá Host. Rủi ro thấp vì nginx set Host (proxy_params:2) và mặc định cookie an toàn.
- **Khuyến nghị:** Khai báo tường minh khối cookies với httpOnly, sameSite: 'lax', secure: true (prod) và __Host-/__Secure- prefix để tự ghi nhận chủ đích; cân nhắc giới hạn trustHost theo AUTH_URL trong prod.

</details>

<details><summary><strong>SEC-11 · ⚪ LOW</strong> — DEV_PASSWORD chung cho mọi user trong seed, có thể chạy nhầm trên prod</summary>

- **Sub-tiêu chí:** Authentication · **Effort:** S
- **Bằng chứng:** prisma/seed.ts:13 `const DEV_PASSWORD = "Blackcrest@2026";` dùng cho TẤT CẢ user kể cả admin@blackcrest.vn (SUPER_ADMIN, seed.ts:20) và in ra console (seed.ts:178). Không có guard chặn seed chạy ngoài môi trường dev.
- **Tác động:** Nếu seed bị chạy trên DB prod (vô tình qua pnpm db:seed), tài khoản SUPER_ADMIN sẽ có mật khẩu công khai biết trước → chiếm toàn quyền portal.
- **Khuyến nghị:** Thêm guard `if (process.env.NODE_ENV === 'production') throw` ở đầu seed; hoặc lấy mật khẩu seed từ env và bắt buộc đổi ở lần đăng nhập đầu (forcePasswordChange).

</details>

**Điểm mạnh:**

- ✅ argon2id với tham số đúng OWASP 2026 (memoryCost 64MiB, timeCost 3, parallelism 1) và verifyPassword bọc try/catch trả false an toàn (src/lib/password.ts:7-28).
- ✅ Phòng thủ chiều sâu thực sự: middleware tự nhận mình KHÔNG phải biên giới bảo mật (CVE-2025-29927) và mọi RSC/Route Handler/Server Action đều re-check auth + entitlement ở data layer qua canViewReport (src/middleware.ts:7-13, src/lib/authz.ts:15-27, view/route.ts:31-44).
- ✅ Download token một lần dùng đúng kiểu: jti persist, consume atomic bằng updateMany với điều kiện consumedAt:null + expiresAt>now và kiểm tra count===1, TTL 60s (src/lib/download-token.ts:37-57); route download còn re-check status APPROVED + entitlement sau khi consume (download/route.ts:38-54).
- ✅ Validate đầu vào nhất quán bằng zod ở mọi Server Action (cuid, email, enum locale), entitlement XOR refine, idempotent grant, và toàn bộ admin-data đều requireRole (src/server/entitlements.ts:13-21, src/server/admin-data.ts:8-63).
- ✅ Chống path traversal trong storage adapter với normalize + strip ../ + kiểm tra prefix STORAGE_ROOT, kèm 'server-only' (src/lib/storage.ts:24-35).
- ✅ Không có sink XSS: không dùng dangerouslySetInnerHTML/innerHTML/eval; PDF chỉ stream qua endpoint đã xác thực, không lộ URL storage; Cache-Control: private, no-store cho PDF (view/route.ts:60, download/route.ts:81).
- ✅ Server Actions dùng cho mọi thao tác ghi (CSRF tích hợp của Next 15), bodySizeLimit siết còn 1mb, và NextAuth v5 có CSRF token riêng (next.config.ts:14-16).

---

### 6.11 UX/UI & Design System — 68/100 (C)

Hệ thống design tokens và thư viện component ở mức xuất sắc: 14/14 primitive được port trung thực từ design-reference, token được phơi qua @theme inline đúng chuẩn, các trạng thái loading/error/empty đều được phủ đầy đủ. Tuy nhiên có hai lỗ hổng nghiêm trọng kéo điểm xuống: (1) toàn bộ khu vực ứng dụng đã xác thực (Portal, Admin, PDF viewer — vốn là crown jewel) gần như KHÔNG responsive, chỉ dùng được trên desktop; (2) dark theme được định nghĩa đầy đủ trong token nhưng không bao giờ được kích hoạt (data-theme không hề được set, không có toggle, 0 dark: variant) — đây là code chết. Ngoài ra phần lớn UI đã xác thực hardcode tiếng Việt dù message catalog vi/en/zh đã dịch đầy đủ, phá vỡ trải nghiệm đa ngôn ngữ, và luồng duyệt/từ chối trong viewer chỉ là toast giả (không đổi trạng thái thật).

| Sub-tiêu chí | Điểm | Trạng thái | Ghi chú |
|---|:---:|:---:|---|
| Information architecture | 4/5 | strong | Tách bạch rõ 3 vùng (public / portal / admin) qua route groups, nav portal & admin gọn (src/lib/nav.ts), phân cấp hợp lý. |
| Navigation | 3/5 | adequate | AppShell sidebar + LanguageSwitcher tốt, active state rõ; nhưng sidebar cố định không thu gọn trên mobile và not-found.tsx dùng <a href='/'> làm rớt locale + reload toàn trang. |
| User flows | 3/5 | adequate | Login/register/viewer luồng mạch lạc; nhưng duyệt/từ chối báo cáo trong viewer chỉ setToast giả, gây hiểu nhầm trạng thái đã đổi. |
| Design consistency | 3/5 | adequate | Thẩm mỹ B&W, squared corner, UPPERCASE tracked rất nhất quán; nhưng nhất quán đa ngôn ngữ bị phá do hardcode tiếng Việt khắp UI đã xác thực. |
| Design system | 5/5 | strong | Token role-based (colors/typography/spacing/elevation) khớp design-reference, phơi qua @theme inline chuẩn Tailwind v4; là điểm sáng nhất. |
| Component library | 5/5 | strong | 14/14 primitive design-reference được port trung thực (Button, Input, Badge, Dialog, Toast, Tabs...), có barrel index.ts, forwardRef, server/client tách đúng. |
| Responsive design | 1/5 | weak | Chỉ landing marketing responsive; AppShell grid-cols-[240px_1fr], bảng admin và PDF viewer (~700px chrome cố định) hoàn toàn desktop-only. |
| Dark mode | 1/5 | weak | Token dark đầy đủ ([data-theme=dark]) nhưng KHÔNG bao giờ set data-theme, không toggle, 0 dark: variant — code chết, không thể bật. |
| Error states | 4/5 | strong | error.tsx có branding + reset, not-found.tsx gộp 404/no-access (đúng bảo mật), login-form có inline error role=alert; thiếu global-error.tsx. |
| Empty states | 5/5 | strong | Mọi danh sách đều có empty state (reports, accounts, audit, entitlements cả cấp group lẫn entitlement, portal, library). |
| Loading states | 4/5 | strong | AppShellSkeleton mô phỏng chrome, loading.tsx cho cả admin & client, template.tsx fade-in, Button có spinner; chưa có skeleton riêng cho viewer. |

**Findings:**

<details><summary><strong>UX-02 · 🟠 HIGH — </strong> — Toàn bộ khu vực ứng dụng đã xác thực không responsive (desktop-only)</summary>

- **Sub-tiêu chí:** Responsive design · **Effort:** L
- **Bằng chứng:** src/components/app-shell.tsx:88 `grid h-screen grid-cols-[240px_1fr]` — sidebar 240px cố định, không có breakpoint thu gọn. src/app/[locale]/(admin)/admin/reports/page.tsx:100 `grid grid-cols-4` và bảng <table> dòng 137 không có wrapper overflow-x. accounts/page.tsx:112,129 dùng `grid-cols-[2fr_1.2fr_1fr_0.9fr_1fr_140px]` cố định 6 cột. pdf-viewer.tsx: rail 168px (dòng 806) + panel 320px (dòng 1093) + canvas trang cứng 794px (dòng 111) = chrome cố định ~700px, không có breakpoint nào. Đối chiếu: chỉ landing marketing (public/page.tsx) có ~31 breakpoint thực + mobile-menu.tsx.
- **Tác động:** Nhà đầu tư private-wealth thường mở tài liệu trên iPad/điện thoại; trên màn <1000px sidebar + bảng + viewer sẽ tràn/cắt nội dung, không cuộn ngang được. Crown-jewel viewer thực tế không dùng được trên mobile.
- **Khuyến nghị:** Cho AppShell sidebar thu gọn/ẩn dưới lg (off-canvas + hamburger như mobile-menu). Bọc các <table>/grid-cols cố định trong `overflow-x-auto` hoặc chuyển sang layout card trên mobile. Viewer: ẩn rail + panel dưới breakpoint, cho phép toggle.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>UX-03 · 🟠 HIGH — </strong> — UI khu vực đã xác thực hardcode tiếng Việt dù message catalog đã dịch đủ vi/en/zh</summary>

- **Sub-tiêu chí:** Design consistency · **Effort:** L
- **Bằng chứng:** messages/{vi,en,zh}.json đã có Nav/Status/Actions dịch đầy đủ (Overview/概览, Draft/草稿...). Nhưng: accounts/page.tsx:71 `title="Tài khoản"`, stat labels dòng 59-64, header cột dòng 113-118, nút dòng 200/209/218 ("Phê duyệt"/"Tạm khoá"/"Khôi phục"); entitlements/page.tsx:44 `title="Phân quyền"`; portal/page.tsx KPIS dòng 44-74 + greeting dòng 121; reports/page.tsx:78 "Thư viện tài liệu"; toàn bộ pdf-viewer.tsx (STATUS_LABEL, watermark "BẢO MẬT", mọi tooltip/dialog/timeline). Empty states cũng hardcode: "Chưa có tài khoản", "Chưa có báo cáo nào.".
- **Tác động:** Người dùng en/zh đăng nhập sẽ thấy nav + status dịch đúng nhưng tiêu đề trang, bảng, KPI, viewer, empty/error giữ nguyên tiếng Việt — trải nghiệm hỗn hợp, kém chuyên nghiệp với khách quốc tế của portal private-wealth.
- **Khuyến nghị:** Chuyển mọi chuỗi hiển thị qua next-intl (getTranslations/useTranslations), bổ sung key cho viewer/empty-state/stat-label vào 3 catalog. Lint cấm string literal hiển thị trong JSX của vùng app.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>UX-04 · 🟠 HIGH — </strong> — Luồng duyệt/từ chối báo cáo trong viewer chỉ là toast giả</summary>

- **Sub-tiêu chí:** User flows · **Effort:** M
- **Bằng chứng:** src/app/[locale]/(client)/reports/[slug]/pdf-viewer.tsx:956-958 nút Phê duyệt `onClick={() => { setDialog(null); setToast("approved"); }}` và 981-983 nút Từ chối `setToast("rejected")` — không gọi server action nào; toast hiển thị "Đã phê duyệt báo cáo · sẵn sàng phát hành" (dòng 1003-1005) trong khi trạng thái DB không đổi. Timeline SidePanel (dòng 1075-1090) cũng là dữ liệu cứng.
- **Tác động:** APPROVER/EDITOR tưởng đã duyệt/phát hành nhưng vòng đời báo cáo không thực sự chuyển trạng thái — sai lệch nghiêm trọng giữa UI và sự thật hệ thống, rủi ro cho quy trình kiểm soát tài liệu mật.
- **Khuyến nghị:** Nối dialog với server action thật (cập nhật ReportStatus + ghi audit log), revalidate đường dẫn; chỉ hiện toast thành công sau khi action trả về OK. Trước khi nối, không nên hiện toast khẳng định 'đã phê duyệt'.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>UX-01 · 🟡 MEDIUM</strong> — Dark mode được định nghĩa đầy đủ nhưng không thể kích hoạt (code chết)</summary>

- **Sub-tiêu chí:** Dark mode · **Effort:** M
- **Bằng chứng:** src/styles/tokens/colors.css:85 định nghĩa nguyên scope `[data-theme="dark"] {...}` (và elevation.css:26), globals.css:18 `@custom-variant dark (&:where([data-theme="dark"]...))`. Nhưng grep `data-theme` toàn src CHỈ khớp comment + định nghĩa CSS, không có chỗ nào set: src/app/[locale]/layout.tsx:39 `<html lang={locale} className={fontVariables} suppressHydrationWarning>` không có data-theme, không có theme toggle, 0 lần dùng `dark:` variant trong toàn bộ *.tsx.
- **Tác động:** Một lượng lớn token + CSS dark theme là code chết: không người dùng nào bật được dark mode. Với brand 'light-first' điều này có thể chấp nhận như quyết định sản phẩm, nhưng hiện trạng gây hiểu nhầm (tài liệu nói theme-aware/auto-swap) và là nợ kỹ thuật.
- **Khuyến nghị:** Hoặc (a) thêm theme toggle thật + ghi data-theme lên <html> (script chống FOUC trước hydration), hoặc (b) nếu cố ý chỉ light, xóa scope dark trong token + cập nhật comment globals.css để tránh hiểu nhầm. Quyết định rõ ràng thay vì để lửng lơ.

</details>

<details><summary><strong>UX-05 · ⚪ LOW</strong> — not-found.tsx dùng thẻ <a> thuần làm rớt locale và reload toàn trang</summary>

- **Sub-tiêu chí:** Navigation · **Effort:** S
- **Bằng chứng:** src/app/[locale]/not-found.tsx:26 `<a href="/" className="inline-flex">` — dùng anchor HTML thường thay vì Link locale-aware của next-intl (@/i18n/navigation), nên về '/' sẽ mất prefix /en hoặc /zh và gây full page reload.
- **Tác động:** Người dùng en/zh chạm 404 rồi bấm 'Về trang chủ' bị đẩy về locale mặc định + mất lợi ích SPA. Nhỏ nhưng phá nhất quán điều hướng đa ngôn ngữ.
- **Khuyến nghị:** Dùng Link từ @/i18n/navigation (như các trang khác) thay cho <a>. Lưu ý not-found không có locale param ở root nên cân nhắc trỏ về routing.defaultLocale có chủ đích.

</details>

<details><summary><strong>UX-06 · ⚪ LOW</strong> — Lời chào Portal cố định 'Chào buổi sáng' mọi thời điểm</summary>

- **Sub-tiêu chí:** Design consistency · **Effort:** S
- **Bằng chứng:** src/app/[locale]/(client)/portal/page.tsx:121-123 `<h2 ...>Chào buổi sáng, {userName}</h2>` — chuỗi cứng, không phụ thuộc giờ và không qua i18n.
- **Tác động:** Hiển thị 'buổi sáng' kể cả buổi tối, lệ thuộc múi giờ server (RSC); chi tiết nhỏ làm giảm cảm giác tinh tế của portal cao cấp, đồng thời là một chuỗi nữa không dịch en/zh.
- **Khuyến nghị:** Tính lời chào theo giờ phía client (hoặc dùng lời chào trung tính 'Xin chào') và đưa qua next-intl với 3 bản dịch.

</details>

<details><summary><strong>UX-07 · ⚪ LOW</strong> — Dialog thiếu focus-trap, initial focus và aria-labelledby</summary>

- **Sub-tiêu chí:** Component library · **Effort:** M
- **Bằng chứng:** src/components/ui/dialog.tsx:60-68 panel có `role="dialog" aria-modal="true"` nhưng không trỏ aria-labelledby tới title (dòng 74), không tự focus phần tử đầu khi mở, không bẫy Tab trong modal (chỉ lắng Escape, dòng 38-45). Toast.tsx:95 và một số nơi còn aria-label hardcode tiếng Anh 'Close'.
- **Tác động:** Người dùng bàn phím/screen-reader có thể Tab ra ngoài modal đang mở, không nghe được tiêu đề modal. Với portal định chế cần chuẩn a11y, đây là điểm trừ.
- **Khuyến nghị:** Thêm focus-trap + auto-focus phần tử đầu khi open, gắn aria-labelledby/aria-describedby với title/description, trả focus về trigger khi đóng; dịch aria-label 'Close'.

</details>

<details><summary><strong>UX-08 · ⚪ LOW</strong> — Thiếu skeleton/loading riêng cho PDF viewer (crown jewel)</summary>

- **Sub-tiêu chí:** Loading states · **Effort:** S
- **Bằng chứng:** src/app/[locale]/(client)/loading.tsx:5 trả về AppShellSkeleton (silhouette sidebar+bảng), nhưng route viewer reports/[slug] có layout hoàn toàn khác (rail + canvas trang + panel). Không có loading.tsx riêng trong thư mục [slug].
- **Tác động:** Khi mở một báo cáo, người dùng thấy skeleton dạng dashboard rồi nhảy sang layout viewer — chuyển cảnh giật, không khớp hình. Trải nghiệm tải kém liền mạch ở chính bề mặt quan trọng nhất.
- **Khuyến nghị:** Thêm loading.tsx trong reports/[slug] mô phỏng khung viewer (toolbar 56px + rail + vùng trang), giữ liên tục thị giác khi stream.

</details>

**Điểm mạnh:**

- ✅ Hệ thống design token role-based (src/styles/tokens/*.css) khớp gần như tuyệt đối với design-reference (colors.css trùng khớp), phơi sang Tailwind v4 qua @theme inline rất bài bản — single source of truth thật sự.
- ✅ Thư viện component hoàn chỉnh 100%: cả 14 primitive trong design-reference đều được port trung thực (Button/Input/Badge/Dialog/Toast/Tabs/Avatar...), có barrel index.ts, forwardRef, tách server/client component đúng nguyên tắc RSC.
- ✅ Thẩm mỹ Blackstone-institutional nhất quán cao: monochrome B&W, góc vuông (radius 2-4px), nút UPPERCASE tracking 0.09em, hairline border, focus ring đen inset — đúng brief.
- ✅ Phủ trạng thái rỗng đầy đủ và chu đáo: mọi danh sách (reports, accounts, audit, entitlements ở cả cấp group lẫn entitlement, portal, library) đều có empty state có chữ.
- ✅ Trạng thái loading tốt: AppShellSkeleton mô phỏng đúng chrome, loading.tsx cho cả admin & client, template.tsx fade-in tôn trọng prefers-reduced-motion, Button có spinner.
- ✅ Trang marketing landing thực sự responsive (mobile-first, ~31 breakpoint, hamburger off-canvas, grid stacking) — chứng tỏ đội ngũ nắm vững responsive khi muốn áp dụng.
- ✅ PDF viewer tuy hardcode chuỗi nhưng rất công phu về UX: IntersectionObserver theo dõi trang hiện tại, rail thumbnail scale, zoom/fit, watermark, one-time download token, tách quyền canApprove rõ ràng.

---

### 6.12 State Management — 68/100 (C)

Kiến trúc state về cơ bản đi đúng triết lý server-first: hầu hết dữ liệu được fetch trong RSC (getReportBySlug, listAdminReports, listAccounts) và mọi mutation đi qua Server Actions kèm revalidatePath (accounts.ts:34, entitlements.ts:54/76), login/register dùng useActionState chuẩn mực. Tuy nhiên hai thư viện state client được khai báo lại gần như là tài sản chết: zustand (^5.0.2) KHÔNG được import ở bất kỳ đâu, và React Query được wire vào Providers nhưng KHÔNG có một useQuery/useMutation/HydrationBoundary nào — chỉ là hạ tầng treo. Vấn đề nghiêm trọng nhất về mặt state là luồng phê duyệt/từ chối trong pdf-viewer chỉ là toast-only (setToast) không gọi server, khiến UI tuyên bố thành công trong khi state thật trên server không đổi — nguy hiểm cho một cổng tài liệu lifecycle draft→approve→publish.

| Sub-tiêu chí | Điểm | Trạng thái | Ghi chú |
|---|:---:|:---:|---|
| Global state | 1/5 | weak | zustand khai báo trong package.json nhưng KHÔNG import ở đâu (xác nhận bằng grep). React Query Provider có nhưng không dùng. Global client state thực tế = 0, nhưng hai lib treo gây nợ kỹ thuật. |
| Local state | 4/5 | strong | useState dùng đúng phạm vi cho UI cục bộ (zoom/current/panel/dialog/toast trong pdf-viewer.tsx:654-660; open trong mobile-menu, language-switcher). Hợp lý, không lạm dụng. |
| Server state | 4/5 | strong | Server state thuộc về RSC + Server Actions đúng mô hình: fetch qua server/reports.ts, mutation + revalidatePath (accounts.ts:34, entitlements.ts:54/76), useActionState ở form auth. |
| State ownership | 3/5 | adequate | Ranh giới server (RSC props) vs client (useState UI) rõ ràng và serializable hoá props (page.tsx:37-50). Trừ điểm vì approve/reject sở hữu state ở client (toast) thay vì server. |
| State duplication | 3/5 | adequate | Không trùng lặp RSC props vào store client (vì không có store). Nhưng toast 'approved'/'rejected' (pdf-viewer.tsx:997-1019) mâu thuẫn với report.status từ server — state hiển thị sai lệch khỏi nguồn sự thật. |
| Derived state | 4/5 | strong | Derived state tối giản và đúng: useMemo cho pages (pdf-viewer.tsx:682), Tabs controlled/uncontrolled chuẩn (tabs.tsx:39-43), current page suy ra từ IntersectionObserver. |
| Cache strategy | 2/5 | weak | staleTime:60_000 cấu hình trong get-query-client.ts:17 nhưng không bao giờ được dùng (không có query). Trang gated dùng force-dynamic đúng. Thiếu revalidate cho listAdminReports (do mutation report chưa tồn tại). |
| Data flow | 4/5 | strong | Luồng dữ liệu một chiều rõ: RSC fetch → props serializable → client island; mutation → server action → revalidatePath → re-render. Sạch và dễ theo dõi. |
| Store complexity | 3/5 | adequate | Không có store phức tạp (tốt cho app server-first), nhưng get-query-client.ts viết khá kỹ (per-request client chống rò rỉ entitlement) lại hoàn toàn không được dùng — phức tạp thừa. |

**Findings:**

<details><summary><strong>STATE-01 · 🟠 HIGH — </strong> — Phê duyệt/từ chối báo cáo chỉ là toast-only, không persist state lên server</summary>

- **Sub-tiêu chí:** State ownership · **Effort:** M
- **Bằng chứng:** src/app/[locale]/(client)/reports/[slug]/pdf-viewer.tsx:956-959 nút Phê duyệt chỉ chạy `onClick={() => { setDialog(null); setToast("approved"); }}`; tương tự từ chối tại :981-983 `setToast("rejected")`. Không có lời gọi server action nào, không cập nhật report.status. Toast hiển thị 'Đã phê duyệt báo cáo… sẵn sàng phát hành' (:1003-1004) trong khi server không thay đổi gì. server/reports.ts không có hàm mutation status (grep chỉ thấy đọc status).
- **Tác động:** Trong cổng tài liệu lifecycle draft→approve→publish của một quỹ đầu tư, người duyệt thấy thông báo thành công nhưng trạng thái thật không đổi: báo cáo không bao giờ chuyển sang APPROVED/PUBLISHED, hoặc tệ hơn người duyệt tưởng đã phê duyệt và bỏ qua. Đây là sai lệch state nguy hiểm giữa UI và nguồn sự thật, phá vỡ quy trình kiểm soát.
- **Khuyến nghị:** Thay handler toast bằng một Server Action (vd `approveReport(id, note)` / `rejectReport(id, reason)`) ghi DB, audit log, rồi revalidatePath cho trang viewer và admin reports. Chỉ hiện toast sau khi action trả về thành công; phản ánh report.status mới qua RSC re-render thay vì state client cục bộ.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>STATE-02 · 🟡 MEDIUM</strong> — zustand được khai báo nhưng KHÔNG sử dụng ở bất kỳ đâu (dead dependency)</summary>

- **Sub-tiêu chí:** Global state · **Effort:** S
- **Bằng chứng:** package.json:38 `"zustand": "^5.0.2"`. Grep toàn bộ src cho `from "zustand"`/`zustand/` trả về 0 kết quả; các match `create(` đều là `prisma.*.create()`. Không có store nào được định nghĩa.
- **Tác động:** Phụ thuộc treo làm phình bundle/khoá phiên bản, gây hiểu nhầm cho dev mới rằng có global store, tăng bề mặt bảo trì và supply-chain cho một app security-first. Không có giá trị sử dụng.
- **Khuyến nghị:** Gỡ zustand khỏi package.json cho tới khi thật sự cần một global client store. App server-first hiện không cần. Nếu sau này cần state UI chia sẻ, cân nhắc Context nhẹ trước khi thêm lib.

</details>

<details><summary><strong>STATE-03 · 🟡 MEDIUM</strong> — React Query được wire vào Providers nhưng không có một query/mutation nào — hạ tầng treo</summary>

- **Sub-tiêu chí:** Cache strategy · **Effort:** S
- **Bằng chứng:** src/app/providers.tsx:11-15 bọc toàn app trong `<QueryClientProvider>`; src/lib/get-query-client.ts cấu hình staleTime:60_000 và shouldDehydrateQuery. Nhưng grep toàn src cho useQuery/useMutation/useQueryClient/invalidateQueries/HydrationBoundary/prefetchQuery = 0 kết quả; getQueryClient chỉ được tham chiếu bởi chính providers.tsx.
- **Tác động:** Tải @tanstack/react-query (~bundle) và bọc Provider quanh mọi route mà không thu được lợi ích nào: không cache, không dedupe, không invalidation. staleTime cấu hình nhưng vô tác dụng. Comment trong file tuyên bố 'used ONLY for genuine client islands' nhưng thực tế chưa có island nào dùng — code và ý định lệch nhau.
- **Khuyến nghị:** Hoặc (a) gỡ QueryClientProvider + get-query-client + dependency cho tới khi có nhu cầu thực (polling audit log, bảng admin tương tác), hoặc (b) nếu giữ làm nền tảng tương lai thì ghi rõ là chủ đích và thêm ít nhất một island dùng nó. Hiện tại nên gỡ để giảm bundle và nợ kỹ thuật.

</details>

<details><summary><strong>STATE-04 · 🟡 MEDIUM</strong> — Timeline phê duyệt trong SidePanel là dữ liệu giả/hardcode, không phản ánh state thật</summary>

- **Sub-tiêu chí:** State duplication · **Effort:** M
- **Bằng chứng:** src/app/[locale]/(client)/reports/[slug]/pdf-viewer.tsx:1075-1090 mảng `timeline` hardcode các mốc 'Tạo bản nháp', 'Gửi phê duyệt' với thời gian '—' và đều gắn tone 'approved', dùng report.publishedAt cho cả mốc 'Phê duyệt' lẫn 'Phát hành'. Không có nguồn state thật cho từng mốc lifecycle.
- **Tác động:** Người duyệt/khách thấy một timeline luôn hiển thị các bước đã 'approved' bất kể trạng thái thực của báo cáo (kể cả DRAFT/REJECTED). Đây là state suy diễn sai, gây hiểu lầm về tình trạng kiểm soát tài liệu trong môi trường tuân thủ.
- **Khuyến nghị:** Lấy mốc lifecycle thật từ DB (audit log/report status history) qua RSC và truyền xuống làm props; suy ra tone từ trạng thái thực thay vì hardcode 'approved'. Phân biệt rõ mốc Phê duyệt vs Phát hành bằng các timestamp riêng.

</details>

<details><summary><strong>STATE-05 · ⚪ LOW</strong> — listAdminReports thiếu chiến lược revalidation cho mutation lifecycle báo cáo</summary>

- **Sub-tiêu chí:** Cache strategy · **Effort:** S
- **Bằng chứng:** src/server/reports.ts:63 `listAdminReports` được trang admin/reports/page.tsx dùng (page có `export const dynamic = "force-dynamic"`). Các server action accounts.ts/entitlements.ts đều có revalidatePath nhưng không có action nào cho report status, nên không có revalidatePath('/[locale]/admin/reports'). Khi mutation báo cáo được thêm (STATE-01), không có sẵn invalidation tương ứng.
- **Tác động:** Hiện tại force-dynamic che giấu vấn đề, nhưng khi luồng approve/upload được nối server, danh sách admin/viewer có thể hiển thị state cũ nếu quên revalidate. Thiếu quy ước cache nhất quán cho domain report.
- **Khuyến nghị:** Khi triển khai server action cho report (approve/reject/upload/publish), thêm revalidatePath cho '/[locale]/admin/reports', '/[locale]/reports' và trang viewer slug, theo đúng khuôn mẫu đã có ở accounts.ts/entitlements.ts.

</details>

**Điểm mạnh:**

- ✅ Mô hình server-first đúng đắn: dữ liệu nghiệp vụ được fetch trong RSC và truyền xuống client island dưới dạng props serializable (reports/[slug]/page.tsx:37-50), giảm tối đa state client.
- ✅ Mutation đi qua Server Actions + revalidatePath là cách quản lý server-state chuẩn của Next.js 15: accounts.ts:34, entitlements.ts:54 và :76 invalidate đúng trang sau khi ghi.
- ✅ Form auth dùng useActionState(loginAction) (login-form.tsx:19) — pattern hiện đại, bám sát React 19, không kéo react-query vào việc mutation.
- ✅ get-query-client.ts có nhận thức bảo mật tốt: tạo QueryClient MỚI mỗi request trên server để tránh rò rỉ cache gated giữa các user (dù hiện chưa dùng, ý thức thiết kế là đúng).
- ✅ Local UI state trong pdf-viewer được tách bạch, đúng phạm vi và có dùng useMemo/IntersectionObserver để suy ra trang hiện tại thay vì lưu trùng (pdf-viewer.tsx:682, :698-714).
- ✅ Component Tabs xử lý controlled/uncontrolled chuẩn mực (tabs.tsx:39-48), tránh trùng lặp/định nghĩa state mơ hồ.
- ✅ Các trang gated đặt export const dynamic = "force-dynamic" nhất quán (reports/page.tsx:34, admin pages) để tránh prerender/cache dữ liệu theo từng user.

---

### 6.13 API Layer & Server Actions — 68/100 (C)

Kiến trúc API tách bạch rõ ràng và đúng chuẩn Next.js 15: ghi dữ liệu qua Server Actions, streaming PDF qua Route Handlers, với re-check auth + entitlement ở mọi tầng dữ liệu (canViewReport, requireFreshUser) — đây là điểm mạnh thực sự cho một portal bảo mật. Cache-Control private, no-store trên cả route view/download là chính xác. Tuy nhiên có hai khoảng trống nghiêm trọng cho sản phẩm institutional: HOÀN TOÀN KHÔNG có rate limiting trên login/register/download (mở đường cho brute-force và lạm dụng watermark/PDF gen) và KHÔNG có timeout cho thao tác streaming/stamp PDF nặng. Pagination cũng nửa vời: listVisibleReports có keyset cursor chuẩn nhưng UI không bao giờ dùng nextCursor, còn listAdminReports/listAccounts/listGroupsWithEntitlements thì findMany không giới hạn — sẽ phình to theo dữ liệu.

| Sub-tiêu chí | Điểm | Trạng thái | Ghi chú |
|---|:---:|:---:|---|
| API architecture | 4/5 | strong | Tách đúng: Server Actions cho ghi, Route Handlers cho streaming PDF; serverActions bodySizeLimit 1mb, serverExternalPackages cho pdf-lib/argon2. Re-auth ở mọi tầng. |
| API abstraction | 4/5 | strong | canViewReport là single authz fn, requireAuth/requireRole/requireFreshUser tập trung, StorageAdapter interface trừu tượng tốt; clientIp() lặp lại ở 2 route. |
| API consistency | 3/5 | adequate | Server Actions trả {url}|{error} hoặc AuthFormState nhất quán; nhưng Route Handlers dùng plain text Response còn health dùng Response.json — shape lỗi không đồng nhất, thông điệp lẫn tiếng Anh/Việt. |
| Request handling | 4/5 | strong | Zod parse/safeParse ở mọi input (cuid, FormData, searchParams, Range header); Range/206 xử lý đúng cho pdf.js. Tốt. |
| Error handling | 2/5 | weak | Các action FormData (accounts/entitlements) không try/catch: ZodError/ForbiddenError ném thẳng ra error boundary chung, không phân biệt 403 vs lỗi hệ thống. Audit/access-log nuốt lỗi (chỉ console.error). |
| Retry strategy | 1/5 | missing | Không có retry ở bất kỳ đâu (server hay client). React Query cấu hình mặc định nhưng KHÔNG có useQuery/useMutation nào dùng — hạ tầng chết. handleDownload không retry. |
| Timeout strategy | 1/5 | missing | Không có timeout/AbortController/maxDuration. Stamp PDF (pdf-lib embedFont subset trên mọi trang) và stream file lớn có thể treo request vô thời hạn — rủi ro cho DoS chậm. |
| API caching | 4/5 | strong | Cache-Control: private, no-store đúng trên view+download; health force-dynamic; trang gated đặt dynamic=force-dynamic. Watermark cache theo (reportId+userId) hợp lý. Thiếu ETag/304 cho PDF (minor). |
| Pagination | 2/5 | weak | listVisibleReports có keyset (publishedAt,id) chuẩn nhưng call site bỏ nextCursor → không có 'tải thêm'. listAdminReports/listAccounts/listGroupsWithEntitlements findMany không take → unbounded. listAuditLog cap cứng 80, không cursor. |
| Rate limiting | 0/5 | missing | Tuyệt đối không có rate limiting: loginAction/registerAction (brute-force mật khẩu, account enumeration), requestDownloadUrl + /download + /view (lạm dụng sinh PDF watermark tốn CPU). Rủi ro thật cho portal bảo mật. |

**Findings:**

<details><summary><strong>API-01 · 🟠 HIGH — </strong> — Không có rate limiting trên đăng nhập, đăng ký và tải tài liệu</summary>

- **Sub-tiêu chí:** Rate limiting · **Effort:** M
- **Bằng chứng:** src/server/auth-actions.ts:98 loginAction và :38 registerAction không có bất kỳ giới hạn tần suất nào; src/server/download-actions.ts:13 requestDownloadUrl và src/app/api/reports/[id]/view/route.ts:26 / download/route.ts:25 cũng vậy. grep toàn bộ src/ cho 'rate.?limit|throttle|429|upstash' trả về RỖNG. auth.ts:31 authorize() chạy argon2 verifyPassword mỗi lần đăng nhập.
- **Tác động:** Kẻ tấn công có thể brute-force mật khẩu không giới hạn (mỗi lần thử kích hoạt argon2 tốn CPU), dò email tồn tại qua thông điệp 'Email này đã được đăng ký' (auth-actions.ts:69), và spam endpoint download/view để ép server sinh PDF watermark (pdf-lib embedFont trên mọi trang) làm cạn CPU. Với một portal private-wealth institutional, đây là lỗ hổng bảo mật/khả dụng thực sự.
- **Khuyến nghị:** Thêm rate limiter (ví dụ token-bucket theo IP+email cho login/register, theo userId cho download/view) — có thể dùng @upstash/ratelimit hoặc một bảng/Redis đếm in-house. Ưu tiên login (chống brute-force) và download/view (chống lạm dụng sinh PDF). Trả 429 với Retry-After.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>API-02 · 🟡 MEDIUM</strong> — Không có timeout cho thao tác streaming và sinh PDF watermark</summary>

- **Sub-tiêu chí:** Timeout strategy · **Effort:** M
- **Bằng chứng:** src/app/api/reports/[id]/view/route.ts:46 getWatermarkedKey() và :94 storage.getStream() chạy không có timeout; src/lib/watermark.ts:33-78 stamp() load PDF, embedFont subset và drawText trên TỪNG trang đồng bộ. Không có maxDuration ở bất kỳ route nào (grep 'maxDuration' = none) và không có AbortController.
- **Tác động:** Một PDF gốc lớn/độc hại hoặc nhiều trang có thể khiến stamp() chạy rất lâu, giữ request và worker treo vô thời hạn (slow-DoS). Stream file lớn không có giới hạn thời gian cũng có thể giữ kết nối. Trong môi trường standalone/Docker không có CDN che chắn, điều này ảnh hưởng trực tiếp tới khả dụng.
- **Khuyến nghị:** Đặt route segment config maxDuration cho các route PDF; bọc stamp()/getWatermarkedKey trong Promise.race với timeout; cân nhắc giới hạn số trang/kích thước PDF tối đa khi sinh watermark.

</details>

<details><summary><strong>API-03 · 🟡 MEDIUM</strong> — Truy vấn danh sách admin không giới hạn (findMany không có take)</summary>

- **Sub-tiêu chí:** Pagination · **Effort:** M
- **Bằng chứng:** src/server/reports.ts:64 listAdminReports findMany không có take; src/server/admin-data.ts:10 listAccounts findMany không take; admin-data.ts:32 listGroupsWithEntitlements findMany không take, lại còn include lồng entitlements→report→translations (N+1 dữ liệu lớn). Call site admin/reports/page.tsx:58, admin/accounts/page.tsx:52 render toàn bộ trong một bảng.
- **Tác động:** Khi số tài khoản/báo cáo/nhóm tăng (institutional có thể hàng nghìn), mỗi lần mở trang admin sẽ kéo toàn bộ bản ghi kèm quan hệ lồng — tăng độ trễ, tải DB và bộ nhớ RSC, cuối cùng có thể timeout. Không có cơ chế phân trang nào trên các bảng này.
- **Khuyến nghị:** Thêm keyset/offset pagination cho listAdminReports, listAccounts, listGroupsWithEntitlements (tái dùng pattern keyset đã có ở listVisibleReports); giới hạn include và lazy-load entitlements khi mở rộng nhóm.

</details>

<details><summary><strong>API-04 · 🟡 MEDIUM</strong> — Pagination keyset đã có nhưng UI không bao giờ dùng nextCursor</summary>

- **Sub-tiêu chí:** Pagination · **Effort:** M
- **Bằng chứng:** src/lib/authz.ts:51-90 listVisibleReports trả {items, nextCursor} với keyset chuẩn trên (publishedAt,id). Nhưng call site src/app/[locale]/(client)/reports/page.tsx:55 chỉ destructure `{ items }` với take:24 và bỏ nextCursor; portal/page.tsx tương tự. Không có nút 'tải thêm' hay truyền cursor.
- **Tác động:** Client chỉ thấy tối đa 24 tài liệu mới nhất; tài liệu thứ 25 trở đi không thể truy cập qua thư viện dù người dùng được cấp quyền — vừa là lỗi chức năng vừa lãng phí hạ tầng pagination đã viết đúng. Với portal phân phối tài liệu định kỳ, danh mục sẽ vượt 24 nhanh chóng.
- **Khuyến nghị:** Hiển thị và sử dụng nextCursor: thêm nút 'Tải thêm' hoặc infinite scroll truyền cursor vào listVisibleReports; hoặc tối thiểu tăng take và cảnh báo khi còn dữ liệu.

</details>

<details><summary><strong>API-05 · 🟡 MEDIUM</strong> — Server Actions ghi dữ liệu không bắt lỗi — ZodError/Forbidden ném ra error boundary chung</summary>

- **Sub-tiêu chí:** Error handling · **Effort:** M
- **Bằng chứng:** src/server/accounts.ts:38 approveAccount gọi idSchema.parse() (ném ZodError nếu sai) và setStatus() gọi requireRole() (ném ForbiddenError, rbac.ts:28); src/server/entitlements.ts:23-25 grantEntitlement cũng .parse() trực tiếp. Không action FormData nào có try/catch (chỉ auth-actions.ts:112 có). Lỗi bubble tới src/app/[locale]/error.tsx hiển thị 'Đã xảy ra sự cố' chung chung.
- **Tác động:** Người dùng staff không phân biệt được lỗi quyền (403) với lỗi hệ thống/dữ liệu sai; toàn bộ trang sập sang error boundary thay vì hiển thị thông báo inline. Ngược lại, các action này không trả về state có cấu trúc như loginAction/registerAction (AuthFormState) → API không nhất quán và UX kém cho hành động quản trị quan trọng.
- **Khuyến nghị:** Chuẩn hoá: cho các action ghi trả về một ActionState {status, message} tương tự AuthFormState; bắt ZodError → thông báo validation, ForbiddenError → 403 thân thiện; ghi log lỗi hệ thống còn lại.

</details>

<details><summary><strong>API-06 · ⚪ LOW</strong> — Shape phản hồi của Route Handlers không nhất quán và lẫn ngôn ngữ</summary>

- **Sub-tiêu chí:** API consistency · **Effort:** S
- **Bằng chứng:** src/app/api/reports/[id]/view/route.ts trả new Response('Unauthorized',401)/'Not found',404/'Forbidden',403 (text tiếng Anh) nhưng :51 'Tài liệu chưa có tệp PDF.' (tiếng Việt); download/route.ts tương tự; trong khi src/app/api/health/route.ts:10 dùng Response.json({status}). Không có envelope lỗi chung.
- **Tác động:** Body lỗi vừa text vừa JSON, vừa Anh vừa Việt — khó parse phía client, khó hiển thị thông điệp localized, và lộ một phần logic (phân biệt 401/403/404 bằng văn bản). Không nghiêm trọng nhưng làm giảm chất lượng API cho một sản phẩm Vietnamese-first.
- **Khuyến nghị:** Thống nhất một envelope lỗi (JSON {error, code}) cho route trả lỗi, hoặc tối thiểu đồng nhất ngôn ngữ tiếng Việt và mã trạng thái; tách helper jsonError(status, code).

</details>

<details><summary><strong>API-07 · ⚪ LOW</strong> — React Query được wire toàn cục nhưng không có call site nào — hạ tầng client chết</summary>

- **Sub-tiêu chí:** Retry strategy · **Effort:** S
- **Bằng chứng:** src/app/providers.tsx:12-14 bọc QueryClientProvider, src/lib/get-query-client.ts:17 đặt staleTime 60s, nhưng grep 'useQuery|useMutation' toàn src/ chỉ trả về chính getQueryClient — KHÔNG có useQuery/useMutation/retry nào. Mọi data fetch đều là RSC/Server Action; handleDownload (pdf-viewer.tsx:664) tự gọi action, không retry.
- **Tác động:** @tanstack/react-query là dependency và provider runtime thừa, không cung cấp retry/caching/timeout thực tế nào — gây hiểu nhầm rằng có chiến lược retry. Thao tác mạng phía client (download) không có retry/timeout, chỉ hiện toast lỗi.
- **Khuyến nghị:** Hoặc gỡ React Query nếu không dùng (giảm bundle/độ phức tạp), hoặc dùng nó cho các tương tác client (download, danh sách phân trang) với retry/backoff và timeout hợp lý.

</details>

<details><summary><strong>API-08 · ⚪ LOW</strong> — listAuditLog giới hạn cứng (50/80) không có cursor — lịch sử kiểm toán bị cắt âm thầm</summary>

- **Sub-tiêu chí:** Pagination · **Effort:** M
- **Bằng chứng:** src/server/admin-data.ts:62 listAuditLog(take = 50) với findMany take cố định; call site admin/audit/page.tsx:56 gọi listAuditLog(80). Không có cursor/nextPage; UI chỉ in events.length (audit/page.tsx:76) như thể đó là tổng.
- **Tác động:** Nhật ký kiểm toán — bằng chứng tuân thủ cho ai duyệt tài khoản/cấp quyền/phát hành — chỉ xem được 80 sự kiện gần nhất; các sự kiện cũ hơn không thể truy xuất qua UI. Với portal institutional cần audit trail đầy đủ, đây là hạn chế tuân thủ.
- **Khuyến nghị:** Thêm phân trang (cursor theo createdAt,id) cho audit log và bộ lọc theo action/khoảng thời gian; hiển thị tổng số thực thay vì độ dài trang.

</details>

**Điểm mạnh:**

- ✅ Tách kiến trúc đúng chuẩn Next.js 15: ghi dữ liệu qua Server Actions ('use server'), streaming PDF qua Route Handlers runtime nodejs, tránh đẩy PDF qua Server Actions (next.config bodySizeLimit 1mb) — đúng như blueprint §9.
- ✅ Cache-Control: private, no-store đặt chính xác trên cả /view (view/route.ts:59) và /download (download/route.ts:81); health route force-dynamic; mọi trang gated đều export dynamic='force-dynamic' — không rò rỉ tài liệu qua cache.
- ✅ Authorization re-check ở mọi tầng dữ liệu: canViewReport (authz.ts:15) là single fn dùng EXISTS tương quan tránh nhân dòng; download route re-validate token + status + entitlement (defense in depth, download/route.ts:33-54); requireFreshUser đọc lại DB cho hành động nhạy cảm.
- ✅ Validation đầu vào nhất quán bằng Zod ở mọi nơi: cuid cho id, schema cho FormData/searchParams, và xử lý Range header đúng (206/416) cho pdf.js (view/route.ts:72-92).
- ✅ listVisibleReports (authz.ts:51) triển khai keyset pagination đúng trên (publishedAt,id) với take+1 để suy ra hasMore và nextCursor — nền tảng pagination tốt (dù UI chưa tận dụng).
- ✅ Download token một lần dùng, atomic single-use qua updateMany với điều kiện consumedAt:null (download-token.ts:50-54) — chống replay token tốt; clientIp xử lý x-forwarded-for/x-real-ip hợp lý.

---

### 6.14 Dependencies — 68/100 (C)

Cây phụ thuộc của Blackcrest nhìn chung gọn gàng và hiện đại (Next 15.5, React 19, Prisma 6, next-intl 4), nhưng có hai vấn đề nổi cộm cho một portal tài sản bảo mật-trước-tiên: next-auth bị ghim cứng ở bản BETA 5.0.0-beta.31 nằm ngay trên đường xác thực sản xuất, và có dependency thừa rõ ràng (zustand hoàn toàn không được import; @tanstack/react-query chỉ mount provider mà không có consumer nào). pnpm audit --prod báo 1 lỗ hổng moderate (postcss <8.5.10 XSS) qua transitive, và pnpm outdated cho thấy nhiều gói lệch major (zod 3→4, prisma 6→7, jose 5→6, next 15→16). Không có lockfile cố định bản beta vào range an toàn và không có CI để bắt drift là rủi ro vận hành dài hạn.

| Sub-tiêu chí | Điểm | Trạng thái | Ghi chú |
|---|:---:|:---:|---|
| Package health | 4/5 | strong | Toàn bộ gói đều là thư viện chủ lực, được duy trì tích cực, không có gói bỏ hoang/deprecated. argon2 + jose + prisma đều là lựa chọn lành mạnh cho hạ tầng bảo mật. |
| Package versions | 3/5 | adequate | Phần lớn dùng caret range hợp lý và resolve ra bản mới (next 15.5.19, prisma 6.19), nhưng next-auth bị ghim CỨNG vào một bản beta số (5.0.0-beta.31), không cho phép vá an ninh tự động. |
| Dependency updates | 3/5 | adequate | pnpm outdated cho thấy nhiều lệch major: zod 3→4, @prisma/client 6→7, jose 5→6, next 15→16, lucide 0.468→1.18, tailwind-merge 2→3, typescript 5→6. Không có CI/Renovate để theo dõi drift. |
| Security audits | 3/5 | adequate | pnpm audit --prod chạy được: 1 lỗ hổng moderate (postcss <8.5.10 XSS, GHSA-qx2v-qp2m-jg93) qua transitive next/next-auth/next-intl. Không có lỗ high/critical, nhưng không có audit tự động trong pipeline (không CI). |
| Unused dependencies | 2/5 | weak | zustand 5 khai báo nhưng KHÔNG có import nào trong src; @tanstack/react-query mount provider nhưng KHÔNG có useQuery/useMutation/prefetch/hydration nào — gói client thừa, tăng bundle vô ích. |
| Bundle impact | 3/5 | adequate | icon.tsx import 81 icon từ lucide-react mà không có experimental.optimizePackageImports trong next.config.ts; react-query runtime ship xuống client dù không dùng. Next App Router tree-shake giảm nhẹ tác động nhưng vẫn có dư thừa. |
| Pre-release/beta risk | 2/5 | weak | next-auth 5.0.0-beta.31 là BETA chạy trên đường auth sản xuất của một portal tài sản — đây là rủi ro lớn nhất của dimension này. @auth/core@0.41.2 (pre-1.0) cũng là transitive pre-release. |

**Findings:**

<details><summary><strong>DEP-01 · 🟠 HIGH — </strong> — next-auth bị ghim cứng vào bản BETA trên đường xác thực sản xuất</summary>

- **Sub-tiêu chí:** Pre-release/beta risk · **Effort:** L
- **Bằng chứng:** package.json:31 "next-auth": "5.0.0-beta.31" (ghim cứng, không có dấu ^). pnpm ls xác nhận resolve next-auth@5.0.0-beta.31 và transitive @auth/core@0.41.2 (pnpm-lock.yaml:94 '@auth/core@0.41.2'). Gói này là lõi auth: src/auth.ts:1 `import NextAuth, { CredentialsSignin } from "next-auth"`, src/middleware.ts:1 `import NextAuth from "next-auth"`, src/auth.config.ts:1 `import type { NextAuthConfig } from "next-auth"`.
- **Tác động:** Toàn bộ xác thực, phiên đăng nhập và bảo vệ route của một portal tài sản tư nhân phụ thuộc vào API beta chưa ổn định. Beta của Auth.js v5 có lịch sử breaking changes giữa các bản beta và có thể chứa lỗi bảo mật chưa được hỗ trợ chính thức. Ghim cứng vào một số beta cụ thể nghĩa là không nhận được bản vá an ninh trừ khi bump thủ công.
- **Khuyến nghị:** Coi đây là rủi ro launch cấp cao: theo dõi sát release của Auth.js v5, lên kế hoạch nâng lên bản stable ngay khi v5 GA và thêm regression test cho luồng login/middleware/RBAC trước khi nâng. Trong ngắn hạn, kiểm thử kỹ session/JWT và CredentialsSignin trên chính bản beta đang dùng; tài liệu hóa quyết định chấp nhận rủi ro beta.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>DEP-04 · 🟡 MEDIUM</strong> — Lỗ hổng moderate postcss <8.5.10 (XSS) qua transitive</summary>

- **Sub-tiêu chí:** Security audits · **Effort:** S
- **Bằng chứng:** pnpm audit --prod báo: moderate — 'PostCSS has XSS via Unescaped </style> in its CSS Stringify Output', Vulnerable versions <8.5.10, Patched >=8.5.10, Paths .>next>postcss / .>next-auth>next>postcss / .>next-intl>next>postcss, GHSA-qx2v-qp2m-jg93. Tổng: 1 vulnerability (1 moderate).
- **Tác động:** postcss đến qua next/next-auth/next-intl. Bề mặt khai thác chủ yếu ở build-time/CSS processing nên rủi ro runtime thấp cho portal này, nhưng vẫn là một advisory đang mở trong cây production và sẽ bị mọi scan an ninh đánh dấu.
- **Khuyến nghị:** Nâng next lên bản kéo theo postcss >=8.5.10 (next 15.5.x mới hoặc dòng 16), hoặc thêm pnpm overrides để ép postcss>=8.5.10. Kiểm tra lại bằng pnpm audit --prod sau khi vá. Lý tưởng nhất là gắn audit vào pipeline (hiện không có CI).

</details>

<details><summary><strong>DEP-05 · 🟡 MEDIUM</strong> — Nhiều dependency lệch major chưa nâng (zod 3→4, prisma 6→7, jose 5→6, next 15→16)</summary>

- **Sub-tiêu chí:** Dependency updates · **Effort:** M
- **Bằng chứng:** pnpm outdated: @prisma/client 6.19.3→7.8.0, prisma(dev) 6.19.3→7.8.0, jose 5.10.0→6.2.3, next 15.5.19→16.2.9, zod 3.25.76→4.4.3, tailwind-merge 2.6.1→3.6.0, typescript(dev) 5.9.3→6.0.3, lucide-react 0.468.0→1.18.0, @types/node(dev) 22.19.21→25.9.3. package.json:37 "zod": "^3.24.1", :28 "jose": "^5.9.6", :25 "@prisma/client": "^6.10.0".
- **Tác động:** Lệch major tích lũy làm việc nâng cấp sau này tốn kém và rủi ro hơn (zod 4 và prisma 7 có breaking changes đáng kể). jose và prisma nằm trên đường bảo mật (JWT download-token, truy vấn entitlement) nên việc tụt lại nhiều major có thể bỏ lỡ cải tiến/vá. Không có CI nghĩa là drift sẽ âm thầm tăng.
- **Khuyến nghị:** Lập lịch nâng cấp có kiểm soát: ưu tiên gói trên đường bảo mật (jose, prisma) trước; đánh giá zod 4 và prisma 7 migration guide trong môi trường dev có typecheck/build. Lưu ý @types/node nên giữ ở dòng 22 khớp Node 22 runtime (KHÔNG nhảy lên 25). Cân nhắc thêm Renovate/Dependabot khi dự án vào git.

</details>

<details><summary><strong>DEP-02 · ⚪ LOW</strong> — zustand được khai báo nhưng hoàn toàn không được sử dụng</summary>

- **Sub-tiêu chí:** Unused dependencies · **Effort:** S
- **Bằng chứng:** package.json:38 "zustand": "^5.0.2". grep toàn repo (loại trừ node_modules/.next): không có một import/usage nào của 'zustand' trong src (exit code 1, không khớp). Chỉ xuất hiện trong pnpm-lock.yaml:1367 zustand@5.0.14.
- **Tác động:** Dependency rác làm phình lockfile và bề mặt phụ thuộc, gây hiểu nhầm về kiến trúc state (gợi ý có client store trong khi không có). Không có tác động bảo mật trực tiếp nhưng làm tăng diện tích cần audit và bảo trì.
- **Khuyến nghị:** Gỡ zustand khỏi package.json và chạy lại pnpm install để dọn lockfile, hoặc bổ sung store thực sự nếu có kế hoạch dùng. Với một portal đa phần RSC server-first, nhiều khả năng nên gỡ.

</details>

<details><summary><strong>DEP-03 · ⚪ LOW</strong> — @tanstack/react-query chỉ mount provider, không có consumer nào</summary>

- **Sub-tiêu chí:** Unused dependencies · **Effort:** S
- **Bằng chứng:** package.json:26 "@tanstack/react-query": "^5.62.7". Provider có thật: src/app/providers.tsx:3 `import { QueryClientProvider } from "@tanstack/react-query"`, mount tại src/app/[locale]/layout.tsx:42 `<Providers>{children}</Providers>`. Nhưng grep useQuery/useMutation/useInfiniteQuery/prefetchQuery/dehydrate/HydrationBoundary trong src chỉ trả về src/lib/get-query-client.ts:18 (config 'dehydrate' nội bộ) — KHÔNG có lệnh gọi hook hay prefetch thực tế nào.
- **Tác động:** Runtime React Query được ship xuống client (provider bọc toàn bộ app) nhưng không phục vụ chức năng nào — tăng kích thước bundle client và độ phức tạp mà không có lợi ích. Với mục tiêu UI tinh gọn và bảo mật, đây là chi phí thừa.
- **Khuyến nghị:** Hoặc gỡ @tanstack/react-query + Providers/get-query-client nếu kiến trúc server-first không cần fetch phía client, hoặc triển khai thực sự các query/mutation (ví dụ cho lifecycle approve/reject hiện đang toast-only). Đừng giữ provider trống.

</details>

<details><summary><strong>DEP-06 · ⚪ LOW</strong> — lucide-react: 81 icon import tĩnh, thiếu optimizePackageImports</summary>

- **Sub-tiêu chí:** Bundle impact · **Effort:** S
- **Bằng chứng:** src/components/icon.tsx:1-84 import 81 named icon từ "lucide-react" trong một module. next.config.ts không có experimental.optimizePackageImports (grep optimizePackageImports/modularizeImports: không khớp). lucide-react là client component (icon map).
- **Tác động:** Dù Next App Router + ESM của lucide tree-shake khá tốt, việc gom 81 icon và thiếu optimizePackageImports khiến bundle client lớn hơn cần thiết và build có thể chậm hơn. Không nghiêm trọng nhưng đi ngược mục tiêu UI tinh gọn.
- **Khuyến nghị:** Thêm experimental.optimizePackageImports: ['lucide-react'] vào next.config.ts để Next tự barrel-optimize; cân nhắc chỉ import các icon thực sự dùng. Kiểm chứng tác động bằng next build (bundle analyzer) trước/sau.

</details>

**Điểm mạnh:**

- ✅ Bộ dependency hiện đại và phù hợp mục đích: Next 15.5 App Router, React 19, Prisma 6, next-intl 4, TanStack Query 5 — đều là các bản gần đỉnh dòng major.
- ✅ Lựa chọn thư viện bảo mật lành mạnh: @node-rs/argon2 cho hashing, jose cho JWT one-time download token, @auth/prisma-adapter — đúng chuẩn cho một portal bảo mật-trước-tiên.
- ✅ pnpm audit --prod sạch về high/critical: chỉ 1 lỗ hổng moderate transitive (postcss), không có lỗ hổng nghiêm trọng trong cây production.
- ✅ Cấu hình runtime chuẩn cho gói native/nặng: next.config.ts khai báo serverExternalPackages cho @node-rs/argon2, pdf-lib, @pdf-lib/fontkit — tránh bundle nhầm các gói chỉ chạy Node vào client.
- ✅ Lockfile pnpm cố định (pnpm-lock.yaml, packageManager pin pnpm@11.7.0 kèm sha512) đảm bảo cài đặt tái lập, giảm rủi ro supply-chain drift.

---

### 6.15 Code Quality — 72/100 (B)

Code Quality của Blackcrest ở mức khá tốt cho một MVP: TypeScript được dùng nghiêm túc (strict:true, không có một `any` nào, không `@ts-ignore`/`eslint-disable`), naming nhất quán, comment có chất lượng cao và bám sát blueprint, các module lib/server nhỏ gọn và tách lớp rõ ràng. Tuy nhiên thiếu hoàn toàn ESLint/Prettier (không có hàng rào tự động nào ép style/bắt lỗi) là một rủi ro thực sự cho team, và tồn tại nợ kỹ thuật đáng kể: react-query + zustand là dependency CHẾT (0 usage), thư mục src/stores rỗng, một số UI primitive (Switch, Tag) không ai dùng, file pdf-viewer.tsx 1243 dòng là điểm nóng độ phức tạp, vòng đời approve/reject chỉ là TOAST giả lập không persist, và pattern xử lý lỗi trong Server Action không thống nhất (3 kiểu khác nhau). Đáng chú ý: file watermark được cache theo (reportId+userId) nhưng không có cơ chế vô hiệu hoá khi PDF gốc thay đổi — món nợ kỹ thuật ảnh hưởng trực tiếp tới tính đúng đắn của tài liệu mật.

| Sub-tiêu chí | Điểm | Trạng thái | Ghi chú |
|---|:---:|:---:|---|
| Code style | 3.5/5 | adequate | Style rất nhất quán dù KHÔNG có linter: cùng kiểu import, cùng style component, JSDoc đồng đều. Nhược điểm: nhất quán này phụ thuộc kỷ luật thủ công, không có gì ép buộc. |
| Linting | 1/5 | weak | Không có .eslintrc dù package.json có script `lint`=`next lint`. Không có rule nào bắt unused imports/vars, exhaustive-deps, no-floating-promises. Rủi ro thực với portal bảo mật. |
| Formatting | 1.5/5 | weak | Không có Prettier config. Format hiện đẹp nhưng hoàn toàn thủ công; không có `format`/`format:check` script, không CI gác cổng. |
| Complexity | 3/5 | adequate | Phần lib/server gọn (đa số <100 dòng). Điểm nóng: pdf-viewer.tsx 1243 dòng gộp ~10 component + state + IO; page.tsx public 536 dòng. |
| Duplication | 2.5/5 | adequate | STATUS_TONE/STATUS_KEY/STATUS_LABEL bị định nghĩa lại ở 5 file; pattern `setRequestLocale+session!.user+getTranslations` lặp ở 6 page; `Readable.toWeb(...) as ReadableStream` + clientIp lặp giữa 2 route. |
| Dead code | 2/5 | weak | react-query (useQuery=0) và zustand (src/stores rỗng, 0 import) là dependency chết; UI primitive Switch & Tag không ai dùng nhưng vẫn export qua barrel. |
| Naming conventions | 4.5/5 | strong | Naming rõ ràng và đúng chuẩn: PascalCase component, camelCase hàm, SCREAMING_SNAKE hằng số, tên hàm authz (canViewReport, requireFreshUser) tự mô tả tốt. |
| TypeScript quality | 4/5 | strong | strict:true, KHÔNG một `any`, không @ts-ignore/eslint-disable, dùng Prisma types + zod tốt. Trừ điểm: `session!.user` (non-null !) ở 6 page, vài `as ReadableStream`/`as HTMLElement`, type ReportStatus định nghĩa lại tay trong pdf-viewer thay vì dùng @prisma/client. |
| Error handling | 3/5 | adequate | lib có try/catch hợp lý (audit nuốt lỗi CÓ CHỦ Ý + log; verifyPassword fail-safe). Nhưng Server Action không thống nhất: download-actions trả {error}, auth-actions trả AuthFormState, entitlements dùng z.parse() ném lỗi thô. |
| Logging strategy | 2.5/5 | adequate | Chỉ 3 chỗ console.* (2 trong audit.ts có prefix [audit]/[access-log], 1 trong error.tsx). Không có logger có cấu trúc/level — chấp nhận được ở MVP nhưng chưa đủ cho điều tra rò rỉ tài liệu. |
| Inline documentation | 4/5 | strong | ~480/7089 dòng là comment; JSDoc bám blueprint (§F1, §6.1...) giải thích 'tại sao' rất tốt ở authz/watermark/download-token. Mật độ và chất lượng trên trung bình. |
| Technical debt | 2/5 | weak | Nợ rõ ràng: approve/reject chỉ toast không persist (pdf-viewer.tsx:957,982); total=5 trang hardcode; cache watermark không invalidate khi PDF gốc đổi; en/zh localize dở dang (Vietnamese hardcode); upload là placeholder. |

**Findings:**

<details><summary><strong>CQ-01 · 🟠 HIGH — </strong> — Vòng đời duyệt/từ chối báo cáo chỉ là TOAST giả lập, không hề persist</summary>

- **Sub-tiêu chí:** Technical debt · **Effort:** M
- **Bằng chứng:** src/app/[locale]/(client)/reports/[slug]/pdf-viewer.tsx:955-963 nút Phê duyệt chỉ `onClick={() => { setDialog(null); setToast("approved"); }}`; tương tự reject ở :980-987. SidePanel onApprove/onReject (:937-938) chỉ mở dialog. Không có server action nào đổi report.status; ô Input ghi chú duyệt (:966) và lý do từ chối (:991-994) không có name/không được submit đi đâu.
- **Tác động:** Tính năng cốt lõi của portal (draft→approve→publish) thực chất KHÔNG hoạt động: approver bấm 'Phê duyệt' nhưng DB không đổi, không ghi audit, không chuyển trạng thái. Với portal tài sản tư nhân đây là lỗ hổng quy trình nghiêm trọng, dễ gây hiểu lầm là đã duyệt.
- **Khuyến nghị:** Thay handler toast bằng Server Action thực (vd approveReport/rejectReport) gọi requireRole(APPROVER), cập nhật report.status trong transaction, ghi logAudit, và lưu nội dung ô ghi chú/lý do. Dùng useActionState để phản hồi lỗi thay vì toast cứng.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>CQ-02 · 🟡 MEDIUM</strong> — react-query và zustand là dependency CHẾT — hạ tầng không dùng tới</summary>

- **Sub-tiêu chí:** Dead code · **Effort:** S
- **Bằng chứng:** grep `useQuery|useMutation|useInfiniteQuery` toàn src = 0 kết quả; react-query chỉ được wire trong src/app/providers.tsx:14 (QueryClientProvider) + src/lib/get-query-client.ts. zustand: src/stores/ RỖNG (chỉ có thư mục), grep `@/stores` không có importer nào, package.json:dependencies có "zustand":"^5.0.2".
- **Tác động:** Hai thư viện client-state lớn được cài + (với react-query) khởi tạo provider nhưng không phục vụ logic nào — tăng bundle, gây hiểu nhầm về kiến trúc cho người mới, và là tín hiệu scaffolding chưa dọn. Không phải lỗi an ninh nhưng là nợ kỹ thuật rõ ràng.
- **Khuyến nghị:** Quyết định dứt khoát: hoặc dùng thật (chuyển fetch report sang react-query, chuyển UI state như zoom/panel của pdf-viewer sang zustand) hoặc gỡ cả zustand, xoá src/stores rỗng và cân nhắc gỡ react-query+providers nếu không có kế hoạch dùng client cache.

</details>

<details><summary><strong>CQ-03 · 🟡 MEDIUM</strong> — Thiếu hoàn toàn ESLint và Prettier — không có hàng rào chất lượng tự động</summary>

- **Sub-tiêu chí:** Linting · **Effort:** M
- **Bằng chứng:** Không tồn tại .eslintrc*/eslint.config.* và không có .prettierrc trong repo (chỉ có script `lint`:`next lint` trong package.json nhưng không có config kèm). Không git, không CI nên cũng không có gác cổng nào khác.
- **Tác động:** Không có gì tự động bắt unused vars/imports (vd Switch, Tag, react-query chết lọt qua), thiếu rule react-hooks/exhaustive-deps (useEffect ở pdf-viewer.tsx:714 chỉ phụ thuộc [total] dù dùng pages), no-floating-promises (void logReportAccess đúng nhưng không được kiểm), và không ép format. Chất lượng hiện dựa hoàn toàn vào kỷ luật người viết.
- **Khuyến nghị:** Thêm eslint.config.mjs (flat config) với next/core-web-vitals + @typescript-eslint (bật no-floating-promises, no-unused-vars, exhaustive-deps), thêm Prettier + script `format`/`format:check`. Vì chưa có CI, tối thiểu chạy `pnpm lint` trong quy trình build.

</details>

<details><summary><strong>CQ-04 · 🟡 MEDIUM</strong> — pdf-viewer.tsx 1243 dòng — điểm nóng độ phức tạp, trộn nhiều trách nhiệm trong một file client</summary>

- **Sub-tiêu chí:** Complexity · **Effort:** M
- **Bằng chứng:** src/app/[locale]/(client)/reports/[slug]/pdf-viewer.tsx dài 1243 dòng (file lớn nhất repo), gộp: 5 component trang giả lập (CoverPage/SummaryPage/PerformancePage/AllocationPage/NotesPage), các primitive nội bộ (Watermark/PageFrame/H/P/Eyebrow/MetaRow), component PdfViewer (8 useState, IntersectionObserver, download IO) và SidePanel (timeline). Số liệu KPI/biểu đồ hardcode (vd :292-296, :346-355).
- **Tác động:** Khó đọc, khó test, khó tái sử dụng; toàn bộ nội dung 'PDF' là markup giả lập cứng trong component thay vì render PDF thật — vừa là độ phức tạp vừa là nợ kỹ thuật (đúng với ghi chú 'visual recreation, no real PDF renderer' ở :77-78).
- **Khuyến nghị:** Tách các trang giả lập sang module riêng (vd ./report-pages.tsx), tách SidePanel ra file riêng, đưa STATUS_LABEL/STATUS_TONE vào module dùng chung. Dài hạn thay markup giả bằng pdf.js render từ endpoint /view đã có.

</details>

<details><summary><strong>CQ-05 · ⚪ LOW</strong> — Bản đồ STATUS_* và prelude page bị nhân bản nhiều nơi</summary>

- **Sub-tiêu chí:** Duplication · **Effort:** S
- **Bằng chứng:** STATUS_TONE/STATUS_KEY/STATUS_LABEL được định nghĩa lại ở 5 file: admin/reports/page.tsx:13-30, admin/accounts/page.tsx, (client)/reports/page.tsx, (client)/portal/page.tsx:21-38, pdf-viewer.tsx:58-73. Pattern `const {locale}=await params; setRequestLocale(locale); const session=await auth(); const user=session!.user;` lặp gần như nguyên văn ở 6 page (vd portal/page.tsx:84-88, admin/reports/page.tsx:45-49).
- **Tác động:** Sửa một mapping/quy ước phải sửa nhiều chỗ, dễ lệch (đã thấy: ARCHIVED map 'neutral' nhưng key 'archived' lặp lại tay mỗi file). Tăng bề mặt lỗi cho lớp hiển thị trạng thái — quan trọng với portal có lifecycle.
- **Khuyến nghị:** Đưa STATUS_TONE/STATUS_KEY/STATUS_LABEL vào một module dùng chung (vd src/lib/report-status.ts). Tạo helper RSC (vd getPageUser(locale)) gói setRequestLocale + auth + ép kiểu user để loại bỏ lặp và bỏ `session!`.

</details>

<details><summary><strong>CQ-06 · ⚪ LOW</strong> — Lạm dụng non-null assertion `session!.user` ở 6 page thay vì kiểm tra tường minh</summary>

- **Sub-tiêu chí:** TypeScript quality · **Effort:** S
- **Bằng chứng:** `const user = session!.user;` ở entitlements/page.tsx:26, audit/page.tsx:50, accounts/page.tsx:43, reports/page.tsx:49 (admin), portal/page.tsx:88, reports/page.tsx:48 (client). Trong khi route handler (view/route.ts:31) và lib/rbac.ts:21 lại kiểm tra `session?.user?.id` đúng cách.
- **Tác động:** `!` vô hiệu hoá lợi ích của strict null-check: nếu một layout/middleware đổi đảm bảo auth, các page này sẽ ném TypeError runtime thay vì lỗi biên dịch. Không nhất quán với lớp data đã làm đúng. Mức thấp vì layout (admin)/(client) hiện đã chặn truy cập.
- **Khuyến nghị:** Dùng helper requireAuth() (đã có trong lib/rbac.ts) tại đầu mỗi page để vừa lấy user an toàn vừa loại `!`, hoặc ít nhất `if (!session?.user) notFound()`. Thống nhất với pattern của lib.

</details>

<details><summary><strong>CQ-07 · ⚪ LOW</strong> — Xử lý lỗi trong Server Action không thống nhất (3 pattern khác nhau)</summary>

- **Sub-tiêu chí:** Error handling · **Effort:** S
- **Bằng chứng:** download-actions.ts:13-29 trả kết quả có cấu trúc `{url}|{error}` và validate bằng safeParse. auth-actions.ts trả `AuthFormState` (idle/error/success). entitlements.ts:25 & :60 lại dùng `z....parse(...)` (ném ZodError thô) và requireRole ném ForbiddenError — không bắt, để nổi lên dạng lỗi 500/digest.
- **Tác động:** Form admin (grant/revoke entitlement) khi nhập sai sẽ ném lỗi không kiểm soát thay vì thông điệp tiếng Việt thân thiện như các action khác; trải nghiệm và khả năng quan sát không đồng đều. Không nguy hiểm an ninh nhưng là khoảng trống nhất quán.
- **Khuyến nghị:** Chuẩn hoá một quy ước trả lỗi cho Server Action (vd luôn trả ActionState với fieldErrors). Trong entitlements dùng safeParse + trả thông điệp, và bắt ForbiddenError để map sang phản hồi rõ ràng.

</details>

<details><summary><strong>CQ-08 · ⚪ LOW</strong> — Cache PDF watermark không có cơ chế vô hiệu hoá khi tệp gốc thay đổi</summary>

- **Sub-tiêu chí:** Technical debt · **Effort:** S
- **Bằng chứng:** src/lib/watermark.ts:29-31 key cache = `cache/wm/${reportId}/${userHash(userId)}.pdf` chỉ phụ thuộc reportId+userId; getWatermarkedKey:93-95 nếu `cached.exists` thì trả ngay, không so version/mtime với fileKey gốc. Comment :12-13 thừa nhận 'stamp once per user, not per request'.
- **Tác động:** Nếu một báo cáo được thay tệp PDF mới (re-upload, sửa nội dung) mà giữ nguyên reportId, người dùng đã từng xem sẽ tiếp tục nhận bản watermark CŨ vĩnh viễn — phục vụ nội dung sai cho tài liệu tài chính mật. Hiện rủi ro thấp vì upload còn là placeholder, nhưng sẽ thành lỗi đúng đắn khi upload hoàn thiện.
- **Khuyến nghị:** Đưa version/contentHash của fileKey gốc vào watermark key (vd `cache/wm/{reportId}/{fileHash}/{userHash}.pdf`) hoặc xoá cache watermark của report khi thay tệp. Ghi chú ràng buộc này cạnh flow upload.

</details>

<details><summary><strong>CQ-09 · 🔵 INFO</strong> — UI primitive Switch và Tag không được sử dụng nhưng vẫn export qua barrel</summary>

- **Sub-tiêu chí:** Dead code · **Effort:** S
- **Bằng chứng:** src/components/ui/index.ts export `./switch` và `./tag`; grep `\bSwitch\b`/`\bTag\b` ngoài file gốc = 0 importer. Hai file switch.tsx/tag.tsx tồn tại nhưng không có nơi tiêu thụ.
- **Tác động:** Code chết nhẹ trong design-system; không hại runtime (tree-shaking loại bỏ) nhưng làm tăng bề mặt bảo trì và gây nhầm 'đã dùng'. Không có linter nên không bị cảnh báo.
- **Khuyến nghị:** Hoặc dùng tới (vd Switch cho toggle ẩn/hiện, Tag cho category) hoặc đánh dấu rõ là 'thành phần dự phòng của DS'. Nếu giữ, ghi chú lý do để không bị coi là rác.

</details>

<details><summary><strong>CQ-10 · 🔵 INFO</strong> — Số liệu tài chính minh hoạ hardcode rải rác và total trang cứng = 5</summary>

- **Sub-tiêu chí:** Technical debt · **Effort:** S
- **Bằng chứng:** pdf-viewer.tsx truyền `total={5}` cứng cho mọi page (:686-691) và `<CoverPage total={5}>` dù `total = pages.length` đã tính ở :695. KPI hardcode ở SummaryPage (:292-296), bảng hiệu suất (:346-355), phân bổ (:486-492). portal/page.tsx:44-74 ghi rõ KPIS là 'ILLUSTRATIVE figures'.
- **Tác động:** Số liệu giả nằm lẫn trong UI sản xuất; với portal tài sản thật đây là nợ nội dung cần thay bằng dữ liệu thực trước khi go-live, dễ vô tình hiển thị số bịa cho nhà đầu tư. Mức info vì đã được chú thích là minh hoạ.
- **Khuyến nghị:** Tập trung mọi số minh hoạ vào một nguồn rõ ràng (vd /lib/demo-data) có cờ bật/tắt, dùng pages.length thay cho 5 cứng, và lập danh sách 'phải thay trước launch'.

</details>

**Điểm mạnh:**

- ✅ TypeScript được dùng rất nghiêm túc: tsconfig strict:true, KHÔNG một `any` nào trong toàn bộ src, không có @ts-ignore/@ts-expect-error/eslint-disable; tận dụng Prisma generated types và zod cho ranh giới dữ liệu.
- ✅ Tài liệu nội dòng chất lượng cao và giải thích 'tại sao': JSDoc bám blueprint (§F1, §6.1...) ở các module nhạy cảm như lib/authz.ts (giải thích vì sao dùng `some`→EXISTS), lib/download-token.ts (one-time/atomic), lib/watermark.ts.
- ✅ Naming convention sạch và nhất quán toàn dự án (PascalCase component, camelCase hàm, SCREAMING_SNAKE hằng); tên hàm authz tự mô tả: canViewReport, requireFreshUser, consumeDownloadToken.
- ✅ Phân lớp gọn gàng: lib/ (hạ tầng) và server/ (use-case) tách bạch, hầu hết file <110 dòng; lib/storage.ts định nghĩa StorageAdapter interface sạch để thay driver, lib/format.ts gom toàn bộ format vi-VN một chỗ.
- ✅ Xử lý lỗi ở lớp lib hợp lý và có chủ đích: audit nuốt lỗi NHƯNG vẫn console.error để không làm gãy nghiệp vụ chính (audit.ts:26-28), verifyPassword fail-safe trả false (password.ts:23-26), storage.stat bắt lỗi trả {exists:false}.
- ✅ Logging tuy tối giản nhưng sạch — chỉ 3 chỗ console.* và đều có prefix có ý nghĩa ([audit]/[access-log]), không có console.log rác rải rác trong code sản xuất.
- ✅ Style đồng đều một cách đáng ngạc nhiên dù KHÔNG có linter/formatter: cùng thứ tự import, cùng cách viết component, cùng quy ước comment-divider — cho thấy kỷ luật tác giả tốt.

---

### 6.16 Performance — 76/100 (B)

Kiến trúc server-first được tôn trọng tốt: chỉ 11/73 file là client component, AppShell/Icon/Avatar đều là RSC, font dùng next/font với subset vietnamese và display:swap, và truy vấn danh sách báo cáo dùng keyset pagination thực thụ (listVisibleReports). Đây là nền tảng performance vững cho một portal nội bộ tải nhẹ. Tuy nhiên có vài lãng phí rõ ràng: QueryClientProvider bọc toàn bộ cây ứng dụng nhưng KHÔNG có một useQuery/useMutation nào (dead weight client trên mọi trang), PDF "viewer" render 5 trang A4 hai lần (canvas + rail thumbnail) gây chi phí paint lớn, route streaming PDF không có khóa chống đua khi tạo watermark và không tận dụng cache trình duyệt. Không có next/dynamic, next/image, hay Lighthouse để đo CWV — phải suy luận từ code.

| Sub-tiêu chí | Điểm | Trạng thái | Ghi chú |
|---|:---:|:---:|---|
| Bundle size | 3/5 | adequate | RSC mặc định giữ JS client nhỏ, nhưng React Query + zustand được nạp toàn cục dù gần như không dùng (useQuery = 0). |
| Code splitting | 3/5 | adequate | Chỉ dựa vào route-level splitting của App Router; không có next/dynamic cho island nặng như PdfViewer. |
| Lazy loading | 2/5 | weak | Không có next/dynamic, React.lazy hay Suspense ở bất kỳ đâu; mọi client island nạp ngay khi route mount. |
| Tree shaking | 4/5 | strong | lucide-react import theo named export (tree-shakeable); icon barrel gom 90 icon nhưng chỉ icon dùng mới vào bundle mỗi route. |
| Render performance | 3/5 | adequate | PdfViewer render 5 trang A4 đầy đủ + 5 thumbnail (10 subtree) và áp CSS zoom lên container chứa tất cả trang. |
| Re-render analysis | 3/5 | adequate | template.tsx remount toàn bộ subtree mỗi lần điều hướng; pages dùng useMemo nhưng zoom/current state nằm cùng component gây re-render cả cây. |
| Network performance | 3/5 | adequate | Range/206 hỗ trợ tốt cho pdf.js, nhưng watermark không có khóa chống đua; mỗi request view vẫn auth+DB+stat lại. |
| Caching | 2/5 | weak | PDF trả Cache-Control: private, no-store nên mỗi lần cuộn/Range đều phải fetch lại; staleTime React Query vô nghĩa vì không dùng. |
| Image optimization | 3/5 | adequate | Hầu như không dùng ảnh raster (logo/icon là SVG inline); chỉ 1 thẻ <img> thô trong avatar (fallback, hiếm dùng). |
| Asset/font optimization | 4/5 | strong | next/font self-host + subset latin/vietnamese + display:swap; 2 TTF watermark (269KB) chỉ ở server, không gửi client. |
| Core Web Vitals | 3/5 | adequate | LCP/CLS được lợi từ font swap + RSC; rủi ro INP ở PdfViewer (zoom/scroll trên 5 trang A4) và FOUT do swap. |

**Findings:**

<details><summary><strong>PERF-01 · 🟡 MEDIUM</strong> — QueryClientProvider bọc toàn bộ app nhưng không có truy vấn React Query nào</summary>

- **Sub-tiêu chí:** Bundle size · **Effort:** S
- **Bằng chứng:** src/app/providers.tsx:11-16 bọc mọi trang trong <QueryClientProvider>; src/app/[locale]/layout.tsx:42 áp Providers cho toàn bộ cây. Nhưng grep toàn repo: 'useQuery|useMutation|useInfiniteQuery' = NONE. get-query-client.ts:16-17 đặt staleTime 60_000 vô tác dụng. Admin reports page (admin/reports/page.tsx) không có onClick/useState (server component thuần) — lý do 'interactive admin tables' để giữ React Query không tồn tại.
- **Tác động:** @tanstack/react-query (~12-15KB gzip) và toàn bộ provider tree được tải và hydrate trên MỌI trang (kể cả landing/login công khai) mà không phục vụ bất kỳ chức năng nào. Tăng JS client, tăng thời gian hydrate và TBT/INP không cần thiết cho một portal vốn nên cực nhẹ.
- **Khuyến nghị:** Gỡ QueryClientProvider khỏi root Providers; chỉ bọc cục bộ tại đúng client island nào thực sự dùng React Query khi tính năng đó ra đời (vd: admin table polling). Cân nhắc bỏ luôn dependency react-query khỏi bundle cho tới khi có usage thực.

</details>

<details><summary><strong>PERF-02 · 🟡 MEDIUM</strong> — PDF không cache phía trình duyệt (no-store) khiến pdf.js fetch lặp lại mỗi thao tác Range</summary>

- **Sub-tiêu chí:** Caching · **Effort:** M
- **Bằng chứng:** src/app/api/reports/[id]/view/route.ts:59 đặt "Cache-Control": "private, no-store" cho cả response 200 và 206 (kế thừa baseHeaders ở dòng 86-90). Route hỗ trợ Range/206 (dòng 72-92) nghĩa là client sẽ gửi nhiều request Range; với no-store mỗi request đều bỏ qua cache, chạy lại auth() + prisma.findUnique + canViewReport + getWatermarkedKey + storage.stat (dòng 30-54).
- **Tác động:** Mỗi lần người dùng cuộn/zoom làm pdf.js xin Range mới, server thực thi lại toàn bộ chuỗi auth + 2 truy vấn DB + stat file. Với tài liệu nhiều trang điều này nhân lên hàng chục lần/lượt xem, tăng tải DB và độ trễ cảm nhận khi cuộn (ảnh hưởng INP/responsiveness). no-store hoàn toàn (thay vì private,no-cache + ETag/revalidate) là quá tay cho nội dung đã watermark per-user và bất biến.
- **Khuyến nghị:** Đổi sang 'private, no-cache, max-age=0, must-revalidate' kèm ETag (vd hash của watermarkKey) để trình duyệt cache cục bộ nhưng vẫn revalidate; hoặc 'private, max-age=60' do bản watermark đã cố định per-user. Cân nhắc cache kết quả canViewReport ngắn hạn trong request.

</details>

<details><summary><strong>PERF-03 · 🟡 MEDIUM</strong> — Không có khóa chống đua khi tạo bản PDF watermark (thundering herd trên cache lạnh)</summary>

- **Sub-tiêu chí:** Network performance · **Effort:** M
- **Bằng chứng:** src/lib/watermark.ts:85-108 getWatermarkedKey: stat(key) (dòng 94) → nếu chưa có thì load base + stamp() + put() (dòng 100-106). Không có Map inflight/lock (grep 'inflight|lock|Map' = không có). stamp() (dòng 33-79) chạy pdf-lib embedFont subset + drawText cho TỪNG trang — CPU đáng kể. Vì view route hỗ trợ Range, pdf.js thường mở nhiều kết nối song song ngay lượt xem đầu.
- **Tác động:** Lượt xem đầu của một (report,user) trên cache lạnh: nhiều request Range song song cùng thấy cache miss và cùng chạy stamp() đắt đỏ trên một process Node single-thread, ghi đè lẫn nhau lên cùng key. Gây tăng vọt CPU/độ trễ và lãng phí công việc, đúng vào thời điểm TTFB của trang viewer quan trọng nhất.
- **Khuyến nghị:** Thêm in-flight promise map theo watermarkKey (dedupe trong cùng process) hoặc ghi ra file tạm rồi rename nguyên tử; lý tưởng nhất là pre-generate watermark khi cấp entitlement/publish thay vì lazy theo request đầu tiên.

</details>

<details><summary><strong>PERF-04 · 🟡 MEDIUM</strong> — Viewer render 5 trang A4 đầy đủ hai lần (canvas + thumbnail rail)</summary>

- **Sub-tiêu chí:** Render performance · **Effort:** M
- **Bằng chứng:** src/app/[locale]/(client)/reports/[slug]/pdf-viewer.tsx:868-878 render mọi page A4 (794×1123) trong canvas; dòng 807-854 render LẠI chính các phần tử đó (p.el) trong rail thumbnail, chỉ thu nhỏ bằng transform: scale(0.1208) (dòng 832). Toàn bộ container canvas còn bị áp style={{ zoom }} (dòng 866) lên cả 5 trang cùng lúc.
- **Tác động:** DOM của viewer gấp đôi (10 subtree A4 thay vì 5), tăng chi phí mount, layout và paint — đặc biệt thumbnail vẫn dựng DOM đầy đủ rồi mới scale (không tiết kiệm gì). CSS zoom trên container bọc tất cả trang buộc trình duyệt re-layout/repaint toàn bộ khi đổi mức zoom, gây giật khi zoom (rủi ro INP). Đây là surface 'crown-jewel' nên độ mượt rất đáng giá.
- **Khuyến nghị:** Render thumbnail bằng ảnh tĩnh/canvas snapshot hoặc placeholder nhẹ thay vì dựng lại JSX A4 đầy đủ. Áp transform: scale(zoom) (translate/scale, dùng GPU) thay cho property zoom; cân nhắc chỉ render trang đang/ sắp hiển thị (virtualize) khi số trang lớn hơn.

</details>

<details><summary><strong>PERF-05 · ⚪ LOW</strong> — template.tsx remount toàn bộ subtree trang trên mỗi lần điều hướng chỉ để fade-in</summary>

- **Sub-tiêu chí:** Re-render analysis · **Effort:** S
- **Bằng chứng:** src/app/[locale]/template.tsx:3-5 trả <div className="bc-page-enter">{children}</div>. File template.tsx (khác layout.tsx) khiến Next remount cây con mỗi lần đổi route; comment dòng 1-2 xác nhận 'Re-mounts on every navigation'. globals.css:186-188 chạy animation 200ms.
- **Tác động:** Mỗi lần điều hướng làm React tháo và dựng lại toàn bộ subtree trang thay vì tái dùng (không tận dụng được reconciliation/giữ state). Với các trang RSC nặng (admin/reports include translations+category cho mọi hàng) chi phí dựng lại + animation cộng vào INP/transition. Lợi ích thẩm mỹ nhỏ so với chi phí.
- **Khuyến nghị:** Cân nhắc bỏ template.tsx và làm fade-in bằng CSS thuần ở mức layout (vd animation gắn vào nội dung qua key của route mà không ép remount), hoặc giới hạn animation cho phần tử nhỏ. Đã có prefers-reduced-motion (globals.css:189-191) là tốt.

</details>

<details><summary><strong>PERF-06 · ⚪ LOW</strong> — Không dùng next/dynamic cho island nặng; thiếu lazy-load có chủ đích</summary>

- **Sub-tiêu chí:** Lazy loading · **Effort:** M
- **Bằng chứng:** grep toàn repo: 'next/dynamic', 'dynamic(', 'React.lazy', 'Suspense' = NONE. PdfViewer (client, ~1244 dòng, kéo theo Dialog/Tooltip/Toast/Tabs) được import tĩnh trong reports/[slug]/page.tsx:6 và render trực tiếp.
- **Tác động:** Toàn bộ JS của viewer (kể cả Dialog approval chỉ dùng cho staff, Tabs side-panel) nằm trong chunk route và phải parse/hydrate ngay khi mở trang, kể cả phần người dùng chưa tương tác tới. May là route-level splitting đã cô lập viewer khỏi các route khác, nên tác động giới hạn ở chính trang viewer.
- **Khuyến nghị:** Lazy-load các phần phụ ít dùng của viewer (vd dialog phê duyệt chỉ khi canApprove, side-panel) bằng next/dynamic với ssr:false hoặc Suspense; tách phần render trang ra khỏi phần toolbar để hydrate có ưu tiên.

</details>

<details><summary><strong>PERF-07 · ⚪ LOW</strong> — Font biến (variable) nạp nhiều weight + nguy cơ FOUT từ display:swap</summary>

- **Sub-tiêu chí:** Asset/font optimization · **Effort:** S
- **Bằng chứng:** src/app/fonts.ts:25-37 IBM_Plex_Mono nạp weight ['400','500','600'] (Plex Mono KHÔNG phải variable font nên là 3 file). Source_Serif_4 và Inter là variable nhưng tải dải weight mặc định. Tất cả dùng display:'swap' (dòng 21,28,36) với subset latin+vietnamese. Không khai báo preload tường minh hay adjustFontFallback.
- **Tác động:** 3 file Plex Mono + dải variable Source Serif làm tăng byte font tải về trên lần ghé đầu (ảnh hưởng LCP nếu tiêu đề serif là phần tử LCP). display:swap đảm bảo không chặn render nhưng gây FOUT (nhấp nháy font) → rủi ro CLS nhẹ nếu metric fallback lệch. Mức độ nhỏ vì font đã self-host và subset.
- **Khuyến nghị:** Giới hạn weight Plex Mono còn mức thực dùng (vd chỉ 400/600); cân nhắc preload font dùng cho LCP và đặt adjustFontFallback/size-adjust để giảm CLS khi swap. Kiểm tra thực tế font nào tham gia LCP.

</details>

**Điểm mạnh:**

- ✅ Kiến trúc server-first được tuân thủ nghiêm: chỉ 11/73 file mang "use client"; AppShell (app-shell.tsx), Icon (icon.tsx) và Avatar (avatar.tsx) đều là server component thuần, giữ JS client tối thiểu.
- ✅ Chiến lược font tốt: next/font self-host (fonts.ts) với subset ['latin','vietnamese'], display:'swap' và CSS variable — không gọi CDN runtime, đúng yêu cầu data-localization, và 2 TTF watermark (269KB, assets/fonts) chỉ ở server, không lọt vào bundle client.
- ✅ PDF view route hỗ trợ Range/206 đúng chuẩn (view/route.ts:72-92) cho pdf.js, kèm 416 khi range không hợp lệ — streaming hiệu quả thay vì nạp cả file vào RAM.
- ✅ Bản watermark được cache theo (reportId+userHash) (watermark.ts:29-31,93-95) nên chỉ stamp một lần/người, tránh tái tạo mỗi request.
- ✅ Danh sách báo cáo dùng keyset pagination thực (authz.ts:51-90, take:24/12, cursor theo id) thay vì offset — chống chậm dần khi dữ liệu lớn, đồng thời visibleWhere dùng `some` (EXISTS tương quan) tránh nhân dòng JOIN.
- ✅ getQueryClient (get-query-client.ts:29-32) tạo client mới mỗi request trên server và singleton trên browser — đúng để tránh rò rỉ cache giữa người dùng (an toàn, dù hiện chưa dùng).
- ✅ Logo và icon dùng SVG inline (icon.tsx, CoverPage svg), gần như không có ảnh raster cần tối ưu — tránh được rủi ro image optimization.

---

### 6.17 Security — AuthZ, Entitlements, PDF, IDOR — 78/100 (B)

Lõi bảo mật của Blackcrest được thiết kế tốt và đáng tin cậy ở những điểm quan trọng nhất: cách ly entitlement (canViewReport/visibleWhere) được áp dụng ĐỒNG THỜI ở cả trang (getReportBySlug) lẫn cả hai route streaming (view/download), không có IDOR trên /api/reports/[id]/* (mọi request đều re-check ủy quyền chứ không chỉ xác thực), và token tải xuống dùng một lần là single-use thực sự (atomic updateMany trên consumedAt, gắn user+report, TTL 60s, kèm defense-in-depth re-check). Tuy nhiên có một số lỗ hổng cần xử lý trước khi go-live cho một portal tài sản tư nhân: secret token tải xuống có fallback hardcoded không an toàn, tokenVersion được lưu vào JWT nhưng KHÔNG BAO GIỜ được so sánh nên cơ chế force-relogin trên thực tế vô hiệu, watermark per-user cache theo (reportId,userHash) khiến IP+thời điểm trong footer bị đóng băng ở lần xem đầu (giảm giá trị truy vết rò rỉ), và toàn bộ vòng đời approve/publish báo cáo chỉ là toast nên các audit action REPORT_APPROVE/PUBLISH không bao giờ được ghi. .env chứa secret thật được lưu trên đĩa và mật khẩu seed dùng chung cho cả SUPER_ADMIN.

| Sub-tiêu chí | Điểm | Trạng thái | Ghi chú |
|---|:---:|:---:|---|
| Authorization/RBAC | 4/5 | strong | requireRole/requireFreshUser ở mọi server action admin; middleware chỉ là tiện ích, data-layer luôn re-check. Thiếu so sánh tokenVersion và thiếu chặn self-action (APPROVER tự reinstate). |
| Entitlement isolation | 5/5 | strong | visibleWhere dùng EXISTS tương quan, áp dụng ở page + cả hai route stream + có script verify-entitlements. Staff bypass tường minh, không ngầm định. |
| PDF authenticated streaming | 4/5 | strong | Stream qua endpoint authed, fileKey không lộ ra client, hỗ trợ Range/206, Cache-Control private no-store. Tốt; trừ điểm vì phụ thuộc cache watermark gây sai footer. |
| Per-user watermark | 3/5 | adequate | Đóng dấu server-side, client không thể bỏ qua, dấu chân email/IP/thời gian. Nhưng cache theo (reportId,userHash) làm IP+timestamp bị đóng băng ở lần đầu; opacity 0.05 rất mờ dễ cắt (chấp nhận vì là leak-tracer). |
| One-time download tokens | 4/5 | strong | Single-use atomic thực sự (updateMany consumedAt:null + expiresAt>now), gắn sub(user)+rid(report), TTL 60s, jti là PK. Trừ điểm vì fallback secret hardcoded 'insecure-dev-download-secret'. |
| IDOR | 5/5 | strong | [id] luôn được kiểm tra qua canViewReport ở cả view lẫn download; download còn so claim.reportId !== id. CLIENT có đoán được id của báo cáo khác cũng nhận 403. |
| Audit-log integrity | 2/5 | weak | Admin writes có ghi log; nhưng logAudit nuốt lỗi im lặng, không chống sửa (append-only chỉ là quy ước), và vòng đời approve/publish toast-only nên REPORT_APPROVE/PUBLISH không hề được ghi. |
| Privilege escalation | 4/5 | strong | Không có action đổi role; register cứng CLIENT; không có đường nâng quyền rõ ràng. Trừ điểm: thiếu chặn actor==target (APPROVER tự reinstate/approve chính mình). |

**Findings:**

<details><summary><strong>SEC-01 · 🟠 HIGH — </strong> — tokenVersion được nhúng vào JWT nhưng KHÔNG BAO GIỜ được so sánh — cơ chế force-relogin vô hiệu</summary>

- **Sub-tiêu chí:** Authorization/RBAC · **Effort:** M
- **Bằng chứng:** src/lib/rbac.ts:37-47 requireFreshUser() select { ...tokenVersion: true } nhưng chỉ kiểm tra `if (!dbUser || dbUser.status !== "APPROVED")` — KHÔNG có so sánh dbUser.tokenVersion với sessionUser/JWT. grep toàn repo: không có dòng nào dạng `tokenVersion ===`/`!==`. src/server/accounts.ts:23 bump tokenVersion chỉ khi SUSPENDED (`status === "SUSPENDED" ? { tokenVersion: { increment: 1 } }`). auth.config.ts:22-30 jwt callback snapshot tokenVersion vào token nhưng session callback (31-38) không đọc lại để đối chiếu.
- **Tác động:** Mục đích thiết kế (comment rbac.ts:34 'forced re-logins take effect immediately') không đạt được. Hiện tại việc thu hồi phiên chỉ dựa vào status=SUSPENDED (vốn đã được check riêng), nên trường bump tokenVersion là vô tác dụng. Nếu sau này thêm luồng 'buộc đăng nhập lại' (đổi mật khẩu, đổi role, lộ thiết bị) mà chỉ bump tokenVersion chứ không đổi status, JWT cũ vẫn hợp lệ tới 30 phút và truy cập được tài liệu mật.
- **Khuyến nghị:** Trong requireFreshUser, so sánh dbUser.tokenVersion với tokenVersion trong session/JWT (cần đưa tokenVersion vào session callback hoặc đọc qua auth()), throw AuthError nếu lệch. Lý tưởng nhất là kiểm tra trong jwt callback của Auth.js để vô hiệu hóa toàn cục, không chỉ ở các action nhạy cảm.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>SEC-02 · 🟠 HIGH — </strong> — Secret token tải xuống có fallback hardcoded không an toàn</summary>

- **Sub-tiêu chí:** One-time download tokens · **Effort:** S
- **Bằng chứng:** src/lib/download-token.ts:11-13 `const secret = new TextEncoder().encode(process.env.DOWNLOAD_TOKEN_SECRET ?? "insecure-dev-download-secret")`. Nếu biến môi trường thiếu, secret HS256 trở thành chuỗi public đã biết. docker-compose.prod.yml:36 có dùng `${DOWNLOAD_TOKEN_SECRET:?}` (bắt buộc) nhưng code vẫn fallback nếu chạy ngoài compose (vd. standalone node, k8s thiếu env).
- **Tác động:** Nếu deploy mà quên set DOWNLOAD_TOKEN_SECRET, kẻ tấn công biết secret công khai có thể TỰ KÝ token tải xuống hợp lệ cho bất kỳ userId+reportId nào. Dù còn lớp re-check canViewReport (giới hạn thiệt hại), nhưng kết hợp với rủi ro mint jti chưa tồn tại sẽ trả null (updateMany count 0), tác động chính là làm xói mòn niềm tin vào tính bí mật token; với portal tài sản tư nhân, fallback secret không được phép tồn tại.
- **Khuyến nghị:** Bỏ fallback; throw lúc khởi động nếu DOWNLOAD_TOKEN_SECRET (và AUTH_SECRET) không được set, hoặc dùng pattern z.string().min(32).parse(process.env...). Đảm bảo fail-closed thay vì fall back về secret yếu.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>SEC-03 · 🟠 HIGH — </strong> — Vòng đời approve/publish chỉ là toast — audit REPORT_APPROVE/PUBLISH không bao giờ được ghi, và trạng thái không được kiểm soát phía server</summary>

- **Sub-tiêu chí:** Audit-log integrity · **Effort:** L
- **Bằng chứng:** pdf-viewer.tsx:956-959 và 980-983: nút Phê duyệt/Từ chối chỉ `setDialog(null); setToast('approved'/'rejected')` — không gọi server action nào. grep toàn repo không có publishReport/approveReport/setReportStatus. Enum AuditAction có REPORT_APPROVE/REPORT_PUBLISH/REPORT_SUBMIT (schema.prisma:69-74) nhưng logAudit chỉ được gọi cho ACCOUNT_* và ENTITLEMENT_* (entitlements.ts, accounts.ts).
- **Tác động:** Hành động phê duyệt/phát hành báo cáo — chính là gate quyết định một tài liệu mật có hiển thị cho nhà đầu tư hay không — KHÔNG được persist và KHÔNG để lại dấu vết audit. Với portal định chế, việc thiếu nhật ký 'ai đã duyệt/phát hành báo cáo nào, khi nào' là lỗ hổng tuân thủ và truy vết nghiêm trọng. Đây là hạng mục known-incomplete nhưng vẫn phải nêu vì thuộc audit-log integrity.
- **Khuyến nghị:** Triển khai server action chuyển trạng thái báo cáo (DRAFT→REVIEW→APPROVED→PUBLISHED) bảo vệ bằng requireRole (EDITOR cho submit, APPROVER/SUPER_ADMIN cho approve/publish), cập nhật DB và GHI logAudit tương ứng. Cho tới khi đó, không nên ship UI gợi ý hành động đã thành công.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>SEC-04 · 🟡 MEDIUM</strong> — Cache watermark theo (reportId, userHash) làm đóng băng IP + thời điểm — giảm giá trị truy vết rò rỉ</summary>

- **Sub-tiêu chí:** Per-user watermark · **Effort:** M
- **Bằng chứng:** src/lib/watermark.ts:29-31 watermarkKey = `cache/wm/${reportId}/${userHash(userId)}.pdf` (chỉ phụ thuộc report+user). getWatermarkedKey:93-95: `if (cached.exists) return key` — trả về bản đã cache, KHÔNG đóng dấu lại. Footer (stamp:46) chèn `meta.ip` và `stampedAt` từ `when: new Date()` (gọi từ view/route.ts:46-50 với clientIp(req)). Hệ quả: chỉ lần xem ĐẦU TIÊN ghi đúng IP/thời gian; mọi lượt xem/tải sau đều mang IP+thời điểm của lần đầu.
- **Tác động:** Mục tiêu watermark là truy vết rò rỉ theo từng lượt truy cập (email+IP+thời gian). Vì bản PDF được cache vĩnh viễn theo user, nếu nhà đầu tư xem lần đầu ở văn phòng rồi tải về nhà, bản tải vẫn in IP+thời gian văn phòng → dấu vết sai lệch, không phản ánh sự kiện rò rỉ thực. Email thì đúng (gắn user) nên vẫn truy được tới cá nhân, do đó mức medium chứ không cao hơn.
- **Khuyến nghị:** Hoặc (a) bỏ IP+timestamp khỏi footer cache và chỉ giữ email (trung thực về việc đây là dấu per-user, không per-access), hoặc (b) không cache cho luồng DOWNLOAD và đóng dấu tươi mỗi lần tải để IP/thời gian chính xác. ReportAccessLog vẫn ghi IP/thời gian chính xác cho từng lượt, nên có thể dựa vào đó để truy vết thay vì footer.

</details>

<details><summary><strong>SEC-05 · 🟡 MEDIUM</strong> — .env chứa secret production-grade được commit trên đĩa; mật khẩu seed dùng chung cho cả SUPER_ADMIN</summary>

- **Sub-tiêu chí:** Authorization/RBAC · **Effort:** S
- **Bằng chứng:** .env (đọc được): `AUTH_SECRET="rHwjSOI5..."`, `DOWNLOAD_TOKEN_SECRET="QxYt0//76..."`, `DATABASE_URL` kèm credential. prisma/seed.ts:13 `const DEV_PASSWORD = "Blackcrest@2026"`, dòng 16/32-33 áp dụng cùng hash cho mọi user gồm admin@blackcrest.vn role SUPER_ADMIN (seed.ts:20). seed.ts:178 in thẳng mật khẩu ra console.
- **Tác động:** Dự án không nằm trong git nên rủi ro rò rỉ qua history hiện chưa hiện hữu, nhưng các secret này là chuỗi base64 trông như giá trị thật và nằm trên đĩa làm việc; nếu lỡ commit/đẩy lên hoặc dùng lại trong prod thì AUTH_SECRET lộ cho phép giả mạo JWT bất kỳ user/role. DEV_PASSWORD dùng chung nghĩa là nếu seed chạy nhầm trên môi trường thật, tồn tại tài khoản SUPER_ADMIN mật khẩu đoán được.
- **Khuyến nghị:** Đảm bảo .env nằm trong .gitignore trước khi khởi tạo git; xoay (rotate) toàn bộ secret trước khi lên prod và không tái sử dụng giá trị dev. seed.ts chỉ chạy ở dev và nên bắt buộc env như SEED_ALLOWED=true; cân nhắc mật khẩu ngẫu nhiên cho tài khoản admin khi seed.

</details>

<details><summary><strong>SEC-06 · ⚪ LOW</strong> — Hành động quản trị thiếu kiểm tra actor != target (APPROVER tự reinstate/approve chính mình)</summary>

- **Sub-tiêu chí:** Privilege escalation · **Effort:** S
- **Bằng chứng:** src/server/accounts.ts:12-35 setStatus chỉ gọi requireRole('SUPER_ADMIN','APPROVER') rồi update userId tùy ý; không có check `userId !== actor.id`. Một APPROVER bị SUSPENDED không thể đăng nhập (auth.ts:46), nhưng nếu một APPROVER khác hoặc kịch bản phiên còn hiệu lực, không có ràng buộc ngăn tự thao tác trạng thái của bản thân. Không có tách biệt quyền giữa APPROVER và SUPER_ADMIN cho quản trị tài khoản.
- **Tác động:** Rủi ro thấp vì để self-reinstate cần JWT còn sống và status hiện tại cho phép. Vấn đề chính là vi phạm nguyên tắc tách biệt nhiệm vụ: APPROVER có toàn quyền quản trị tài khoản ngang SUPER_ADMIN (approve/suspend/reinstate người khác), không có 'four-eyes' cho hành động nhạy cảm trên chính mình.
- **Khuyến nghị:** Thêm guard `if (userId === actor.id) throw new ForbiddenError()` trong setStatus, và cân nhắc giới hạn các hành động tài khoản nhạy cảm (suspend/reinstate staff) cho riêng SUPER_ADMIN.

</details>

<details><summary><strong>SEC-07 · ⚪ LOW</strong> — logAudit và logReportAccess nuốt lỗi im lặng — sự kiện bảo mật có thể mất mà không ai biết</summary>

- **Sub-tiêu chí:** Audit-log integrity · **Effort:** M
- **Bằng chứng:** src/lib/audit.ts:26-29 logAudit catch chỉ `console.error(...)` rồi tiếp tục; tương tự logReportAccess:42-44. View/download route gọi `void logReportAccess(...)` (view/route.ts:64, download/route.ts:66) — fire-and-forget, nếu DB ghi lỗi thì lượt truy cập tài liệu mật không được ghi nhật ký mà request vẫn thành công.
- **Tác động:** Append-only chỉ là quy ước (không có hạn chế quyền DB, không hash chain). Trong sự cố điều tra rò rỉ, việc thiếu một lượt VIEW/DOWNLOAD trong log do lỗi ghi thầm lặng làm suy giảm tính toàn vẹn của bằng chứng. Mức low vì là edge-case (DB lỗi) và không tạo đường tấn công trực tiếp.
- **Khuyến nghị:** Giữ nguyên tắc 'audit không phá vỡ thao tác chính' nhưng phát cảnh báo (metrics/alert) khi ghi log thất bại; xem xét cấp quyền chỉ-INSERT cho bảng AuditLog/ReportAccessLog ở tầng DB để củng cố append-only.

</details>

<details><summary><strong>SEC-08 · ⚪ LOW</strong> — clientIp tin tưởng hoàn toàn header x-forwarded-for/x-real-ip (có thể giả mạo)</summary>

- **Sub-tiêu chí:** Per-user watermark · **Effort:** S
- **Bằng chứng:** view/route.ts:13-19 và download/route.ts:12-18: `clientIp` lấy trực tiếp `req.headers.get('x-forwarded-for')?.split(',')[0]` rồi tới x-real-ip rồi '0.0.0.0'. Giá trị này được dùng cho cả footer watermark (watermark.ts:46) và ReportAccessLog (audit.ts).
- **Tác động:** Client có thể đặt header X-Forwarded-For tùy ý nếu reverse proxy không ghi đè. Hệ quả: IP trong watermark và access-log có thể bị làm giả, làm sai lệch dấu vết truy vết rò rỉ và nhật ký truy cập. Mức low vì phụ thuộc cấu hình nginx (nginx/ có trong infra) và không cấp thêm quyền truy cập.
- **Khuyến nghị:** Chỉ tin x-forwarded-for khi đến từ proxy tin cậy (nginx phải ghi đè header này, không append client-supplied). Tài liệu hóa rằng IP trong audit là 'IP do proxy ghi nhận' và đảm bảo nginx set X-Forwarded-For = $remote_addr.

</details>

**Điểm mạnh:**

- ✅ Cách ly entitlement đúng và nhất quán: canViewReport/visibleWhere (authz.ts:15-40) áp dụng ở CẢ trang chi tiết (reports.ts:27 getReportBySlug) LẪN cả hai route streaming (view/route.ts:42, download/route.ts:52). Staff bypass tường minh (authz.ts:20 'never implicit'), và có scripts/verify-entitlements.ts kiểm tra hồi quy cách ly nhóm A/B.
- ✅ Không có IDOR trên /api/reports/[id]/*: [id] luôn được ủy quyền theo người gọi chứ không chỉ xác thực. CLIENT đoán đúng cuid của báo cáo nhóm khác vẫn nhận 403 vì canViewReport trả false.
- ✅ Token tải xuống dùng-một-lần được làm đúng: single-use atomic qua updateMany với where {consumedAt:null, expiresAt>now} và kiểm tra res.count !== 1 (download-token.ts:50-54); gắn user(sub)+report(rid); TTL 60s; jti là khóa chính (chống trùng); và route download CÒN re-check user active + canViewReport như defense-in-depth (download/route.ts:38-54), so cả claim.reportId !== id.
- ✅ PDF chỉ được stream qua endpoint đã xác thực; fileKey/đường dẫn lưu trữ không bao giờ lộ ra client (storage.ts có resolveKey chống path traversal). Header Cache-Control: private, no-store ngăn cache lưu bản mật; hỗ trợ Range/206 cho pdf.js đúng cách.
- ✅ Watermark được đóng dấu phía server bằng pdf-lib + font Unicode (tiếng Việt), client không thể bỏ qua; bản gốc không-watermark không thể lấy qua bất kỳ route nào (mọi đường đều đi qua getWatermarkedKey).
- ✅ Mật khẩu dùng Argon2id với tham số OWASP 2026 (password.ts:7-13: 64MiB, t=3); đăng ký cứng role CLIENT + status PENDING, không auto-login (auth-actions.ts:80-83), gate phê duyệt ở cả authorize() lẫn data-layer; tài khoản SUSPENDED bị chặn đăng nhập (auth.ts:45-46).
- ✅ Middleware được khai báo rõ KHÔNG phải là biên giới bảo mật (CVE-2025-29927) và mọi RSC/Server Action/Route Handler đều re-check ở data-layer (rbac.ts:18-30, admin/layout.tsx:24). Phân tách edge-safe authConfig (không Prisma/argon2) cho middleware là đúng kiến trúc.
- ✅ Ràng buộc DB enforce 'entitlement trỏ đúng MỘT trong report HOẶC category' bằng CHECK constraint thật (migration entitlement_xor_check) thay vì chỉ tin app-layer; grantEntitlement còn idempotent + ghi audit.

---

### 6.18 Frontend Architecture — 82/100 (B)

Kiến trúc frontend của Blackcrest có nền tảng rất vững cho một app Next.js 15 server-first: phân tầng (RSC pages → server actions/data modules → lib → Prisma) sạch sẽ và được thực thi bằng cờ "server-only"/"use server" nhất quán, prisma không hề rò rỉ vào bất kỳ file .tsx nào, biên giới server/client component được giữ kỷ luật (chỉ 4 client island trong ui/, props truyền xuống island đều là plain serializable). Điểm trừ chủ yếu nằm ở khả năng bảo trì/refactor cấp UI: pdf-viewer.tsx là một god component 1243 dòng trộn lẫn 5 template trang PDF hardcode với khung viewer và dialog duyệt, các bảng ánh xạ trạng thái (STATUS_TONE/KEY/LABEL) bị nhân bản ở 5 file, và markup bảng admin được lặp lại inline thay vì có một DataTable dùng chung. Đây là những món nợ về cohesion/DRY chứ không phải lỗi cấu trúc nền tảng — phù hợp với một MVP, nhưng sẽ cản trở khi thêm loại báo cáo/role mới.

| Sub-tiêu chí | Điểm | Trạng thái | Ghi chú |
|---|:---:|:---:|---|
| Project structure | 4.5/5 | strong | Route groups (admin)/(client)/(public) rõ ràng; tách src/app, src/components (ui vs composite), src/lib (12 module), src/server (6 module), src/i18n hợp lý và dễ định vị. |
| Feature organization | 4/5 | strong | Tổ chức theo route-group + co-location (pdf-viewer.tsx, login-form.tsx nằm cạnh page). Chưa có thư mục feature/ riêng nhưng quy mô MVP chưa cần. |
| Layer separation | 4.5/5 | strong | Phân tầng RSC → server-action → lib → prisma rất sạch; 'server-only' bảo vệ lib/authz, lib/watermark, server/*; prisma KHÔNG xuất hiện trong bất kỳ .tsx nào. |
| Modularization | 4/5 | strong | lib/ và server/ chia module nhỏ, đơn nhiệm (audit, rbac, authz, download-token, storage…). Trừ điểm vì pdf-viewer.tsx 1243 dòng là khối nguyên monolithic. |
| Component architecture | 3.5/5 | adequate | ui/ primitives thiết kế tốt (forwardRef, server-by-default, hover bằng CSS). Nhưng thiếu composite tái dụng (DataTable, StatRow) nên page admin lặp markup; pdf-viewer trộn nhiều trách nhiệm. |
| Shared libraries | 4/5 | strong | cn(), format.ts, nav.ts, barrel ui/index.ts là shared lib tốt. Thiếu một module chia sẻ cho ánh xạ report-status (đang bị nhân bản). |
| Micro-frontend readiness | 3/5 | na | Không áp dụng — đây là một Next.js app đơn khối, không có nhu cầu MF. Đánh giá trung tính, không phạt điểm dimension tổng. |
| Scalability | 3.5/5 | adequate | Data layer (keyset pagination, visibleWhere tái dụng) scale tốt. Tầng UI scale kém: thêm report type/role sẽ phải sửa nhiều bảng ánh xạ nhân bản và viewer hardcode. |
| Maintainability | 3/5 | adequate | Code sạch, có doc-comment tham chiếu blueprint. Nhưng duplication (STATUS_*, clientIp) và god component làm tăng chi phí sửa đổi; không có test/lint để bảo vệ refactor. |
| Coupling | 4/5 | strong | Hướng import đúng chiều (lib không import server). Một điểm coupling nhẹ: server/admin-data import categoryName từ server/reports thay vì đặt ở lib chung. |
| Cohesion | 3.5/5 | adequate | Phần lớn module có cohesion cao. pdf-viewer.tsx cohesion thấp (5 template PDF + chrome + dialog + download trong 1 file); reports/page.tsx định nghĩa DOT_BG trong thân hàm. |
| Refactorability | 3.5/5 | adequate | Biên giới sạch giúp refactor backend an toàn. Nhưng UI thiếu trừu tượng dùng chung + zero test khiến refactor viewer/bảng admin rủi ro hơn. |

**Findings:**

<details><summary><strong>FA-01 · 🟠 HIGH — </strong> — pdf-viewer.tsx là god component 1243 dòng trộn nhiều trách nhiệm</summary>

- **Sub-tiêu chí:** Component architecture · **Effort:** M
- **Bằng chứng:** src/app/[locale]/(client)/reports/[slug]/pdf-viewer.tsx (1243 dòng, lớn nhất codebase). Trong một file: 5 template trang PDF hardcode (CoverPage l.186, SummaryPage l.285, PerformancePage l.345, AllocationPage l.485, NotesPage l.551), khung viewer + IntersectionObserver (PdfViewer l.647), dialog duyệt (l.944-995) và SidePanel timeline (l.1058). Dữ liệu giả cũng hardcode trong component: 'const kpis' l.292, 'const months' l.346, 'const alloc' l.486.
- **Tác động:** Đây là crown-jewel surface nhưng cohesion thấp: mọi thay đổi (đổi layout trang, sửa dialog duyệt, đổi watermark hiển thị) đều phải động vào cùng một file khổng lồ, tăng rủi ro hồi quy. Khi PDF render thật thay thế bản dựng visual, toàn bộ 5 template phải gỡ bỏ. Khó tách test, khó tái dụng SidePanel/dialog ở nơi khác.
- **Khuyến nghị:** Tách thành thư mục: pages/ (CoverPage, SummaryPage… mỗi file một template hoặc gộp thành DocumentPages), viewer/PdfToolbar, viewer/SidePanel, viewer/ApprovalDialogs. Đưa dữ liệu mẫu (kpis/months/alloc) ra constant riêng. Giữ PdfViewer làm orchestrator state thuần.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>FA-02 · 🟡 MEDIUM</strong> — Bảng ánh xạ trạng thái báo cáo bị nhân bản ở 5 file</summary>

- **Sub-tiêu chí:** Shared libraries · **Effort:** S
- **Bằng chứng:** STATUS_TONE/STATUS_KEY/STATUS_LABEL được định nghĩa lặp ở: src/app/[locale]/(admin)/admin/reports/page.tsx l.13-30, src/app/[locale]/(admin)/admin/accounts/page.tsx l.20-29, src/app/[locale]/(client)/reports/page.tsx l.14-31, src/app/[locale]/(client)/portal/page.tsx, và src/app/[locale]/(client)/reports/[slug]/pdf-viewer.tsx l.58-73 (STATUS_LABEL + STATUS_TONE). Ví dụ map DRAFT→'draft' lặp lại y hệt nhiều nơi.
- **Tác động:** Thêm một ReportStatus mới (hoặc đổi tone) đòi sửa 5 chỗ; dễ lệch nhau (ví dụ ARCHIVED có tone 'neutral' ở admin nhưng pdf-viewer cũng 'neutral' — phải tự nhớ đồng bộ). Đây là nợ DRY làm giảm maintainability khi lifecycle báo cáo mở rộng.
- **Khuyến nghị:** Tạo src/lib/report-status.ts export STATUS_TONE, STATUS_KEY (và helper statusLabel(status, t)) dùng chung cho cả RSC và client island (chỉ là object/Record nên serialize/dùng được ở cả hai phía).

</details>

<details><summary><strong>FA-03 · 🟡 MEDIUM</strong> — Markup bảng/stat-card lặp lại inline trong các trang admin thay vì component dùng chung</summary>

- **Sub-tiêu chí:** Component architecture · **Effort:** M
- **Bằng chứng:** src/app/[locale]/(admin)/admin/reports/page.tsx l.137-227 dựng <table> đầy đủ thead/tbody bằng tay; src/app/[locale]/(admin)/admin/accounts/page.tsx l.112-180 lại tự dựng 'bảng' bằng grid (grid-cols-[2fr_1.2fr_…]) khác kiểu; entitlements/page.tsx và audit/page.tsx tiếp tục lặp pattern stat-strip + card. Stat-card row gần như giống nhau ở reports l.100-121 và accounts l.80-92.
- **Tác động:** Mỗi trang admin có cách render bảng riêng (table vs grid), không nhất quán và không thể tái dụng (sort, empty-state, pagination phải code lại mỗi nơi). Khi thêm cột/role mới hoặc khi cần phân trang phía admin, chi phí nhân lên theo số trang.
- **Khuyến nghị:** Trừu tượng một <DataTable columns rows> (server component) và một <StatStrip items> dùng chung cho toàn bộ admin. Thống nhất một cách render bảng (table semantic) cho accessibility.

</details>

<details><summary><strong>FA-04 · ⚪ LOW</strong> — Hàm clientIp trùng lặp giữa hai route handler PDF</summary>

- **Sub-tiêu chí:** Coupling · **Effort:** S
- **Bằng chứng:** Hàm 'function clientIp(req: NextRequest)' định nghĩa giống hệt ở src/app/api/reports/[id]/view/route.ts l.13-19 và src/app/api/reports/[id]/download/route.ts l.12-18.
- **Tác động:** Logic phân giải IP (liên quan tới audit/watermark bảo mật) bị copy hai chỗ; nếu sửa thứ tự ưu tiên header (x-forwarded-for/x-real-ip) chỉ ở một file sẽ gây lệch nhật ký truy cập giữa view và download.
- **Khuyến nghị:** Đưa clientIp vào src/lib (ví dụ lib/request.ts hoặc lib/audit.ts) và import ở cả hai route. Vì là module server, đặt cờ 'server-only' nếu cần.

</details>

<details><summary><strong>FA-05 · ⚪ LOW</strong> — categoryName đặt trong server/reports gây coupling server→server và khó dùng lại</summary>

- **Sub-tiêu chí:** Cohesion · **Effort:** S
- **Bằng chứng:** categoryName định nghĩa tại src/server/reports.ts l.6-10 (file gắn 'server-only', chứa Prisma query). src/server/admin-data.ts l.5 phải 'import { categoryName } from "@/server/reports"' chỉ để dùng hàm thuần (không cần DB). Các page cũng import categoryName từ server/reports (reports/page.tsx l.9, entitlements/page.tsx l.11).
- **Tác động:** Một hàm map locale thuần (pure) bị 'kẹt' trong module data-access server-only, tạo phụ thuộc admin-data→reports không cần thiết và buộc mọi consumer kéo theo module có Prisma. Giảm tính tái dụng và làm đồ thị phụ thuộc rối hơn mức cần.
- **Khuyến nghị:** Chuyển categoryName (và resolveTranslation đang ở lib/authz) vào một module thuần như src/lib/i18n-content.ts; server/* và RSC import từ đó. Tách rõ 'pure transform' khỏi 'data access'.

</details>

<details><summary><strong>FA-06 · ⚪ LOW</strong> — Object ánh xạ DOT_BG được tạo lại bên trong thân RSC mỗi lần render</summary>

- **Sub-tiêu chí:** Cohesion · **Effort:** S
- **Bằng chứng:** src/app/[locale]/(admin)/admin/reports/page.tsx l.72-84: 'const DOT_BG: Record<BadgeTone, string> = { … }' được khai báo bên trong AdminReportsPage (sau await listAdminReports), trong khi STATUS_TONE/STATUS_KEY ở cùng file lại là module-level (l.13, l.23).
- **Tác động:** Không nhất quán về vị trí hằng số (một số ở module-level, một số trong thân hàm) gây nhiễu khi đọc và tạo lại object không cần thiết mỗi request. Chủ yếu là vấn đề sạch sẽ/maintainability, không phải hiệu năng nghiêm trọng.
- **Khuyến nghị:** Nâng DOT_BG lên module-level (hoặc gộp vào lib/report-status.ts ở FA-02). Thống nhất quy ước: hằng số ánh xạ luôn ở module scope.

</details>

<details><summary><strong>FA-07 · 🔵 INFO</strong> — AppShell (server component) import trực tiếp server action signOutAction — ràng buộc chrome dùng-chung vào auth</summary>

- **Sub-tiêu chí:** Coupling · **Effort:** S
- **Bằng chứng:** src/components/app-shell.tsx l.7 'import { signOutAction } from "@/server/auth-actions"' và dùng ở l.132 '<form action={signOutAction}>'. Đây là component chrome dùng chung cho cả Portal lẫn Admin.
- **Tác động:** Hoạt động đúng (form action server là pattern hợp lệ), nhưng AppShell — vốn nên là chrome trình bày thuần — bị ghép cứng với một server action cụ thể, làm giảm khả năng tái dụng AppShell ở ngữ cảnh không cần đăng xuất và khó test cô lập.
- **Khuyến nghị:** Cân nhắc truyền hành động đăng xuất (hoặc slot footer) như prop từ layout xuống AppShell, để chrome không phụ thuộc trực tiếp module auth. Mức độ ưu tiên thấp.

</details>

<details><summary><strong>FA-08 · 🔵 INFO</strong> — Trang reports detail truyền cả viewUrl và downloadUrl trỏ cùng endpoint /view (prop chết)</summary>

- **Sub-tiêu chí:** Modularization · **Effort:** S
- **Bằng chứng:** src/app/[locale]/(client)/reports/[slug]/page.tsx l.57-58: 'viewUrl={`/api/reports/${report.id}/view`}' và 'downloadUrl={`/api/reports/${report.id}/view`}' (cùng URL). Trong pdf-viewer.tsx, PdfViewer destructure props nhưng KHÔNG dùng downloadUrl (l.647-653 không lấy downloadUrl; tải xuống đi qua requestDownloadUrl server action ở l.669).
- **Tác động:** downloadUrl là prop thừa, gây hiểu nhầm về luồng tải (thực tế dùng one-time token qua server action). Interface giữa RSC và island có điểm chết, làm giảm tính rõ ràng/refactorability của contract component.
- **Khuyến nghị:** Bỏ prop downloadUrl khỏi PdfViewerProps và lời gọi ở page.tsx. Giữ contract island tối giản, đúng với luồng tải token-based.

</details>

**Điểm mạnh:**

- ✅ Phân tầng kiến trúc gương mẫu: prisma KHÔNG được import trong bất kỳ file .tsx nào (xác nhận bằng grep); mọi truy cập DB đi qua src/server/* và src/lib/{authz,rbac,audit,download-token} đều gắn 'server-only' (src/lib/authz.ts l.1, src/server/reports.ts l.1), chặn rò rỉ data-access xuống client.
- ✅ Kỷ luật biên giới server/client xuất sắc: chỉ 4 client island trong ui/ (dialog, tabs, toast, tooltip) — các primitive còn lại (button, input, card, badge…) là server component, hover/focus xử lý bằng CSS variant chứ không bằng JS state (src/components/ui/button.tsx l.6-9). useId trong input/checkbox/switch/select dùng đúng cách trong RSC.
- ✅ RSC → client island truyền props plain serializable rất rõ ràng: reports/[slug]/page.tsx l.37-50 dựng 'viewerReport' tuần tự hóa (Date → ISO string) trước khi đưa vào PdfViewer, và canApprove được tính ở server (l.34) thay vì lộ logic role xuống client.
- ✅ Tách edge-safe authConfig (src/auth.config.ts, không Prisma/argon2) khỏi auth.ts Node-runtime (Credentials + PrismaAdapter) là kiến trúc đúng chuẩn cho middleware edge; middleware được khai báo rõ là lớp tiện ích, không phải security boundary (src/middleware.ts l.7-13).
- ✅ getQueryClient tách singleton browser vs per-request server (src/lib/get-query-client.ts l.14-32) ngăn rò rỉ cache dữ liệu gated giữa người dùng — quyết định kiến trúc đúng và hiếm khi được làm chuẩn.
- ✅ Storage được trừu tượng sau interface StorageAdapter (src/lib/storage.ts l.13-18) với chống path-traversal (resolveKey l.25-35), cho phép thay driver S3/SeaweedFS sau này mà không đụng tới watermark/route — refactorability tốt ở tầng hạ tầng.
- ✅ lib/authz tập trung một WHERE fragment visibleWhere (src/lib/authz.ts l.30-40) tái dụng cho cả canViewReport và listVisibleReports — cohesion cao cho logic phân quyền cốt lõi, dễ bảo trì khi mở rộng quy tắc entitlement.

---

### 6.19 Routing — 82/100 (B)

Kiến trúc routing rất chắc chắn cho một portal bảo mật: cấu trúc route-group ((public)/(client)/(admin)) sạch sẽ, nested layout hợp lý, và đặc biệt là DEFENSE-IN-DEPTH thực sự — middleware redirect chỉ là tiện ích (có chú thích CVE-2025-29927), còn mọi layout, page, Server Action và Route Handler đều re-check auth/role/entitlement ở data layer. Không có route nào của báo cáo/PDF bị hở guard. Điểm trừ chính: (1) deep-linking bị hỏng — middleware đặt callbackUrl nhưng loginAction hardcode redirect về /portal nên không bao giờ đưa người dùng trở lại URL đã yêu cầu; (2) các trang HTML trong (client)/(admin) chỉ kiểm tra session tồn tại chứ không kiểm tra status APPROVED (chỉ API routes mới kiểm tra), tạo cửa sổ rò rỉ metadata cho người dùng vừa bị SUSPENDED; (3) listAdminReports thiếu requireRole nội tại, lệ thuộc hoàn toàn vào layout.

| Sub-tiêu chí | Điểm | Trạng thái | Ghi chú |
|---|:---:|:---:|---|
| Route structure | 5/5 | strong | Route-group (public)/(client)/(admin) tách bạch theo quyền; api/auth và api/reports đặt ngoài [locale] đúng vì không phụ thuộc locale. Cấu trúc sạch, có chủ đích. |
| Nested routing | 5/5 | strong | LocaleLayout (html/body + providers) → group layout (guard) → page (compose AppShell). Phân tầng rõ; reports/[slug] lồng đúng dưới (client). |
| Protected routes | 4/5 | strong | PDF viewer, portal, admin đều có nhiều lớp bảo vệ; API view/download re-check auth+entitlement+status mỗi request. Trừ điểm vì page HTML không check status APPROVED. |
| Route guards | 4/5 | strong | Defense-in-depth thật: layout + page + canViewReport + requireRole/requireFreshUser. Trừ điểm vì listAdminReports thiếu guard nội tại và status không đồng nhất giữa API và page. |
| Deep linking | 2/5 | weak | localePrefix:always cho URL ổn định + notFound() che báo cáo không có quyền là tốt, nhưng callbackUrl bị bỏ qua → sau đăng nhập luôn về /portal thay vì URL đã deep-link. |
| SEO routing | 4/5 | strong | hreflang sạch nhờ localePrefix:always; robots noindex toàn portal (đúng vì gated), landing page index:true. generateStaticParams pre-render đủ locale. |
| Route performance | 5/5 | strong | Trang gated đều force-dynamic (đúng, dữ liệu per-user); marketing/login/register là RSC tĩnh; viewer là client island tách biệt. RSC/client split chuẩn, có loading.tsx skeleton. |
| Middleware | 4/5 | strong | Matcher loại trừ api/_next/_vercel/file-có-đuôi đúng; dùng instance edge-safe (không Prisma/argon2). Trừ điểm nhẹ vì pattern loại trừ dấu chấm và middleware chỉ check session chứ không check status. |

**Findings:**

<details><summary><strong>ROUTE-01 · 🟡 MEDIUM</strong> — Deep-linking hỏng: callbackUrl được đặt nhưng không bao giờ được dùng khi đăng nhập</summary>

- **Sub-tiêu chí:** Deep linking · **Effort:** S
- **Bằng chứng:** src/middleware.ts:34-35 đặt query: `const url = new URL(\`/${locale}/login\`, nextUrl); url.searchParams.set("callbackUrl", nextUrl.pathname);`. Nhưng src/server/auth-actions.ts:116 hardcode `redirectTo: \`/${locale}/portal\``, và login-form.tsx không đọc callbackUrl (grep không tìm thấy callbackUrl/useSearchParams trong login-form.tsx).
- **Tác động:** Người dùng (đặc biệt CLIENT nhận link tới một báo cáo cụ thể) khi chưa đăng nhập sẽ bị đưa về /login, nhưng sau khi đăng nhập luôn rơi về /portal thay vì /reports/[slug] đã yêu cầu. Trải nghiệm deep-link tới crown-jewel surface (PDF viewer) bị gãy; callbackUrl trở thành dead code.
- **Khuyến nghị:** Trong login-form.tsx đọc callbackUrl từ useSearchParams và truyền xuống loginAction; trong auth-actions.ts dùng callbackUrl đã được validate (chỉ chấp nhận path nội bộ bắt đầu bằng `/${locale}/`, từ chối URL tuyệt đối để tránh open-redirect) làm redirectTo, fallback về /portal.

</details>

<details><summary><strong>ROUTE-02 · 🟡 MEDIUM</strong> — Trang HTML không kiểm tra status APPROVED — cửa sổ rò rỉ metadata cho người dùng vừa bị SUSPENDED</summary>

- **Sub-tiêu chí:** Protected routes · **Effort:** S
- **Bằng chứng:** src/app/[locale]/(client)/layout.tsx:20 chỉ `if (!session?.user) redirect(...)`; portal/page.tsx:87 và reports/page.tsx:47 chỉ lấy `session!.user` không check status. Ngược lại API kiểm tra chặt: view/route.ts:31 `if (!session?.user?.id || session.user.status !== "APPROVED")` và download/route.ts:42. Middleware.ts:33 cũng chỉ check `!session?.user`.
- **Tác động:** JWT có maxAge 30 phút (auth.config.ts:16). Khi một tài khoản bị SUSPENDED sau khi đã đăng nhập, trong tối đa ~30 phút họ vẫn vào được /portal và /reports để xem tiêu đề/metadata báo cáo (listVisibleReports) — dù KHÔNG xem/tải được PDF (API chặn theo status) và không thực hiện được mutation (requireFreshUser/requireRole hit DB). Rò rỉ metadata hẹp nhưng không phù hợp chuẩn institutional.
- **Khuyến nghị:** Trong (client) layout và (admin) layout kiểm tra `session.user.status === "APPROVED"` (redirect về login/trang thông báo nếu không); hoặc tốt hơn, dùng một helper requireFreshUser-tương-đương ở layout cho các surface nhạy cảm để suspension có hiệu lực tức thì thay vì chờ JWT hết hạn.

</details>

<details><summary><strong>ROUTE-03 · ⚪ LOW</strong> — listAdminReports thiếu requireRole nội tại — phá vỡ defense-in-depth nhất quán</summary>

- **Sub-tiêu chí:** Route guards · **Effort:** S
- **Bằng chứng:** src/server/reports.ts:63 `export async function listAdminReports(locale: string)` truy vấn TẤT CẢ report mọi trạng thái nhưng không gọi requireRole, trái với admin-data.ts (listAccounts:9, listGroupsWithEntitlements:31, listAuditLog:63 đều `await requireRole("SUPER_ADMIN","APPROVER")`). Hàm được dùng ở admin/reports/page.tsx:58 và admin/entitlements/page.tsx — chỉ được bảo vệ bởi (admin)/layout.tsx.
- **Tác động:** Hiện tại vẫn an toàn vì (admin) layout chặn non-staff. Nhưng đây là single point of failure: nếu hàm được tái sử dụng ngoài cây (admin) (ví dụ trong một Route Handler hay page khác) sẽ lộ toàn bộ báo cáo nháp/chưa phát hành cho non-staff. Là footgun đi ngược nguyên tắc 'mọi data function tự bảo vệ' của chính codebase.
- **Khuyến nghị:** Thêm `await requireRole("SUPER_ADMIN","EDITOR","APPROVER")` (hoặc isStaff tương ứng) ở đầu listAdminReports để đồng nhất với các hàm admin khác và không phụ thuộc duy nhất vào layout.

</details>

<details><summary><strong>ROUTE-04 · ⚪ LOW</strong> — Middleware matcher loại trừ mọi path có dấu chấm — slug chứa dấu chấm sẽ bỏ qua locale/guard</summary>

- **Sub-tiêu chí:** Middleware · **Effort:** M
- **Bằng chứng:** src/middleware.ts:48 `matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"]`. Pattern `.*\..*` loại mọi URL có dấu chấm khỏi middleware, kể cả `/vi/reports/q3.2026` nếu slug chứa dấu chấm.
- **Tác động:** Một báo cáo có slug chứa dấu '.' sẽ không qua intlMiddleware (locale negotiation) và không qua lớp redirect tiện ích của middleware. Rủi ro bảo mật thực tế thấp vì page reports/[slug] vẫn tự auth (page.tsx:25 notFound nếu không session) và data layer vẫn check entitlement; chủ yếu là lỗi locale/redirect. Slug hiện theo kebab-case nên xác suất thấp.
- **Khuyến nghị:** Ràng buộc slug không cho phép dấu '.' (đã hợp lý), hoặc tinh chỉnh matcher để chỉ loại trừ các đuôi file tĩnh thật sự (ví dụ liệt kê whitelist phần mở rộng) thay vì mọi dấu chấm, nhằm bảo toàn locale negotiation cho mọi route ứng dụng.

</details>

<details><summary><strong>ROUTE-05 · 🔵 INFO</strong> — Không có authorized callback — middleware tự wrap auth() (đúng pattern nhưng cần lưu ý vận hành)</summary>

- **Sub-tiêu chí:** Middleware · **Effort:** S
- **Bằng chứng:** src/auth.config.ts:20-39 chỉ có callbacks jwt/session, KHÔNG có `authorized`. src/middleware.ts:19 dùng `export default auth((req)=>{...})` rồi tự redirect. Comment middleware.ts:7-10 ghi rõ middleware không phải security boundary (CVE-2025-29927).
- **Tác động:** Đây là pattern hợp lệ và thực ra rõ ràng hơn authorized callback. Lưu ý: logic guard nằm rải ở middleware + layout + page nên cần kỷ luật để giữ đồng nhất (xem ROUTE-02, ROUTE-03). Không phải lỗi.
- **Khuyến nghị:** Giữ nguyên cách tiếp cận; cân nhắc tập trung danh sách route cần auth/staff vào một module dùng chung (vd matchers cho /portal, /admin) để middleware và layout tham chiếu cùng nguồn, tránh lệch logic theo thời gian.

</details>

**Điểm mạnh:**

- ✅ Defense-in-depth routing thực sự, không chỉ trên giấy: middleware (tiện ích, có chú thích CVE-2025-29927) + group layout guard + page re-check + data layer (canViewReport/requireRole/requireFreshUser) + API re-check mỗi request. Không tìm thấy route báo cáo/PDF nào reachable mà thiếu guard.
- ✅ API routes là điểm sáng: /api/reports/[id]/view và /download kiểm tra auth + status===APPROVED + canViewReport trên MỌI request, không bao giờ tin token/JWT đơn lẻ (download còn re-fetch user từ DB sau khi consume token một lần).
- ✅ Cấu trúc route-group (public)/(client)/(admin) tách theo ranh giới quyền rất rõ; api/auth và api/reports đặt ngoài [locale] đúng vì độc lập locale; matcher loại trừ api/_next/static hợp lý.
- ✅ Route performance đúng chuẩn: mọi trang gated khai báo dynamic="force-dynamic" (không cache dữ liệu per-user), marketing/login/register là RSC tĩnh hoá được qua setRequestLocale + generateStaticParams, PDF viewer cô lập thành client island.
- ✅ Bảo mật qua routing: getReportBySlug/canViewReport trả null khi không có quyền và page gọi notFound() → báo cáo không được phép hiển thị giống hệt 404, không lộ sự tồn tại (not-found.tsx có chú thích đúng ý đồ này).
- ✅ i18n routing chỉn chu: localePrefix:always cho URL/hreflang ổn định, robots noindex toàn portal nhưng index landing page, dùng next-intl navigation helpers để bảo toàn locale prefix khi điều hướng.

---

### 6.20 Data Management & Modeling — 84/100 (B)

Tầng dữ liệu của Blackcrest có chất lượng cao và đáng tin cậy cho một portal tài sản: schema Prisma chuẩn hoá tốt, dùng enum đúng chỗ, có index (kể cả index keyset pagination), unique constraint hợp lý, CHECK XOR cho Entitlement và cascade rule được cân nhắc kỹ. Kỷ luật DTO rất tốt — mọi hàm server đều map tay sang DTO, không bao giờ trả nguyên Prisma row, passwordHash không hề rò rỉ ra client. Điểm trừ chính nằm ở validation chưa phủ hết một vài input (slug, rid) và đặc biệt là lỗ hổng logic: tokenVersion được lưu vào JWT và DB nhưng requireFreshUser KHÔNG so sánh nó, khiến cơ chế force re-login / vô hiệu hoá JWT khi suspend không thực sự hoạt động như tài liệu mô tả.

| Sub-tiêu chí | Điểm | Trạng thái | Ghi chú |
|---|:---:|:---:|---|
| Data modeling | 5/5 | strong | Schema chuẩn hoá tốt, enum/index/unique/CHECK XOR/cascade đều hợp lý và có chủ đích. |
| DTOs | 5/5 | strong | Mọi hàm server map tay sang DTO; không bao giờ trả nguyên Prisma row; passwordHash không rò rỉ. |
| Serialization | 4/5 | adequate | Date và Json? metadata vượt qua biên RSC dựa vào serialization mặc định của Next; chưa có lớp serialize tường minh. |
| Validation | 3/5 | adequate | Action ghi đều có zod, nhưng slug trong getReportBySlug và rid trong consumeDownloadToken chưa được validate. |
| Type safety | 4/5 | adequate | Kiểu Prisma xuyên suốt tốt, nhưng auth.config.ts dùng nhiều cast (as never, as string, as {role?}) làm yếu chuỗi kiểu. |
| Data normalization | 5/5 | strong | ReportTranslation tách đa ngôn ngữ, Entitlement group→report/category, không trùng lặp dữ liệu. |
| Data persistence | 3/5 | weak | tokenVersion lưu nhưng không so sánh nên JWT invalidation không hoạt động; lifecycle report approve/reject chưa persist (toast-only theo memory). |
| Migrations | 5/5 | strong | 3 migration sạch, có migration riêng cho CHECK XOR mà Prisma không biểu diễn được; migration_lock.toml hiện diện. |

**Findings:**

<details><summary><strong>DATA-01 · 🟠 HIGH — </strong> — tokenVersion được lưu nhưng không bao giờ được so sánh — cơ chế vô hiệu hoá JWT không hoạt động</summary>

- **Sub-tiêu chí:** Data persistence · **Effort:** S
- **Bằng chứng:** src/lib/rbac.ts:37-47 requireFreshUser() select tokenVersion ('select: { id: true, role: true, status: true, tokenVersion: true }') nhưng chỉ kiểm tra 'dbUser.status !== "APPROVED"', KHÔNG so sánh dbUser.tokenVersion với session. JWT chứa tokenVersion (src/auth.config.ts:27 'token.tokenVersion = ...') nhưng session callback (src/auth.config.ts:31-38) thậm chí không đưa tokenVersion vào session.user. src/server/accounts.ts:23 bump tokenVersion khi SUSPENDED ('tokenVersion: { increment: 1 }') — nhưng giá trị bump này không được đối chiếu ở đâu cả.
- **Tác động:** Lời hứa trong comment ('Bump tokenVersion on suspend so any live JWT is invalidated promptly', src/auth.config.ts:15, src/lib/rbac.ts:34) không được thực thi. Việc chặn user dựa hoàn toàn vào status === APPROVED; tokenVersion trở thành cột chết. Nếu sau này có thao tác 'force re-login' mà KHÔNG đổi status (ví dụ đổi mật khẩu, thu hồi phiên), JWT cũ vẫn hợp lệ tới hết maxAge (30 phút) — rủi ro cho portal tài sản.
- **Khuyến nghị:** Trong requireFreshUser so sánh dbUser.tokenVersion với tokenVersion trong JWT/session và throw nếu lệch; đưa tokenVersion vào session callback (src/auth.config.ts:31-38) để có giá trị đối chiếu. Hoặc loại bỏ cột nếu không dùng để tránh tạo cảm giác an toàn giả.
- **Kiểm chứng (, độ tin cậy undefined):** undefined

</details>

<details><summary><strong>DATA-02 · ⚪ LOW</strong> — Slug đầu vào của getReportBySlug không được validate bằng zod</summary>

- **Sub-tiêu chí:** Validation · **Effort:** S
- **Bằng chứng:** src/server/reports.ts:13-18 getReportBySlug nhận 'slug: string' và đưa thẳng vào 'prisma.report.findUnique({ where: { slug } })' không qua zod. Trái với chuẩn của phần còn lại (ví dụ download-actions.ts:16 'z.string().cuid().safeParse(reportId)').
- **Tác động:** Rủi ro thấp vì Prisma tham số hoá query nên không có SQL injection, và not-found trả null. Chỉ là thiếu nhất quán về kỷ luật validate input và không chặn được slug rỗng/quá dài sớm.
- **Khuyến nghị:** Validate slug bằng zod (ví dụ z.string().min(1).max(200).regex slug) ở đầu hàm, đồng bộ với các action khác.

</details>

<details><summary><strong>DATA-03 · ⚪ LOW</strong> — rid trong download token chỉ check typeof, không validate định dạng cuid</summary>

- **Sub-tiêu chí:** Validation · **Effort:** S
- **Bằng chứng:** src/lib/download-token.ts:46-47 'const { sub, jti, rid } = payload; if (!sub || !jti || typeof rid !== "string") return null;' — rid (reportId) chỉ kiểm tra là string, không validate cuid. Route download (src/app/api/reports/[id]/download/route.ts:34) có đối chiếu 'claim.reportId !== id' nên giảm rủi ro, nhưng giá trị vẫn được dùng làm reportId trả về claim.
- **Tác động:** Thấp: token do chính server ký nên payload đáng tin một phần, và đã có đối chiếu với param id ở route. Vẫn nên validate để defense-in-depth nhất quán.
- **Khuyến nghị:** Thêm z.string().cuid() cho rid (và có thể sub) khi giải mã token trước khi dùng.

</details>

<details><summary><strong>DATA-04 · ⚪ LOW</strong> — Cast kiểu thủ công trong JWT/session callback làm yếu end-to-end type safety</summary>

- **Sub-tiêu chí:** Type safety · **Effort:** S
- **Bằng chứng:** src/auth.config.ts:24-37 dùng nhiều cast: 'token.role = (user as { role?: string }).role', 'token.id = user.id as string', và session callback 'session.user.role = token.role as never; session.user.status = token.status as never'. Trong khi src/next-auth.d.ts:13-27 đã khai báo chính xác kiểu Role/UserStatus/tokenVersion cho User và JWT.
- **Tác động:** Các cast 'as never'/'as { role?: string }' vô hiệu hoá lợi ích của khai báo augmentation trong next-auth.d.ts; nếu schema enum đổi tên sẽ không bị compiler bắt tại điểm này. Runtime vẫn đúng nhưng mất an toàn kiểu.
- **Khuyến nghị:** Dựa vào module augmentation đã có (next-auth.d.ts) để bỏ cast: gán trực tiếp token.role = user.role, session.user.status = token.status mà không cần 'as never'.

</details>

<details><summary><strong>DATA-05 · 🔵 INFO</strong> — Date và Json? metadata vượt biên server→client dựa vào serialization ngầm định</summary>

- **Sub-tiêu chí:** Serialization · **Effort:** M
- **Bằng chứng:** DTO trả về các trường Date thô: src/server/reports.ts:34 'publishedAt: report.publishedAt', src/server/admin-data.ts:24 'createdAt: u.createdAt'; và src/server/admin-data.ts:76 'metadata: e.metadata' (kiểu Prisma JsonValue) được trả thẳng ra UI. Không có lớp serialize/zod-output tường minh; phụ thuộc vào cơ chế tuần tự hoá Date của Next RSC và format.ts:37-63 để hiển thị.
- **Tác động:** Hoạt động đúng trong Next 15 RSC, nhưng metadata là Json tự do không có schema đầu ra — nếu một AuditLog ghi metadata hình dạng lạ thì UI phải tự phòng thủ. Không phải lỗi, là nợ kỹ thuật về tính tường minh.
- **Khuyến nghị:** Cân nhắc định nghĩa zod output schema (hoặc kiểu hẹp) cho metadata theo từng AuditAction để tuần tự hoá có hợp đồng rõ ràng; giữ Date nguyên dạng là chấp nhận được với RSC.

</details>

<details><summary><strong>DATA-06 · 🔵 INFO</strong> — AuditLog/ReportAccessLog là append-only theo quy ước nhưng không được DB cưỡng chế</summary>

- **Sub-tiêu chí:** Data modeling · **Effort:** M
- **Bằng chứng:** prisma/schema.prisma:249-280 comment '(append-only)' và src/lib/audit.ts:6-7 'Never updated or deleted', nhưng không có trigger/REVOKE quyền UPDATE/DELETE ở migration. logAudit/logReportAccess (src/lib/audit.ts:16-45) nuốt lỗi bằng try/catch nên ghi audit có thể thất bại âm thầm (chỉ console.error).
- **Tác động:** Với portal tài sản, tính bất biến của audit trail là yêu cầu tuân thủ. Hiện tại chỉ là quy ước ở tầng ứng dụng; bất kỳ code/migration nào về sau đều có thể sửa/xoá log. Audit ghi best-effort cũng có thể mất sự kiện khi DB lỗi tạm thời.
- **Khuyến nghị:** Cưỡng chế ở DB: REVOKE UPDATE/DELETE trên AuditLog cho role ứng dụng, hoặc dùng trigger chặn. Cân nhắc cảnh báo/giám sát khi logAudit thất bại thay vì chỉ console.error.

</details>

<details><summary><strong>DATA-07 · 🔵 INFO</strong> — Seed dùng object literal 'as const' gán vào cột enum — dựa vào structural typing thay vì enum thật</summary>

- **Sub-tiêu chí:** Type safety · **Effort:** S
- **Bằng chứng:** prisma/seed.ts:19-26 mảng users khai báo 'role: "SUPER_ADMIN"' dạng string literal rồi '] as const', sau đó prisma.user.upsert truyền 'role: u.role' (seed.ts:32-33). Tương tự reports status/accessLevel (seed.ts:79-129). Hoạt động nhờ literal khớp enum, nhưng không import enum Role/ReportStatus từ @prisma/client.
- **Tác động:** Chỉ ở script seed (không phải runtime production). Nếu đổi tên một giá trị enum trong schema, seed có thể không báo lỗi biên dịch ngay tại điểm gán mà chỉ fail lúc chạy. Rủi ro rất thấp.
- **Khuyến nghị:** Tùy chọn: import và dùng enum từ @prisma/client (Role.SUPER_ADMIN...) trong seed để được kiểm tra kiểu chặt hơn.

</details>

**Điểm mạnh:**

- ✅ Schema Prisma chuẩn hoá xuất sắc: ReportTranslation tách đa ngôn ngữ (vi/en/zh) với unique [reportId, locale], Entitlement mô hình hoá group→report HOẶC group→category đúng đắn, không trùng lặp dữ liệu (prisma/schema.prisma:213-247).
- ✅ Ràng buộc CHECK XOR cho Entitlement được thêm bằng migration raw SQL riêng vì Prisma không biểu diễn được — đúng kỹ thuật: 'CHECK (("reportId" IS NOT NULL) <> ("categoryId" IS NOT NULL))' (prisma/migrations/20260617080152_entitlement_xor_check/migration.sql).
- ✅ Kỷ luật DTO tuyệt vời: mọi hàm trong src/server đều map tay sang object phẳng, KHÔNG trả nguyên Prisma row; passwordHash không bao giờ được select ngoài luồng auth; fileKey/storage path chủ động bị che (reports.ts:37 chỉ phơi 'hasFile: !!report.fileKey').
- ✅ Không có một truy vấn prisma nào trong tầng app/components (RSC/client) — toàn bộ truy cập DB nằm sau lớp server-only, kiểm chứng qua grep (chỉ health route, view/download route hợp lệ).
- ✅ Index thiết kế có chủ đích cho hiệu năng: index keyset pagination @@index([status, publishedAt, id]) khớp đúng orderBy trong listVisibleReports, cùng index trên các khoá ngoại và (action, createdAt)/(targetType, targetId) cho audit.
- ✅ Cascade rule được cân nhắc đúng ngữ cảnh: Report.category dùng onDelete: Restrict (không cho xoá category còn report), uploadedBy/grantedBy/actor dùng SetNull (giữ lịch sử), membership/translation/entitlement/log dùng Cascade.
- ✅ Validate đầu vào cho mọi server action ghi bằng zod với thông báo lỗi tiếng Việt, kể cả refine cross-field (auth-actions.ts:29-32 confirmPassword, entitlements.ts:19-21 XOR ở tầng app trùng khớp CHECK ở DB).
- ✅ Token tải xuống một lần được tiêu thụ nguyên tử qua updateMany có điều kiện 'consumedAt: null, expiresAt > now' và kiểm 'res.count !== 1' — chống race condition đúng cách (src/lib/download-token.ts:50-54).
- ✅ Module augmentation next-auth.d.ts khai báo chính xác Role/UserStatus/tokenVersion cho Session và JWT, neo kiểu vào enum Prisma thật.
- ✅ Có script verify-entitlements.ts tái hiện đúng visibleWhere để kiểm thử thuộc tính cô lập cross-group — một dạng kiểm thử dữ liệu hiếm thấy trong dự án không có test tự động.

---

## 7. Phụ lục — Các finding bị bác bỏ khi kiểm chứng

Những claim này đã được pass đối kháng đọc lại code và xác định là **không đúng / đã được mitigations ở tầng khác** — KHÔNG nên đưa vào việc cần làm.

- **UX-04 (UX/UI & Design System)** — ~~Luồng duyệt/từ chối báo cáo trong viewer chỉ là toast giả~~
  - Lý do bác bỏ: Claim cho rằng nút Phê duyệt/Từ chối chỉ gọi setToast giả, không gọi server action, và DB không đổi. Đọc code thực tế thì điều này SAI — luồng đã được nối hoàn chỉnh, đúng như chính recommendation của auditor.

1) pdf-viewer.tsx:8 import { reviewReport } from "@/server/report-actions" — có server action thật. Các line cited (956-958, 981-983, 1003-1005) đã lệch vì file được sửa (report-actions.ts là file server mới nhất, mtime 17:40).

2) Nút confirm trong Dialog phê duyệt (line 985-991, onClick line 994 = handleReview("approve")) và Dialog từ chối (line 1013-1019, onClick line 1022 = handleReview("reject")). KHÔNG còn bất kỳ setToast("approved")/setToast("rejected") nào trong onClick handler — grep xác nhận chỉ có handleReview tại 994/1022.

3) handleReview (line 669-691) gọi await reviewReport({reportId, decision, note}); CHỈ setToast khi res.ok === true (line 680-681) rồi router.refresh() (line 682); nếu lỗi thì setDownloadErr(res.error) (line 684). Đây đúng yêu cầu "chỉ hiện toast thành công sau khi action trả về OK".

4) report-actions.ts là server action ("use server"): requireRole("SUPER_ADMIN","APPROVER") (line 32, hàm tồn tại rbac.ts:26) → zod validate → prisma.report.update đổi ReportStatus (APPROVED/REJECTED/PUBLISHED) + set publishedAt khi publish (line 54-57) → logAudit ghi REPORT_APPROVE/REJECT/PUBLISH (line 59-70, hàm tồn tại audit.ts:9) → revalidatePath viewer + admin (line 72-73). Trạng thái DB THỰC SỰ chuyển + ghi audit log.

Về Timeline SidePanel (now line 1077-1092): build từ report.author, reviewerName, report.publishedAt (props thật từ RSC), không phải dữ liệu cứng như claim nói; chỉ vài cột ngày của giai đoạn nháp/gửi hiển thị "—" — đây là khiếm khuyết cosmetic nhỏ, không phải vấn đề "toast giả / không persist". Toàn bộ finding mô tả trạng thái code CŨ đã được remediate; severity high không còn đúng.
- **SEC-03 (Security — AuthZ, Entitlements, PDF, IDOR)** — ~~Vòng đời approve/publish chỉ là toast — audit REPORT_APPROVE/PUBLISH không bao giờ được ghi, và trạng thái không được kiểm soát phía server~~
  - Lý do bác bỏ: Finding bị bác bỏ — evidence đã lỗi thời và không khớp với code thực tế. (1) Tồn tại một Server Action thực sự: src/server/report-actions.ts định nghĩa reviewReport() — file này auditor không tìm thấy vì grep sai tên hàm (auditor tìm publishReport/approveReport/setReportStatus, nhưng hàm thực tên là reviewReport). File cũng không có trong FULL src TREE của prompt, tức snapshot tree lẫn auditor đều stale. (2) Trạng thái ĐƯỢC kiểm soát phía server: report-actions.ts:32 gọi requireRole("SUPER_ADMIN","APPROVER") (rbac.ts:26-30 -> requireAuth + kiểm tra role), trả lỗi "Bạn không có quyền duyệt báo cáo" nếu không đủ quyền; input được validate bằng zod (dòng 10-14, 37-38); DB được cập nhật bằng prisma.report.update với status APPROVED/REJECTED/PUBLISHED, và publish set publishedAt (dòng 41-57). (3) Audit ĐƯỢC ghi: report-actions.ts:59-70 gọi logAudit() với action REPORT_APPROVE/REPORT_REJECT/REPORT_PUBLISH (logAudit ghi vào prisma.auditLog, audit.ts:9-30), kèm metadata note. (4) UI KHÔNG còn toast-only: pdf-viewer.tsx:8 import reviewReport; handleReview (dòng 669-691) await reviewReport(...) rồi mới setToast + router.refresh() khi res.ok, và hiển thị res.error khi thất bại — không phải chỉ setDialog(null)/setToast. Các dòng evidence được trích (956-959 là nút zoom/fit; 980-983 là mở thẻ Dialog) hoàn toàn không phải handler approve/reject như mô tả. Tóm lại cả ba luận điểm cốt lõi (toast-only, không persist DB, không ghi audit, không kiểm soát server) đều sai.
- **CQ-01 (Code Quality)** — ~~Vòng đời duyệt/từ chối báo cáo chỉ là TOAST giả lập, không hề persist~~
  - Lý do bác bỏ: Bằng chứng được trích dẫn KHÔNG khớp với mã nguồn hiện tại — đây là finding cũ (stale), khớp với ghi chú handoff session-1 ("approve/reject toast-only") nhưng đã được fix. Tại pdf-viewer.tsx, nút Phê duyệt (:991-997) và Từ chối (:1019-1025) gọi `onClick={() => handleReview("approve"|"reject")}`, KHÔNG phải `setDialog(null); setToast(...)` như bằng chứng nói. `handleReview` (:669-691) là hàm async gọi Server Action thật `reviewReport` từ `@/server/report-actions` (import dòng 8), truyền `reportId`, `decision`, và `note: reviewNote` (ô Input ghi chú/lý do CÓ được submit qua state `reviewNote`, không phải "không gửi đi đâu"). Server action report-actions.ts (file này tồn tại dù không có trong cây file liệt kê) thực hiện đầy đủ: (1) `requireRole("SUPER_ADMIN","APPROVER")` (:32) chặn quyền; (2) validate zod; (3) `prisma.report.update` đổi status sang APPROVED/REJECTED/PUBLISHED (:54-57) — DB THỰC SỰ đổi; (4) `logAudit` ghi audit row REPORT_APPROVE/REPORT_REJECT/REPORT_PUBLISH kèm note làm metadata (:59-70); (5) `revalidatePath` cho viewer + admin list. Helper `requireRole` (rbac.ts:26-30) và `logAudit` (audit.ts:9-30) đều là code thật ghi DB qua Prisma. Các enum ReportStatus (APPROVED/PUBLISHED/REJECTED) và AuditAction (REPORT_APPROVE/REPORT_REJECT/REPORT_PUBLISH) đều tồn tại trong schema.prisma (:36-41, :62-73), nên đây không phải stub không build được. Toàn bộ recommendation của auditor (thay toast bằng Server Action gọi requireRole APPROVER, update status, logAudit, lưu note) ĐÃ được hiện thực sẵn. Finding sai hoàn toàn so với code thực tế.
