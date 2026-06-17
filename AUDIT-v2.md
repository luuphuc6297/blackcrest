# Blackcrest — Báo cáo RE-AUDIT (vòng 2)

> Cổng tài liệu đầu tư tư nhân (gated private-wealth PDF portal) · Next.js 15 · NextAuth v5 · Prisma + Postgres
>
> **Ngày:** 2026-06-17 (vòng 2) · **So với:** bản audit vòng 1 (58/100, C-) · **Phương pháp:** 20 auditor delta-aware phân loại lại từng finding cũ trên code hiện tại + kiểm chứng đối kháng các "fix được tuyên bố" cho Critical/High + finding mới + tổng hợp chấm điểm.

## Kết quả tổng: 58 → 60/100 (C-)  ·  delta **+2**

| | Vòng 1 | Vòng 2 |
|---|---|---|
| Điểm tổng | 58/100 (C-) | **60/100 (C-)** |
| Verdict go-live | NO-GO | **NO-GO** (chưa đổi) |

**Trạng thái 163 finding cũ:** ✅ 12 đã fix · 🟡 27 vá một phần · 🔴 121 còn · ⛔ 1 hồi quy · ⚫ 2 (đã bác bỏ trước).

**Kiểm chứng đối kháng các "fix" Critical/High:** ✅ 1 thật · 🟡 9 chưa trọn · ❌ 0 fix giả · 🔧 0 chỉnh. → Phần lớn fix Critical/High chỉ đạt mức **một phần** — pattern "fix lệch trọng tâm / comment thay vì code".

**Finding mới phát hiện:** 🔴 1 · 🟠 7 · 🟡 25 · ⚪ 39 · 🔵 5.

> ### ⚠️ Đính chính quan trọng — code thay đổi LIVE trong lúc audit
> Trong lúc re-audit chạy, bạn vẫn đang sửa code. Một số auditor đọc **snapshot cũ hơn**. Tôi đã kiểm tra trực tiếp trên đĩa để đính chính:
> - **PB-01 (upload PDF) — THỰC TẾ ĐÃ FIX**, không phải "still_open". Luồng đầy đủ đã tồn tại: `upload-dialog.tsx` (FormData → `POST /api/admin/reports`) → route handler validate (`zod`, magic-byte `%PDF`, `MAX_BYTES` 25MB, `requireRole`) → `storage` + tạo `Report` + `logAudit`. File tạo lúc 21:45, sau khi auditor product-business đọc.
> - **Dockerfile** đã copy `prisma` schema/migrations + `@prisma+client` và chạy `USER nextjs` (non-root). Nhưng `migrate deploy` **vẫn `|| true`** (nuốt lỗi) trong `docker-compose.prod.yml:43`, và runner **thiếu Prisma CLI/engine** → migrate vẫn fail âm thầm. (đã verify)
> - **Secret fail-fast: CHƯA làm** — `download-token.ts:12` vẫn `?? "insecure-dev-download-secret"`. **CSP/HSTS: chưa có. robots/sitemap: chưa có. Viewer: vẫn "VISUAL recreation". git/CI/test/ESLint: vẫn chưa có.** (đã verify trực tiếp)

---

## 1. Tóm tắt điều hành

So với mốc 58/100 (C-) của vòng audit trước, điểm tổng RE-AUDIT chỉ nhích lên 60/100 (C-) — delta thực chất +2, gần như đi ngang. Đây là kết quả của một vòng sửa "lệch trọng tâm": developer đã làm tốt và THẬT ở tầng UI/i18n/lifecycle (vòng đời duyệt/từ chối/phát hành báo cáo nay persist xuống DB + ghi audit bất biến qua report-actions.ts, bộ primitive DataTable/StatCard/EmptyState + lib/status.ts SSOT, chrome ứng dụng đã đa ngôn ngữ, deep-linking/open-redirect đã vá sạch, noindex mặc định cho route gated, và quan trọng: luồng UPLOAD PDF nay đã CÓ THẬT qua Route Handler /api/admin/reports + dialog UI — trái với mô tả "no-op" ở một số dimension). NHƯNG mọi finding nghiêm trọng nhất quyết định khả năng go-live vẫn nguyên vẹn và phần lớn được xác minh đối kháng là FAKE FIX: cơ chế thu hồi phiên tokenVersion vẫn hoàn toàn vô hiệu (session callback KHÔNG propagate tokenVersion, requireFreshUser select nhưng KHÔNG so sánh — đã verify tận code), DOWNLOAD_TOKEN_SECRET vẫn fallback hardcode "insecure-dev-download-secret", không CSP/HSTS, lệnh migrate deploy vẫn "|| true" che lỗi trong khi runner Dockerfile thiếu Prisma CLI/engine (migrate chắc chắn fail), thư mục nginx/certbot không tồn tại (nginx prod không cold-start được), 0 test tự động, và dự án VẪN không nằm dưới git/CI. Điểm tăng nhẹ phản ánh chất lượng code-craft cải thiện thật, nhưng rủi ro launch không giảm.

### Mức độ sẵn sàng go-live

CHƯA SẴN SÀNG GO-LIVE (NO-GO) — không thay đổi verdict so với vòng trước. Vẫn còn ít nhất 6 blocker P0 mang tính chặn-launch tuyệt đối, phần lớn đã được xác minh đối kháng là "fix giả": (1) nginx prod KHÔNG thể cold-start vì thiếu nginx/certbot dir + cert (INFRA-02) — đã verify dir không tồn tại; (2) migrate deploy "|| true" + runner thiếu Prisma CLI/engine → schema lệch âm thầm khi release (BD-10 critical, fixVerdict=confirmed) — đã verify Dockerfile chỉ copy @prisma+client*; (3) cơ chế thu hồi phiên tokenVersion vô hiệu, suspend/giáng quyền không có hiệu lực tức thì tới 30 phút (SEC-12/DATA-01/SEC-01, fixVerdict=confirmed cho SEC-12) — đã verify session callback bỏ tokenVersion; (4) DOWNLOAD_TOKEN_SECRET fallback hardcode, prod thiếu env → forge được token (SEC-02/API-11) — đã verify còn nguyên; (5) 0 test tự động trên một portal security-first (TEST-01 critical); (6) không git/không CI/không rollback (PROC-01 P0, BD-01..06). Trước khi nghĩ tới go-live, phải đóng nhóm secret/session-revocation/CSP, dựng được hạ tầng TLS, sửa migrate fail-fast, và đưa dự án vào git + CI tối thiểu chạy typecheck + verify-entitlements.

---

## 2. Bảng so sánh điểm theo mảng (vòng 1 → vòng 2)

| Mảng | Vòng 1 | Vòng 2 | Δ | Nhận định |
|---|:---:|:---:|:---:|---|
| Localization (i18n) | 42 | **66 C+ / D+ → C** | 🟢 +24 | Chrome ứng dụng đã đa ngôn ngữ vững; thân viewer + format tiền tệ/số vẫn khoá cứng vi-VN |
| SEO | 52 | **61 D+** | 🟢 +9 | SEO của Blackcrest đã có một cải thiện nền tảng quan trọng: root layout `src/app/[locale]/layout.tsx:17` nay đặt `robots: { index: false, follow: fals |
| Product & Business | 52 | **58 C-** | 🟢 +6 | Lifecycle persist thật + upload PDF nay đã có (trái mô tả no-op), nhưng viewer vẫn mô phỏng, EDITOR phi chức năng |
| UX/UI & Design System | 68 | **74 C** | 🟢 +6 | AppShell responsive + bộ primitive chuẩn hoá tốt; dark mode vẫn code chết, PDF viewer desktop-only tuyệt đối |
| Team & Process | 31 | **37 D+** | 🟢 +6 | README viết lại tốt; vẫn không git/CI/review/LICENSE — toàn bộ trục version-control ở vạch xuất phát |
| Accessibility (A11y) | 58 | **63 D+** | 🟢 +5 | Reduced-motion + contrast light đạt AA; Dialog vẫn thiếu focus-trap, regression contrast ink-4 dark (3.45:1) |
| State Management | 68 | **72 C+** | 🟢 +4 | Approval persist thật + revalidate đúng; zustand/React Query vẫn dead, timeline hardcode |
| Frontend Architecture | 82 | **85 B+** | 🟢 +3 | DataTable/StatCard/EmptyState + lib/status.ts SSOT xuất sắc; god component pdf-viewer phình thêm 51 dòng |
| Build & Delivery | 31 | **34 D** | 🟢 +3 | Upload Route Handler đúng kiến trúc; migrate '|| true' + runner thiếu Prisma CLI = critical fail (verify) |
| Routing | 82 | **84 B** | 🟢 +2 | Deep-linking/open-redirect vá sạch; status re-check ở layout + requireRole listAdminReports vẫn thiếu |
| Testing | 8 | **10 F** | 🟢 +2 | Vẫn 0 test/0 runner/0 CI; chỉ testability nhích nhẹ nhờ lifecycle action có thể test được |
| Observability | 38 | **40 D** | 🟢 +2 | Audit-write coverage tốt hơn; không error tracking/structured log/alert, health chưa nối container |
| Infrastructure | 52 | **53 C** | 🟢 +1 | Upload đúng kiến trúc; nginx/certbot dir thiếu (không boot được), backup plaintext, không TLS hardening |
| Data Management & Modeling | 84 | **82 B** | 🔴 -2 | Schema chuẩn hoá mạnh, action mới zod-validate; tokenVersion vẫn chết dù comment khẳng định đã sửa |
| Performance | 76 | **74 B** | 🔴 -2 | RSC-first vững, thumbnail dùng transform GPU; canvas vẫn dùng zoom reflow, React Query thừa trong bundle |
| Security — AuthN, Session, Secrets, Web | 62 | **60 C-** | 🔴 -2 | 11/11 finding vẫn open: tokenVersion vô hiệu (verify), secret fallback, không CSP/HSTS, enumeration |
| Security — AuthZ, Entitlements, PDF, IDOR | 78 | **76 B** | 🔴 -2 | Entitlement isolation + lifecycle RBAC thật; tokenVersion chết, thiếu state-machine, suspend rò 30 phút |
| Code Quality | 72 | **70 C+** | 🔴 -2 | TS sạch + primitive mới tốt; ESLint/Prettier vẫn vắng, pdf-viewer phình (regression), 4 mẫu lỗi |
| Dependencies | 68 | **66 C** | 🔴 -2 | Gom icon + next minor bump; postcss moderate vẫn để nguyên, zustand/React Query vẫn dead, next-auth beta |
| API Layer & Server Actions | 68 | **63 C** | 🔴 -5 | Giảm điểm: rate limiting/timeout/pagination 0 tiến triển, secret fallback hardcode, lỗi vẫn lẫn ngôn ngữ |

> Lưu ý: vài mảng tụt điểm vì lần đọc lại làm lộ issue mới (vd New findings từ code mới), không phải vì code xấu đi.

---

## 3. Đã fix (đã qua kiểm chứng)

- ✅ **Vòng đời duyệt/từ chối/phát hành báo cáo nay persist THẬT: reviewReport (report-actions.ts) validate zod → requireRole → prisma.update(status+publishedAt) → logAudit bất biến (REPORT_APPROVE/REJECT/PUBLISH) → revalidatePath, viewer gọi action thật thay toast giả** _(State Management)_
- ✅ **revalidation lifecycle đúng chuẩn: revalidatePath cho viewer slug + admin reports ngay trong Server Action (STATE-05)** _(State Management)_
- ✅ **Deep-linking + chống open-redirect đã vá sạch: callbackUrl đọc từ searchParams → hidden field → validate qua safeInternalPath (chặn // và URL không bắt đầu bằng /) → dùng làm redirectTo (ROUTE-01)** _(Routing)_
- ✅ **Reduced-motion guard toàn cục trong globals.css bao mọi animation/transition/keyframe — vượt yêu cầu (A11Y-05)** _(Accessibility (A11y))_
- ✅ **DataTable/StatCard/EmptyState là server component thuần, không hook, không 'use client' — không tăng client bundle dù dùng rộng (FA-03/Perf)** _(Frontend Architecture)_
- ✅ **lib/status.ts trở thành single source of truth cho status→tone/key (Record kiểu chặt, serialize được, dùng chung RSC+island) — xoá 5 bản sao status map (FA-02)** _(Frontend Architecture)_
- ✅ **DOT_BG đưa về module-level trong stat-card.tsx, không tạo lại trong thân RSC mỗi render (FA-06)** _(Frontend Architecture)_
- ✅ **Prop chết downloadUrl đã loại khỏi PdfViewerProps và page.tsx — contract island tối giản (FA-08)** _(Frontend Architecture)_
- ✅ **i18n: error.tsx + not-found.tsx dùng next-intl namespace Errors đầy đủ vi/en/zh (I18N-05)** _(Localization (i18n))_
- ✅ **i18n: toàn bộ trang admin/portal (audit/reports/entitlements/accounts) + nhãn hành động/đối tượng audit map qua key dịch theo enum (I18N-06)** _(Localization (i18n))_
- ✅ **SEO: root layout đặt robots:{index:false,follow:false} mặc định → mọi route gated (/portal,/admin) + login/register tự noindex; landing override index:true** _(SEO)_
- ✅ **SEO: nội dung landing en/zh đã localize THẬT (không còn duplicate-content tiếng Việt sao chép)** _(SEO)_
- ✅ **Upload PDF nay đi qua Node Route Handler /api/admin/reports (formData + magic-byte %PDF + zod + MAX_BYTES + rollback) — KHÔNG qua Server Action 1MB; có dialog UI thật (upload-dialog.tsx) POST multipart, xử lý success/error (BD-08/INFRA-12)** _(Build & Delivery)_
- ✅ **README.md viết lại đầy đủ: stack, các bước chạy local, tài khoản mẫu, scripts, tóm tắt bảo mật, cấu trúc thư mục — onboarding cải thiện rõ (PROC-04 phần README)** _(Team & Process)_
- ✅ **Token tải xuống vòng đời an toàn (one-time atomic updateMany count===1, TTL 60s) + download route re-validate user active + entitlement SAU khi consume — defense-in-depth giữ vững (nền tảng, không phải fix mới nhưng còn nguyên)** _(Security — AuthZ, Entitlements, PDF, IDOR)_

---

## 4. Blocker còn lại (đã verify vẫn mở)

**1. [P0] nginx prod không cold-start được: thiếu nginx/certbot dir + cert chưa cấp** _(Infrastructure)_
> Đã verify thư mục nginx/certbot KHÔNG tồn tại; bind mount sẽ tạo dir rỗng, 443 trỏ fullchain.pem/privkey.pem không có thực → nginx FAIL boot lần đầu. Không có self-signed bootstrap, không service certbot, không HTTP-only stage. Chặn launch tuyệt đối (INFRA-02).

**2. [P0] migrate deploy '|| true' nuốt lỗi + runner thiếu Prisma CLI/engine** _(Build & Delivery)_
> fixVerdict=confirmed (BD-10 critical). Đã verify compose vẫn 'node node_modules/prisma/build/index.js migrate deploy || true' và Dockerfile chỉ copy @prisma+client*, KHÔNG copy .pnpm/prisma@* hay @prisma+engines, không symlink node_modules/prisma → lệnh migrate chắc chắn fail rồi bị che, web start với schema cũ/lệch.

**3. [P0] Cơ chế thu hồi phiên tokenVersion hoàn toàn vô hiệu (fix giả)** _(Security — AuthN, Session, Secrets, Web)_
> fixVerdict=confirmed (SEC-12). Đã verify session callback KHÔNG đưa tokenVersion vào session.user và requireFreshUser select tokenVersion nhưng KHÔNG BAO GIỜ so sánh. Suspend/giáng quyền (SUPER_ADMIN→CLIENT) không có hiệu lực tức thì — JWT cũ vẫn dùng tới hết maxAge 30 phút. Comment khẳng định 'đã re-check' là sai sự thật.

**4. [P0] DOWNLOAD_TOKEN_SECRET fallback hardcode, không fail-closed ở production** _(Security — AuthN, Session, Secrets, Web)_
> Đã verify download-token.ts:12 vẫn dùng ?? 'insecure-dev-download-secret'. Nếu prod quên set env, token tải xuống ký bằng secret công khai → kẻ tấn công tự forge. Cần z.string().min(32).parse + throw lúc boot (SEC-02/API-11).

**5. [P1] Không có CSP/HSTS ở bất kỳ tầng nào** _(Security — AuthN, Session, Secrets, Web)_
> Đã verify next.config.ts không có headers() và nginx chỉ có 3 header cơ bản, không Strict-Transport-Security/CSP/Permissions-Policy. Đặc biệt nguy hiểm với PDF viewer (cần object-src/frame-ancestors) (SEC-03/SEC-05/INFRA-03).

**6. [P0] 0 test tự động trên portal security-first** _(Testing)_
> TEST-01 critical. Không vitest/jest/playwright, không file test. Các bất biến bảo mật cốt lõi (consumeDownloadToken single-use, canViewReport isolation, requireRole/requireFreshUser, reviewReport RBAC) hoàn toàn không được phủ. verify-entitlements.ts copy logic visibleWhere (private, không export) nên drift không bị bắt.

**7. [P0] Dự án không nằm dưới git, không CI/CD/rollback** _(Team & Process)_
> Đã verify không có .git và .github. Không baseline/lịch sử/rollback, không branch protection, không required check (typecheck/verify-entitlements chỉ chạy tay). Mọi quy trình hạ nguồn (PR review cho src/lib/authz.ts, src/auth*) không thể tồn tại (PROC-01..06, BD-01..06).

**8. [P1] Rate limiting tầng ứng dụng cho login/register/download vắng mặt** _(API Layer & Server Actions)_
> API-01 still_open. Không dependency, không 429/Retry-After. Brute-force mật khẩu + lạm dụng sinh PDF watermark tốn CPU. nginx limit_req chỉ áp /api/auth/, KHÔNG áp Server Action register/login (SEC-14).

---

## 5. Rủi ro hàng đầu

1. **[P0] Hàng loạt 'fix giả' được tuyên bố nhưng xác minh đối kháng bác bỏ — không thể tin self-report** _(Security — AuthN, Session, Secrets, Web)_ — tokenVersion (SEC-12/DATA-01/SEC-01/SEC-04), migrate Prisma (BD-10), comment next.config về upload streaming, comment providers.tsx về React Query 'dùng cho admin tables' — nhiều nơi developer thêm comment khẳng định đã làm trong khi code không làm. Đây là rủi ro quy trình: thiếu cơ chế verify (test/CI) nên fix giả lọt qua.
2. **[P0] Suspend/giáng quyền không có hiệu lực tức thì — cửa sổ rò 30 phút** _(Security — AuthZ, Entitlements, PDF, IDOR)_ — tokenVersion vô hiệu + view route tin session.user.status từ JWT (SEC-10) → user vừa bị SUSPENDED vẫn xem được metadata HTML và (qua view route) PDF tới hết maxAge. Với portal private-wealth, đây là rủi ro rò rỉ tài sản nhạy cảm.
3. **[P0] Hạ tầng release vỡ ngầm: nginx không boot + migrate fail bị che** _(Infrastructure)_ — Hai blocker hạ tầng (INFRA-02 certbot, BD-10 migrate) kết hợp khiến lần deploy đầu tiên hoặc thất bại lộ liễu (nginx) hoặc thất bại âm thầm nguy hiểm hơn (web chạy với schema cũ). Không có HEALTHCHECK container nên orchestrator không phát hiện app chết.
4. **[P1] Backup PII định chế plaintext rời lãnh thổ + không có restore test** _(Infrastructure)_ — INFRA-04/INFRA-11 still_open. db dump + tar PDF plaintext rclone sync thẳng remote, không gpg/crypt, không restore.sh, không verify dump. PII private-wealth lộ ở dạng đọc được, và backup có thể không khôi phục được khi cần.
5. **[P1] Crown-jewel PDF viewer vẫn là mô phỏng + desktop-only, không render PDF thật** _(Product & Business)_ — PB-06 still_open + UX-13 confirmed. Viewer vẫn 5 trang HTML hardcode, không nhúng pdf.js dù endpoint Range/206 đã có; 100% desktop-only (rail 168px + panel 320px + trang 794px cứng). Value proposition 'kiểm soát đến từng trang' chưa được hiện thực ở tầng hiển thị.
6. **[P2] Lỗ hổng postcss moderate vá rẻ qua overrides nhưng bị bỏ qua** _(Dependencies)_ — DEP-04/DEP-08. next@15.5.19 vẫn ghim transitive postcss@8.4.31 (<8.5.10, GHSA-qx2v-qp2m-jg93); chỉ cần vài dòng pnpm overrides nhưng không được thêm. Cùng với next-auth beta.31 không test (DEP-01) là nợ bảo mật dependency tích luỹ.

---

## 6. Chủ đề xuyên suốt

- Fix lệch trọng tâm: công sức dồn vào UI/i18n/design-system (làm tốt, thật) trong khi các trục launch-critical (security session-revocation, hạ tầng TLS/migrate, testing, git/CI) gần như không được động tới
- Hội chứng 'comment thay vì code': nhiều fix được tuyên bố qua comment (tokenVersion re-check, React Query cho admin tables, upload streaming) mà code không thực hiện — hệ quả trực tiếp của việc thiếu test/CI để bắt fix giả
- Thiếu vòng phản hồi chất lượng: không git, không CI, không ESLint/Prettier, 0 test → không có cơ chế nào ngăn regression hay xác minh tuyên bố; verify-entitlements.ts đã có nhưng copy logic và không được nối vào gate nào
- Hạ tầng vận hành chưa từng được chạy thử end-to-end: nginx certbot dir thiếu, migrate command tham chiếu path không tồn tại trong runner, HEALTHCHECK vắng — dấu hiệu chưa ai thực sự build+deploy container một lần
- Dead infrastructure tích luỹ: zustand + React Query (provider rỗng, 0 useQuery/useMutation) vẫn trong bundle; Switch/Tag không dùng; nhánh publish của reviewReport mồ côi — code mô tả năng lực chưa tồn tại
- Nền tảng kiến trúc bảo mật/dữ liệu thật sự vững (canViewReport EXISTS tương quan ở mọi route, one-time download token atomic, Argon2id, schema chuẩn hoá, RSC-first) — đây là lý do điểm không tụt; điểm yếu nằm ở 'fresh status', hạ tầng và process, không ở thiết kế lõi
- Mâu thuẫn giữa các dimension cần dung hoà: Product/State báo 'upload no-op' trong khi Build/Infra xác nhận upload Route Handler đã thật và có UI dialog — bằng chứng code nghiêng về phía upload ĐÃ tồn tại; cần thống nhất nhận định

---

## 7. Lộ trình ưu tiên (cập nhật)

### P0 — Chặn launch (làm ngay)

- **(S) git init + commit baseline + push lên remote private; thêm CI tối thiểu (GitHub Actions) chạy pnpm typecheck + verify-entitlements trên mỗi PR**
  - Điều kiện tiên quyết cho mọi quy trình chất lượng còn lại (review, gate, rollback) và là cơ chế duy nhất bắt được 'fix giả' đã lặp lại nhiều vòng. .gitignore đã sẵn sàng (loại .env, /storage/); lưu ý loại AUDIT.md 323KB. _(Team & Process)_
- **(S) Sửa cơ chế thu hồi phiên: propagate token.tokenVersion vào session.user + khai báo next-auth.d.ts, rồi so sánh dbUser.tokenVersion !== session.user.tokenVersion trong requireFreshUser và ép re-login khi lệch; bump tokenVersion khi đổi role**
  - fixVerdict=confirmed SEC-12 — fix giả 2 vòng liên tiếp. Không có cái này, suspend/giáng quyền vô nghĩa tới 30 phút, vi phạm cốt lõi 'kiểm soát truy cập tức thì' của portal private-wealth. Effort nhỏ, tác động bảo mật rất lớn. _(Security — AuthN, Session, Secrets, Web)_
- **(S) Loại bỏ fallback DOWNLOAD_TOKEN_SECRET: z.string().min(32).parse(process.env.DOWNLOAD_TOKEN_SECRET) throw lúc boot khi NODE_ENV=production; soát cùng pattern cho AUTH_SECRET**
  - API-11 fixVerdict=adjusted; đã verify fallback hardcode còn nguyên. Prod thiếu env → forge download token. Fail-closed là vài dòng code. _(API Layer & Server Actions)_
- **(M) Sửa pipeline migrate: tách thành init/one-shot job chạy 'pnpm exec prisma migrate deploy' fail-fast (bỏ '|| true') từ image có đủ Prisma CLI + @prisma+engines; verify bằng build+run container thật**
  - BD-10 critical fixVerdict=confirmed — đã verify runner thiếu CLI/engine. Migrate fail âm thầm = chạy prod với schema lệch, rủi ro mất/hỏng dữ liệu khi release. _(Build & Delivery)_
- **(M) Dựng hạ tầng TLS prod chạy được: tạo nginx/certbot/{www,conf}, thêm service certbot + HTTP-only bootstrap stage, self-signed fallback, tài liệu quy trình renew; thêm HEALTHCHECK container web + nginx depends_on condition:service_healthy**
  - INFRA-02 + OBS-02/OBS-08 — nginx prod không cold-start được hiện tại. /api/health đã sẵn sàng, chỉ thiếu wiring. Chặn launch tuyệt đối. _(Infrastructure)_
- **(M) Viết test suite bảo mật ưu tiên 1: vitest + test DB cho consumeDownloadToken single-use (mint→consume→consume lần 2→null, 5 promise đồng thời), canViewReport isolation/staff-bypass, requireRole/requireFreshUser, reviewReport RBAC (EDITOR/CLIENT→ok:false). Export visibleWhere để verify script và app dùng chung**
  - TEST-01/TEST-10/TEST-11 — portal security-first với 0 test là rủi ro chất lượng cao nhất; cũng là hàng rào duy nhất chống fix giả tái diễn. _(Testing)_

### P1 — Bắt buộc trước khi đón khách thật

- **(M) Thêm CSP + HSTS + Permissions-Policy (next.config headers() hoặc nginx), cấu hình object-src/frame-ancestors cho PDF viewer; thêm ssl_ciphers Mozilla intermediate + ssl_dhparam + OCSP stapling**
  - SEC-03/SEC-05/INFRA-03 — thiếu lớp phòng thủ web cơ bản trên một surface render PDF. Tăng điểm SSL Labs và chặn XSS/clickjacking. _(Security — AuthN, Session, Secrets, Web)_
- **(M) Thêm rate limiting tầng app cho login/register/download (theo IP+email, store Postgres/Redis) hoặc mở rộng nginx limit_req cho path Server Action; thêm guard transition state-machine + guard actor!=target cho lifecycle/account actions**
  - API-01/SEC-14 (brute-force, lạm dụng watermark CPU) + SEC-09/SEC-N4 (publish thẳng DRAFT, tự-suspend). Đóng các đường lạm dụng và privilege-escalation ngang. _(API Layer & Server Actions)_
- **(M) Mã hoá backup (gpg/rclone crypt) + viết scripts/restore.sh + restore-verify job hàng tháng + alert khi backup fail; sửa tên container backup.sh khớp compose**
  - INFRA-04/INFRA-11/BD-09 — PII private-wealth plaintext rời lãnh thổ và không có đường khôi phục đã được kiểm chứng. Yêu cầu compliance/pháp lý. _(Infrastructure)_
- **(L) Hiện thực render PDF thật (pdf.js nhúng vào canvas viewer dùng endpoint Range/206 đã có) + responsive viewer dưới breakpoint (rail/panel thành drawer, trang co theo container)**
  - PB-06 + UX-13 confirmed — crown jewel vẫn là mô phỏng desktop-only, chưa hiện thực value proposition và không dùng được trên mobile. _(Product & Business)_

### P2 — Hoàn thiện sản phẩm & vận hành

- **(S) Vá postcss qua pnpm overrides (>=8.5.10) + chạy pnpm audit; gỡ dead deps zustand & React Query (hoặc dùng thật); thêm experimental.optimizePackageImports:['lucide-react']; ghim chính xác phiên bản Prisma**
  - DEP-04/DEP-08/DEP-02/DEP-03/DEP-06/BD-12 — vá lỗ hổng đã biết rất rẻ, giảm bundle, làm build tái lập. _(Dependencies)_
- **(S) Thêm ESLint flat config (next/core-web-vitals + @typescript-eslint) + Prettier; nối vào CI; thêm husky/lint-staged pre-push chạy typecheck**
  - PROC-06/CQ-03 — script lint hiện mồ côi (no-op). Hàng rào tự động để giữ chất lượng nhất quán giữa các vòng. _(Code Quality)_
- **(M) Hoàn thiện lifecycle UI: nút Phát hành trong SidePanel khi status===APPROVED gọi reviewReport({decision:'publish'}); timeline suy từ report.status + audit thật thay vì hardcode 4 bước; submitForReview cho EDITOR (DRAFT→REVIEW)**
  - PB-10/PB-11/STATE-N1/SEC-11 — nhánh publish mồ côi, timeline bịa đặt, EDITOR phi chức năng. Hoàn thiện vòng đời đã có nền persist thật. _(State Management)_

### P3 — Polish & dài hạn

- **(L) i18n hoá thân tài liệu viewer + format số/tiền tệ/% theo locale (bỏ 'tỷ'/'tr' cứng); generateMetadata async theo locale; thêm hreflang+canonical+metadataBase; robots.ts/sitemap.ts/manifest/favicon/OG image**
  - I18N-01/I18N-03/SEO-NEW-01(confirmed)/SEO-02..07 — hoàn thiện đa ngôn ngữ và SEO marketing; hreflang là rủi ro mới sau khi index cả 3 locale. _(Localization (i18n))_

### ⚡ Quick wins

- Đưa tokenVersion vào session callback + so sánh trong requireFreshUser — vài dòng, đóng blocker bảo mật P0 đã giả 2 vòng (SEC-12)
- Bỏ fallback hardcode DOWNLOAD_TOKEN_SECRET, thay bằng z.string().min(32).parse + throw ở boot (API-11)
- Thêm pnpm overrides ép postcss>=8.5.10 rồi pnpm install — vá lỗ hổng moderate đã biết bằng vài dòng (DEP-08)
- git init + commit baseline (.gitignore đã sẵn sàng; nhớ loại AUDIT.md 323KB) — mở khoá toàn bộ trục process (PROC-01)
- Đồng bộ ngưỡng upload: nâng nginx client_max_body_size lên 25m khớp MAX_BYTES (BD-11/INFRA-N01)
- Thêm HEALTHCHECK CMD wget /api/health vào Dockerfile + healthcheck service web trong compose — endpoint đã sẵn (INFRA-N03/OBS-02)
- Nâng --color-text-quaternary dark lên ≥#8b9099 để vá regression contrast ink-4 dark (3.45:1) sau khi chỉ sửa light theme (A11Y-14 confirmed)
- Thay <a href='/'> bằng <Link locale> trong not-found.tsx — giữ locale, tránh full reload (ROUTE-06/UX-05)
- Thêm script 'verify:entitlements' vào package.json và export visibleWhere để verify script + app dùng chung code path (TEST-10/BD-13)
- Bỏ STATUS_LABEL trùng key trong pdf-viewer, dùng REPORT_STATUS[..].key (FA-NEW-01/CQ-14)

---

## 8. Chi tiết delta theo từng mảng

### 8.1 Testing — 8 → 10/100 (F) 🟢 +2

**Delta:** Cải thiện DUY NHẤT có liên quan gián tiếp: server action reviewReport đã được hiện thực thật (src/server/report-actions.ts) và nối vào viewer (pdf-viewer.tsx:9,677-689), thay cho toast giả trước đây — nhưng vẫn KHÔNG có test nào cho nó. Mọi thứ khác về testing GIỮ NGUYÊN so với lần audit trước: vẫn 0 file test, 0 test runner, 0 config (no .git, no .github/CI). verify-entitlements.ts được sửa đổi (mtime mới) nhưng phần cốt lõi vẫn SAO CHÉP visibleWhere (lines 11-21) thay vì import — và thực tế authz.ts giữ visibleWhere ở dạng private (không export, authz.ts:30), nên việc import là bất khả thi nếu không refactor. Coverage thực tế vẫn 0%. Điểm chỉ tăng nhẹ 8→10 vì lifecycle code giờ có thể test được (testability cải thiện), không phải vì có test.

**Hiện trạng:** Dự án vẫn KHÔNG có bất kỳ kiểm thử tự động nào và KHÔNG có test runner. Tìm kiếm toàn bộ cây không thấy file *.test.* / *.spec.* nào, không có thư mục __tests__, không có vitest/jest/playwright trong package.json devDependencies cũng như trong node_modules/.bin. package.json chỉ có scripts dev/build/start/lint/typecheck/db:*, không có "test" hay "test:e2e". Hai script ad-hoc (scripts/verify-entitlements.ts, scripts/generate-sample-pdfs.ts) vẫn là script chạy tay phụ thuộc DB seed, không phải test tự động. Khuyến nghị quan trọng nhất từ audit trước (consumeDownloadToken single-use, canViewReport isolation, requireRole/requireFreshUser) vẫn hoàn toàn không được phủ test. Đối với một cổng tài sản security-first, đây vẫn là rủi ro chất lượng nghiêm trọng nhất của dự án.

<details><summary><strong>Trạng thái finding cũ (9)</strong></summary>

| ID | Trạng thái | Kiểm chứng fix | Ghi chú |
|---|---|---|---|
| TEST-01 | 🔴 CÒN |  | Vẫn không tồn tại bất kỳ kiểm thử tự động nào. Không có vitest, không có Playwright, không có script test trong package.json. Ba mục tiêu ưu tiên tuần 1 (consumeDownloadToken single-use ở download-token.ts:50-54, canViewReport staff-bypass + isolation ở authz.ts:15-27, requireRole/requireFreshUser ở rbac.ts:26-47) vẫn hoàn toàn không có test. Critical, y nguyên. |
| TEST-02 | 🔴 CÒN |  | KHÔNG được sửa đúng. File có mtime mới (15:53) nhưng vẫn SAO CHÉP nguyên logic visibleWhere thay vì import từ src/lib/authz.ts. Tệ hơn: visibleWhere trong authz.ts vẫn là hàm private không export, nên không thể import nếu không refactor; còn canViewReport/listVisibleReports (code path thật của app) thì script không gọi. Drift giữa script và production code vẫn không được bắt — đúng bản chất finding ban đầu. |
| TEST-03 | 🔴 CÒN |  | Tính single-use vẫn chỉ dựa vào count===1 của updateMany, không có integration test nào (mint→consume→consume lần 2→null, hết hạn, JWT giả, 5 promise đồng thời). Logic atomic về mặt code là hợp lý nhưng hoàn toàn không được kiểm chứng tự động. |
| TEST-04 | 🟡 VÁ MỘT PHẦN |  | Phần HIỆN THỰC đã tiến bộ thật: server action reviewReport tồn tại, kiểm quyền bằng requireRole, ghi audit, revalidatePath — không còn là toast giả thuần client. NHƯNG khía cạnh TESTING của finding (Playwright E2E approve/reject + test phân quyền âm EDITOR không được approve) vẫn 0. Phân loại partially_fixed vì gốc rễ testing chưa giải quyết. |
| TEST-05 | 🔴 CÒN |  | Cache key vẫn dùng SHA-256 cắt 16 hex (64 bit), không tăng độ dài, và vẫn không có unit test nào (chống va chạm userHash, kiểm footer chứa đúng email/ip, kiểm cache không stamp lại). Y nguyên. |
| TEST-06 | 🔴 CÒN |  | Bất biến XOR của Entitlement vẫn chỉ được bảo vệ ở zod refine (entitlements.ts:19) và CHECK ở DB; không có integration test nào kiểm 4 tổ hợp (chỉ-report / chỉ-category / cả-hai / không-cả-hai). Y nguyên. |
| TEST-07 | 🔴 CÒN |  | Range/206 streaming và phân quyền của API view/download vẫn không có test integration (giả NextRequest + session mock). Y nguyên. |
| TEST-08 | 🔴 CÒN |  | Script vẫn phụ thuộc DB seed chung, không cô lập/idempotent, không chạy được trong CI. Vẫn không có git repo cũng như workflow CI (xác nhận của orchestrator). Y nguyên. |
| TEST-09 | 🔴 CÒN |  | Số lượng key của vi/en/zh hiện đang khớp (đều 275) nhờ developer cập nhật tay, nhưng KHÔNG có test tự động nào đảm bảo parity hay phát hiện hardcode tiếng Việt. Sự khớp hiện tại là tình cờ/thủ công, không có cơ chế chặn drift. Finding (thiếu test localization) vẫn y nguyên. |

</details>

<details><summary><strong>Finding MỚI (4)</strong></summary>

- **TEST-10 · 🟠 HIGH — 🔧 chỉnh severity → **LOW**** — visibleWhere trong authz.ts là private — chặn mọi khả năng test/đồng bộ với verify script
  - 📌 src/lib/authz.ts:30 'function visibleWhere(userId: string): Prisma.ReportWhereInput' không có export; verify-entitlements.ts:11 buộc phải định nghĩa lại bản sao
  - 💥 Vì hàm cốt lõi quyết định isolation entitlement không được export, không thể viết unit test trực tiếp cho nó, cũng không thể để verify-entitlements.ts import dùng chung. Đây là nguyên nhân gốc khiến TEST-02 không thể fix đúng cách. Mọi thay đổi authz tương lai vẫn có thể trôi (drift) khỏi script kiểm tra.
  - 🔧 Export visibleWhere (hoặc tốt hơn: viết integration test gọi canViewReport/listVisibleReports thật trên test DB) để script kiểm tra và app dùng CHUNG một code path. Đây là điều kiện tiên quyết để TEST-02 có thể đóng. _(effort S)_
  - 🔎 _Kiểm chứng:_ Hai dữ kiện cốt lõi của finding là CHÍNH XÁC theo code thực tế: (1) src/lib/authz.ts:30 'function visibleWhere(userId: string): Prisma.ReportWhereInput' đúng là KHÔNG có export (chỉ dùng nội bộ ở line 23 và line 63). (2) scripts/verify-entitlements.ts:11-21 đúng là định nghĩa lại MỘT BẢN SAO của fragment này (giống hệt byte-for-byte với authz.ts:30-39), và comment ở line 1-4 tự thừa nhận 'Replicates the visibleWhere fragment'. grep toàn repo xác nhận visibleWhere chỉ xuất hiện ở 2 file, mỗi file có một bản riêng; không file nào import nó. Vì vậy nguy cơ drift (sửa authz.ts mà script không đổi → test isolation âm thầm sai) là CÓ THẬT.

TUY NHIÊN finding bị THỔI PHỒNG và GẮN SAI severity (high):
- Nguyên nhân gốc bị mô tả sai. Việc không export KHÔNG phải là rào cản duy nhất để dùng chung hàm. authz.ts:1 mở đầu bằng `import "server-only"` và kéo theo chuỗi phụ thuộc @/lib/rbac → @/auth (NextAuth v5) + @/lib/prisma. Script chạy bằng `pnpm tsx scripts/verify-entitlements.ts` (tiến trình Node thuần, không qua bundler Next.js) nên dù CÓ export, việc import @/lib/authz vẫn vỡ do guard `server-only` và do alias `@/` + side-effect import auth/prisma. Tức export-hay-không chỉ là một yếu tố phụ, không phải 'nguyên nhân gốc khiến TEST-02 không thể fix'.
- Đây là vấn đề maintainability / test-fidelity (code trùng lặp, rủi ro drift), KHÔNG phải lỗ hổng bảo mật hay bug chức năng. Hiện tại hai bản sao giống hệt nhau nên isolation thực sự ĐANG được verify đúng; verify-entitlements.ts:54-61 vẫn assert đúng các thuộc tính cô lập. Không có exploit, không có rò rỉ entitlement do điều này.
- Trong một portal security-first, severity 'high' phải dành cho phá vỡ isolation thật hoặc defect khai thác được; một rủi ro trùng lặp logic tiềm ẩn chỉ xứng đáng severity low. Cách khắc phục đúng cũng đơn giản: tách fragment thuần (không có server-only) ra một module dùng chung cho cả authz.ts và script.

Kết luận: finding real nhưng overstated về impact và sai severity → adjusted xuống low.
- **TEST-11 · 🟠 HIGH — 🔧 chỉnh severity → **MEDIUM**** — reviewReport mới (lifecycle approve/reject/publish) ra mắt mà không kèm bất kỳ test phân quyền nào
  - 📌 src/server/report-actions.ts:25-75 reviewReport gọi requireRole('SUPER_ADMIN','APPROVER') rồi prisma.report.update; không có file test nào tham chiếu reviewReport
  - 💥 Một server action ghi-trạng-thái nhạy cảm (đổi status báo cáo, publish, ghi audit) được thêm vào nhưng không có test khẳng định: EDITOR/CLIENT bị từ chối, decision không hợp lệ bị chặn (schema), và status chuyển đúng. Regression phân quyền ở đây sẽ không bị phát hiện tự động.
  - 🔧 Thêm integration test (vitest + test DB hoặc mock requireRole): APPROVER approve→APPROVED; publish→PUBLISHED + set publishedAt; EDITOR/CLIENT→{ok:false}; input rác→{ok:false}. Kèm Playwright E2E như khuyến nghị TEST-04. _(effort M)_
  - 🔎 _Kiểm chứng:_ Claim đúng về mặt sự thật. `reviewReport` thực sự tồn tại tại src/server/report-actions.ts:25-75: là một server action ghi-trạng-thái nhạy cảm, gọi `requireRole("SUPER_ADMIN", "APPROVER")` (dòng 32), validate `decision` bằng zod `z.enum(["approve","reject","publish"])` (dòng 12), rồi `prisma.report.update` (dòng 54-57) và ghi `logAudit` (dòng 59-70). `grep -rl "reviewReport"` chỉ trả về chính file định nghĩa và caller `pdf-viewer.tsx` — KHÔNG có file test nào tham chiếu. package.json không có script `"test"`, không có vitest/jest/playwright trong devDependencies, không có file cấu hình test — đúng như ground truth (zero test, không test runner). Do đó: không có test nào khẳng định EDITOR/CLIENT bị từ chối, decision không hợp lệ bị chặn, hay status chuyển đúng — đúng như mô tả.

Tuy nhiên hạ severity từ high xuống medium vì: (1) Đây là lỗ hổng ĐỘ PHỦ TEST, không phải lỗ hổng runtime có thể khai thác — RBAC thực sự được thực thi trong code: `requireRole` (src/lib/rbac.ts:27-30) ném `ForbiddenError` khi role không thuộc danh sách, và reviewReport bắt lỗi trả về "Bạn không có quyền duyệt báo cáo." (dòng 33-35). Phân quyền hiện tại đúng, rủi ro là regression tương lai không bị phát hiện chứ không phải lỗ hổng đang mở. (2) Toàn bộ project có ZERO test — đây là baseline hệ thống chứ không phải gap riêng mới phát sinh do action này; nâng riêng nó lên "high" sẽ làm sai lệch trọng số. Mức medium phản ánh đúng: một action privilege-gated nhạy cảm mới ra mắt mà không có test phân quyền, trong bối cảnh hạ tầng test hoàn toàn vắng mặt.
- **TEST-12 · 🟡 MEDIUM** — Hai server action mới (report-actions.ts, entitlements.ts) bắt lỗi authz im lặng — cần test để khỏi che giấu lỗi quyền
  - 📌 report-actions.ts:31-35 try{requireRole(...)}catch{return {ok:false}}; entitlements.ts:24 requireRole ném thẳng (hành vi khác nhau giữa hai action)
  - 💥 Hai action xử lý lỗi phân quyền theo hai kiểu khác nhau (một bắt nuốt, một để ném). Không có test nào chốt hành vi mong đợi, dễ phát sinh sai khác/che giấu lỗi 403 khi refactor. Thiếu mock strategy cho requireRole/auth khiến không thể test nhánh từ chối quyền.
  - 🔧 Chuẩn hoá xử lý lỗi authz và viết unit test với requireRole được mock để cover cả nhánh thành công lẫn ForbiddenError/AuthError cho từng action. _(effort M)_
- **TEST-13 · ⚪ LOW** — Không có smoke test / typecheck gate tự động dù đã có script typecheck
  - 📌 package.json scripts có 'typecheck':'tsc --noEmit' và 'lint':'next lint' nhưng không có .git/.github/CI để chạy chúng tự động (xác nhận orchestrator)
  - 💥 Đã tồn tại sẵn typecheck/lint nhưng không có cơ chế tự động (pre-commit hook / CI) buộc chạy, nên các script này phụ thuộc developer nhớ chạy tay. Đây là 'low-hanging' đảm bảo chất lượng đang bị bỏ phí.
  - 🔧 Khởi tạo git repo + một CI workflow tối thiểu chạy typecheck (và sau này test/verify). Trước mắt thêm husky/lint-staged hoặc một script 'check' gộp typecheck. _(effort S)_

</details>

**Điểm mạnh:** Code lõi bảo mật được tách lớp rõ ràng (authz.ts, rbac.ts, download-token.ts, watermark.ts) nên về nguyên tắc dễ viết unit/integration test khi bắt đầu — testability tốt hơn nhiều dự án không tách lớp. · Có sẵn script typecheck (tsc --noEmit) và lint (next lint) trong package.json, là nền tảng để gắn vào CI khi có repo. · reviewReport (report-actions.ts) đã thay toast giả bằng server action thật có kiểm quyền và ghi audit — giúp luồng lifecycle giờ đã có thể kiểm chứng bằng test (trước đây không thể). · verify-entitlements.ts dù sai cách (copy logic) vẫn phủ được các bất biến isolation quan trọng (PUBLIC visible cho cả hai nhóm, category inheritance, cross-group isolation, DRAFT/REVIEW không lộ) — là khung sườn tốt để chuyển thành integration test thật. · Localization vi/en/zh hiện đang khớp số lượng key (đều 275), cho thấy developer có chú ý tới parity dù chưa tự động hoá.

---

### 8.2 Build & Delivery — 31 → 34/100 (D) 🟢 +3

**Delta:** CẢI THIỆN: (1) Upload PDF đã chuyển sang Node Route Handler `src/app/api/admin/reports/route.ts` (req.formData + arrayBuffer + MAX_BYTES guard), đúng kiến trúc — không còn đi qua Server Action 1mb; (2) Dockerfile ĐÃ được sửa (mtime Jun 17 15:27, trái với ghi chú orchestrator) để copy thêm `prisma` schema/migrations và `@prisma+client*` vào runner; (3) verify-entitlements.ts được viết lại sạch hơn (exit non-zero khi vi phạm). VẪN CÒN: lỗi cốt lõi BD-01 (`|| true` + runner thiếu Prisma CLI/engine) chưa thực sự được vá — chỉ copy `@prisma+client*` chứ KHÔNG copy `.pnpm/prisma@*` hay `@prisma+engines@*` và không symlink `node_modules/prisma`, nên lệnh migrate trong compose vẫn fail. Không có CI/CD/git/ESLint/CHANGELOG/feature-flag/restore.sh nào được thêm. verify-entitlements.ts vẫn chỉ là script chạy tay, KHÔNG được nối vào bất kỳ gate nào (vì không có CI). PHÁT SINH MỚI: lệch ngưỡng upload 25MB (app) vs 12m (nginx) và package.json ghim prisma ^6.10 trong khi lockfile cài 6.19.3.

**Hiện trạng:** Tầng Build & Delivery về cơ bản KHÔNG cải thiện kể từ lần audit trước. Vẫn không có git, không CI (.github không tồn tại), không CD, không registry, không ESLint config, không CHANGELOG/version tag, không feature flag, không script restore. Lỗi nghiêm trọng nhất — `migrate deploy || true` che lỗi im lặng — VẪN còn nguyên trong docker-compose.prod.yml, và runner image VẪN thiếu Prisma CLI (`node_modules/prisma`) cũng như `@prisma+engines`, nên lệnh `node node_modules/prisma/build/index.js migrate deploy` chắc chắn fail rồi bị nuốt lỗi. Điểm sáng duy nhất thuộc dimension này là upload PDF nay đã đi qua Route Handler streaming (BD-08) thay vì Server Action, nhưng lại sinh ra lệch ngưỡng mới (25MB app vs 12m nginx). Secret thật vẫn nằm trong .env trên đĩa cạnh .env.example.

<details><summary><strong>Trạng thái finding cũ (9)</strong></summary>

| ID | Trạng thái | Kiểm chứng fix | Ghi chú |
|---|---|---|---|
| BD-01 | 🔴 CÒN |  | Chưa fix thực sự. `\|\| true` VẪN còn → mọi lỗi migrate bị nuốt. Runner CHỈ copy `@prisma+client*` chứ KHÔNG copy `.pnpm/prisma@*` (CLI) hay `.pnpm/@prisma+engines@*` (migration engine), và KHÔNG tạo symlink `node_modules/prisma` cũng như `node_modules/.bin/prisma`. Vì vậy `node node_modules/prisma/build/index.js` không tồn tại trong image runner → lệnh migrate chắc chắn fail, bị `\|\| true` che, web vẫn start với schema cũ. Khuyến nghị cũ (tách job migrate fail-fast, bỏ `\|\| true`, copy đủ prisma+engines) chưa được áp dụng. |
| BD-02 | 🔴 CÒN |  | Vẫn không có CI. Không git, không workflow nào gate typecheck/build/lint/test trước khi release. `next lint` về thực chất là no-op vì thiếu eslint config. Không có gì thay đổi so với lần trước. |
| BD-03 | 🔴 CÒN |  | Vẫn không có CD. Image build trực tiếp trên host bằng `build: .`, không có artifact bất biến, không push lên registry, không có tag sha/semver để flip. Deploy hoàn toàn thủ công. |
| BD-04 | 🔴 CÒN |  | Vẫn còn nguyên. File `.env` với hai secret base64 thật nằm cạnh `.env.example`. `.gitignore` có loại `.env` (tốt) nhưng repo CHƯA được khởi tạo git nên điều đó vô nghĩa; secret vẫn trên đĩa, chưa có secret manager / quy trình rotation. Coi như đã lộ, cần xoay vòng trước go-live. |
| BD-05 | 🔴 CÒN |  | Vẫn không có chiến lược rollback. backup.sh có nhưng thiếu restore.sh đối ứng; không có migration-down / mô hình expand-contract; image không tag bất biến nên không thể rollback bằng đổi tag + restart. Không có runbook. |
| BD-06 | 🔴 CÒN |  | Versioning vẫn đứng yên 0.1.0. Không git tag, không CHANGELOG, image không gắn version/sha. Health route mới sửa nhưng vẫn không expose version để xác minh bản đang chạy. |
| BD-07 | 🔴 CÒN |  | Vẫn không có feature flag nào. Tính năng dở dang (PDF upload, report lifecycle) không thể bật/tắt độc lập trên prod. Không thay đổi. |
| BD-08 | 🟡 VÁ MỘT PHẦN |  | Phần đúng: upload PDF nay ĐÃ đi qua Node Route Handler streaming (formData + arrayBuffer + guard kích thước), đúng như comment next.config.ts trước đây mong muốn — Server Action 1mb không còn là đường upload. NHƯNG ngưỡng vẫn KHÔNG đồng bộ: app cho phép tới 25MB trong khi nginx chặn ở 12m, nên file 12–25MB sẽ bị nginx trả 413 trước khi tới app. Giới hạn 12m chưa được tài liệu hóa/thống nhất giữa các tầng. Coi là partially_fixed (kiến trúc upload đúng, nhưng lệch ngưỡng vẫn tồn tại theo cách mới). |
| BD-09 | 🔴 CÒN |  | Vẫn chưa fix. backup.sh hardcode mặc định `blackcrest-db-1` nhưng compose.prod không khai báo `container_name`, nên tên thực do Compose sinh ra (phụ thuộc project name) dễ KHÔNG khớp → `docker exec` fail; còn dev lại là `blackcrest_db` (dấu gạch dưới) — mâu thuẫn. Chưa thêm kiểm tra dump rỗng. set -euo pipefail đã có sẵn (tốt) nhưng vấn đề tên container chưa được giải quyết. |

</details>

<details><summary><strong>Finding MỚI (4)</strong></summary>

- **BD-10 · 🔴 CRITICAL — ✅ xác nhận** — Runner Dockerfile thiếu symlink node_modules/prisma — migrate command tham chiếu đường dẫn không tồn tại
  - 📌 Dockerfile:34 `COPY --from=builder /app/node_modules/.pnpm/@prisma+client* ./node_modules/.pnpm/` (chỉ copy gói client vào .pnpm, không tạo `node_modules/prisma`); docker-compose.prod.yml:58 chạy `node node_modules/prisma/build/index.js migrate deploy`
  - 💥 Trong image runner, `node_modules/prisma/build/index.js` KHÔNG tồn tại (chỉ có @prisma/client trong .pnpm, chưa cả symlink), nên lệnh migrate ném MODULE_NOT_FOUND ngay; bị `|| true` nuốt → web boot với schema chưa migrate. Đây là nguyên nhân gốc khiến BD-01 vẫn sống dù Dockerfile được chỉnh.
  - 🔧 Tách bước migrate thành job/init-container chạy từ image có đủ Prisma CLI (`pnpm exec prisma migrate deploy`), bỏ `|| true`. Nếu giữ trong runner: copy `.pnpm/prisma@*`, `.pnpm/@prisma+engines@*`, và tạo symlink `node_modules/prisma` + `node_modules/.bin/prisma`; verify bằng cách thực sự build và chạy `migrate deploy` trong container. _(effort M)_
- **BD-12 · 🟡 MEDIUM** — package.json ghim Prisma ^6.10 trong khi lockfile cài 6.19.3 — build không tái lập
  - 📌 package.json deps `"@prisma/client": "^6.10.0"`, devDeps `"prisma": "^6.10.0"`; nhưng node_modules/.pnpm có `prisma@6.19.3_typescript@5.9.3` và `@prisma+engines@6.19.3`
  - 💥 Range `^6.10` cho phép nhảy minor; lockfile hiện ở 6.19.3. Vì không có CI chạy `--frozen-lockfile` để gate, môi trường khác `pnpm install` có thể kéo phiên bản Prisma khác, gây drift engine/client và lỗi runtime khó truy. Không có git/CI để phát hiện.
  - 🔧 Ghim chính xác phiên bản Prisma (bỏ caret hoặc dùng overrides), đảm bảo CI sau này luôn `pnpm install --frozen-lockfile`, và đồng bộ với phiên bản trong Dockerfile builder. _(effort S)_
- **BD-13 · 🟡 MEDIUM** — verify-entitlements.ts không được nối vào bất kỳ gate nào (build/CI/release)
  - 📌 scripts/verify-entitlements.ts:5 hướng dẫn chạy tay `pnpm tsx scripts/verify-entitlements.ts`; package.json scripts KHÔNG có entry gọi script này; không có .github/CI để gọi nó
  - 💥 Bài test cô lập entitlement (thuộc tính bảo mật lõi) chỉ chạy thủ công và phụ thuộc DB đã seed; không có gì chặn release nếu ai đó quên chạy hoặc nó fail. Không có giá trị bảo vệ tự động.
  - 🔧 Thêm script `pnpm verify:entitlements` vào package.json và gọi trong bước CI (sau prisma generate + seed db ephemeral) như một gate bắt buộc; fail build khi exit code != 0. _(effort S)_
- **BD-11 · ⚪ LOW** — Lệch ngưỡng upload mới: app cho 25MB nhưng nginx chặn 12m
  - 📌 src/app/api/admin/reports/route.ts:16 `const MAX_BYTES = 25 * 1024 * 1024` và :66 thông báo "vượt quá 25MB"; nginx/blackcrest.conf:40 `client_max_body_size 12m`
  - 💥 File PDF 12–25MB qua được kiểm tra của app nhưng bị nginx trả 413 trước, gây lỗi khó hiểu cho người dùng và thông báo "25MB" sai lệch. Việc sửa BD-08 (đường upload) đã vô tình tạo ngưỡng mới không khớp infra.
  - 🔧 Thống nhất một con số duy nhất (vd 12MB) giữa nginx `client_max_body_size`, MAX_BYTES và thông báo lỗi; tài liệu hóa và kiểm thử với file sát ngưỡng. _(effort S)_

</details>

**Điểm mạnh:** Dockerfile multi-stage (deps/builder/runner) với `output: standalone`, chạy bằng user non-root `nextjs`, `pnpm install --frozen-lockfile` ở stage deps — cấu trúc image gọn và đúng hướng. · Upload PDF đã được chuyển đúng sang Node Route Handler streaming (src/app/api/admin/reports/route.ts) với guard kích thước và kiểm tra `instanceof File`, thay vì đi qua Server Action 1mb. · docker-compose.prod.yml dùng `${VAR:?}` để bắt buộc khai báo secret và bind Postgres về 127.0.0.1 (tránh Docker bypass UFW) — ý thức hardening tốt. · backup.sh có `set -euo pipefail`, backup DB (pg_dump -Fc) + storage + offsite rclone + retention — nền tảng cho 3-2-1 đã có (dù thiếu restore). · /api/health đã có endpoint kiểm tra DB phục vụ blue/green flip (trả 503 khi DB không reachable).

---

### 8.3 Team & Process — 31 → 37/100 (D+) 🟢 +6

**Delta:** CẢI THIỆN: README.md được viết lại nghiêm túc (1829 bytes, sửa lúc 15:30 hôm nay) — có hướng dẫn chạy local đầy đủ, bảng tài khoản mẫu, danh sách scripts, tóm tắt bảo mật, sơ đồ cấu trúc; onboarding tăng đáng kể. Mục bảo mật README mô tả đúng các quyết định kiến trúc (authz mọi RSC, middleware không phải biên bảo mật/CVE-2025-29927), giúp PROC-04 nhích lên partially_fixed. .gitignore đã đúng (loại trừ .env dòng 19 và /storage/ dòng 23) nên KHI git init sẽ không lộ secret. VẪN CÒN (không đổi): (1) PROC-01 — không có git, P0 nguyên vẹn; (2) PROC-02 — không branch/PR/review; (3) PROC-03 — không CI, verify-entitlements.ts vẫn chỉ chạy tay; (5) PROC-05 — không LICENSE/CODEOWNERS, package.json thiếu author/repository/license; (6) PROC-06 — `lint` script vẫn mồ côi, không ESLint/Prettier config; (7) PROC-07 — .env secret thật vẫn trên đĩa, chưa có tài liệu quy trình quản lý/luân chuyển secret. PROC-04 chỉ partially_fixed vì README + verify-entitlements.ts vẫn dẫn chiếu 'blueprint §' tới tài liệu không có trong repo. Tóm lại: cải thiện tài liệu, nhưng toàn bộ trục quy trình/version-control vẫn ở vạch xuất phát.

**Hiện trạng:** Trạng thái hiện tại gần như không đổi ở những điểm cốt lõi nhất: dự án VẪN không nằm dưới version control (không có .git — đã xác minh `ls .git` → No such file or directory), VẪN không có branch/PR/code-review/CI nào (không có .github, không có file workflow, không có GitLab/Jenkins/CircleCI). Đây là P0 chưa được chạm tới. Cải thiện thực chất DUY NHẤT của vòng này là README.md đã được viết lại đầy đủ (stack, yêu cầu, các bước chạy local, tài khoản mẫu, scripts, tóm tắt bảo mật, cấu trúc thư mục) — onboarding tốt lên rõ rệt. Còn lại: chưa có LICENSE, chưa có CODEOWNERS/maintainer, package.json thiếu author/repository/license, script `lint` vẫn mồ côi (gọi `next lint` nhưng không có ESLint config), file .env chứa secret dev thật vẫn nằm trên đĩa (dù đã được .gitignore). Vì không có git, mọi quy trình hạ nguồn (branch protection, PR gate, required typecheck/verify-entitlements check, CODEOWNERS) đều không thể tồn tại. Điểm tăng nhẹ 31→37 hoàn toàn nhờ README, không phải nhờ quy trình.

<details><summary><strong>Trạng thái finding cũ (7)</strong></summary>

| ID | Trạng thái | Kiểm chứng fix | Ghi chú |
|---|---|---|---|
| PROC-01 | 🔴 CÒN |  | P0 hoàn toàn chưa xử lý. Dự án vẫn không nằm dưới version control — không một commit nào, không baseline, không lịch sử, không khả năng rollback. Đây vẫn là rủi ro quy trình nghiêm trọng nhất và là điều kiện chặn cho mọi finding khác (PROC-02/03/05). Phải `git init` + commit baseline + đẩy lên remote private NGAY. Lưu ý: .gitignore đã sẵn sàng đúng (loại .env dòng 19, /storage/ dòng 23) nên commit đầu sẽ an toàn; cần để mắt file AUDIT.md 323KB ở root sẽ bị track nếu không loại trừ. |
| PROC-02 | 🔴 CÒN |  | Không thay đổi. Không có branch strategy, không PR, không code review, không CODEOWNERS. Không thể thiết lập cho tới khi có git + remote. Các đường bảo mật trọng yếu (src/lib/authz.ts, src/auth*, src/server/*) vẫn không có người được gán trách nhiệm review. |
| PROC-03 | 🔴 CÒN |  | Không thay đổi. Không có CI. `pnpm typecheck` và test cô lập entitlement (scripts/verify-entitlements.ts — một test thực sự đã tồn tại) vẫn chỉ chạy tay, không phải required check. Đây vẫn là đòn bẩy lớn nhất bị bỏ lỡ: test đã có sẵn, chỉ thiếu tự động hoá trên mỗi PR. |
| PROC-04 | 🟡 VÁ MỘT PHẦN |  | Cải thiện một phần: README giờ tóm tắt được nhiều quyết định kiến trúc/bảo mật trọng yếu (đủ để onboarding hiểu mục đích). Nhưng vấn đề gốc CHƯA hết — repo vẫn dẫn chiếu tới 'blueprint §x.y' là tài liệu KHÔNG tồn tại trong repo (cả ở README lẫn header của verify-entitlements.ts), người mới không tra được nguồn. Vẫn thiếu docs/ARCHITECTURE.md hoặc ADR và CLAUDE.md. design-reference/PORTING-CONVENTIONS.md vẫn ở đó nhưng không phải tài liệu kiến trúc/bảo mật. |
| PROC-05 | 🔴 CÒN |  | Không thay đổi. Vẫn không có mô hình ownership: thiếu LICENSE (proprietary phù hợp với sản phẩm gia sản tư nhân), package.json vẫn trống author/repository/license, và không có CODEOWNERS để gán các đường bảo mật trọng yếu cho chủ sở hữu. Phụ thuộc git cho phần CODEOWNERS. |
| PROC-06 | 🔴 CÒN |  | Không thay đổi. Script `lint` vẫn mồ côi — gọi `next lint` nhưng không có ESLint flat config (next/core-web-vitals + @typescript-eslint), cũng không có Prettier. Hoặc thêm cấu hình lint+format, hoặc gỡ script `lint` nếu chủ đích dựa vào typecheck. Chưa có gì để đưa vào CI. |
| PROC-07 | 🔴 CÒN |  | Giảm nhẹ nhưng vẫn open. Mặt tích cực: .gitignore đã chắc chắn loại trừ .env nên KHI git init secret sẽ không bị commit. Mặt còn thiếu: file .env secret thật vẫn nằm phẳng trên đĩa, chưa có quy trình quản lý/luân chuyển secret được tài liệu hoá (.env.example có hint `openssl rand -base64 32` nhưng README không mô tả nơi lưu secret prod — secret manager, không file phẳng). Nên luân chuyển 2 secret dev này nếu từng được chia sẻ. |

</details>

<details><summary><strong>Finding MỚI (3)</strong></summary>

- **PROC-08 · ⚪ LOW** — Không có git hooks/lint-staged/commitlint — không có cổng chất lượng cục bộ
  - 📌 Không có .husky, .lintstagedrc*, hay commitlint (`find` rỗng); grep package.json không thấy husky/lint-staged/commitlint ("no git-hook tooling in package.json").
  - 💥 Ngay cả khi có git, không có pre-commit/pre-push để chạy typecheck/format/verify-entitlements cục bộ, nên lỗi dễ lọt vào lịch sử trước khi CI (chưa có) bắt được.
  - 🔧 Sau khi git init: thêm husky + lint-staged chạy `pnpm typecheck` (và format khi đã có Prettier) ở pre-push; cân nhắc commit-msg hook. Đây là bổ trợ, không thay thế CI (PROC-03). _(effort S)_
- **PROC-10 · ⚪ LOW** — README liệt kê mật khẩu tài khoản mẫu dạng plaintext dùng chung
  - 📌 README.md:32 "### Tài khoản mẫu (mật khẩu chung: `Blackcrest@2026`)" cùng bảng email→vai trò (dòng 33-40).
  - 💥 Tài liệu hoá credential dùng chung là tiện cho dev nhưng tạo thói quen xấu; nếu seed này từng được dùng ngoài môi trường local thì thành lỗ hổng. Với sản phẩm gia sản tư nhân, cần cảnh báo rõ chỉ dùng local.
  - 🔧 Ghi rõ trong README rằng credential mẫu CHỈ dành cho local/seed và bị vô hiệu hoá ở prod; tránh tái sử dụng pattern mật khẩu dùng chung. Liên kết với quy trình quản lý secret (PROC-07). _(effort S)_
- **PROC-09 · 🔵 INFO** — AUDIT.md 323KB nằm ở thư mục gốc, sẽ bị track khi git init nếu không loại trừ
  - 📌 Root chứa AUDIT.md (323627 bytes, sửa 17:49). .gitignore không loại trừ file này; nó là output audit nội bộ.
  - 💥 Khi `git init` + commit baseline, một file audit nội bộ lớn sẽ lọt vào lịch sử repo và remote private, làm phình repo và có thể lộ chi tiết nội bộ ngoài ý muốn.
  - 🔧 Trước commit đầu, quyết định: chuyển AUDIT.md vào docs/ có chủ đích, hoặc thêm vào .gitignore nếu là artifact tạm. Đừng để vô tình commit. _(effort S)_

</details>

**Điểm mạnh:** README.md được viết lại nghiêm túc (vi): có stack, yêu cầu môi trường, trình tự chạy local đầy đủ (install→migrate→seed→generate-pdf→dev), bảng tài khoản mẫu kèm vai trò/trạng thái, danh sách scripts, và tóm tắt bảo mật — onboarding tăng rõ rệt. · .gitignore đã đúng và sẵn sàng: loại trừ .env (dòng 19), .env*.local (dòng 20) và /storage/ (dòng 23) — nên khi git init commit baseline sẽ không lộ secret hay PDF người dùng. · Tồn tại test cô lập entitlement thực sự (scripts/verify-entitlements.ts) thoát non-zero khi vi phạm — chỉ cần tự động hoá là có ngay một required check giá trị cao. · package.json có scripts vận hành rõ ràng (dev/build/start/typecheck/db:migrate/db:seed/db:studio) giúp lập lại môi trường nhất quán.

---

### 8.4 Observability — 38 → 40/100 (D) 🟢 +2

**Delta:** Cải thiện: report-actions.ts (mới) ghi auditLog thật cho REPORT_APPROVE/REJECT/PUBLISH thay cho confirmation giả, nên audit trail đầy đủ hơn (gián tiếp giúp Monitoring/audit coverage). Nhận xét trong audit.ts được làm rõ hơn ("failures are notable"). Đó là tất cả. Còn lại: OBS-01 (error tracking) vẫn không có gì — không Sentry/instrumentation/global-error; OBS-02 (health check container) web service trong docker-compose.prod.yml vẫn KHÔNG có khối healthcheck, Dockerfile vẫn không có HEALTHCHECK, nginx depends_on:web vẫn không có condition:service_healthy; OBS-03 (access-log reader) vẫn không có listReportAccess và không có trang admin nào hiển thị ReportAccessLog; OBS-04 (structured logging) vẫn 4 console.error, không pino/level/correlation-id, compose không cấu hình logging driver; OBS-05 (alerting) hoàn toàn không có; OBS-06 (perf monitoring) không có span/tracing; OBS-07 (audit filter/pagination + PII + token cleanup) trang audit vẫn cứng take=80 không lọc, vẫn không có job dọn DownloadToken. Điểm gần như đứng yên (38→40), tăng nhẹ chỉ vì độ phủ audit-write tốt hơn.

**Hiện trạng:** Khả năng quan sát của Blackcrest gần như không đổi so với lần audit trước. Không có error tracking (không Sentry, không instrumentation.ts, không global-error.tsx), không có structured logging (vẫn 4 console.error rải rác), không có alerting, không có performance monitoring/tracing. /api/health vẫn tồn tại và đúng (trả 503 khi DB chết) nhưng KHÔNG được mắc vào healthcheck của container web — nên blue/green và depends_on vẫn không dùng được nó. ReportAccessLog vẫn được ghi nhưng KHÔNG có hàm reader hay UI nào để xem ai đã xem/tải báo cáo — điểm mù pháp lý vẫn nguyên. Trang audit vẫn không có lọc/phân trang/tìm kiếm và DownloadToken hết hạn vẫn không được dọn. Cải thiện duy nhất chạm tới dimension này là gián tiếp: report-actions.ts mới ghi audit thật cho approve/reject/publish (trước đây là toast giả), làm audit trail đầy đủ hơn một chút — nhưng đó là sửa của dimension khác. Về mặt observability thuần, gần như không có gì được khắc phục.

<details><summary><strong>Trạng thái finding cũ (7)</strong></summary>

| ID | Trạng thái | Kiểm chứng fix | Ghi chú |
|---|---|---|---|
| OBS-01 | 🔴 CÒN |  | Hoàn toàn chưa khắc phục. Không có error tracking dưới bất kỳ dạng nào — không Sentry/GlitchTip, không src/instrumentation.ts, không src/app/global-error.tsx. Lỗi server-action và API route vẫn biến mất không dấu vết (chỉ rơi vào console của container). Lưu ý thêm: root layout là src/app/[locale]/layout.tsx, chưa có app/global-error.tsx ở cấp gốc để bắt lỗi render layout. |
| OBS-02 | 🔴 CÒN |  | Chưa khắc phục. Probe /api/health vẫn cô lập, không mắc vào container web nên blue/green flip và depends_on vẫn không thể dựa vào tình trạng thực của web. Đây vẫn là rủi ro cao cho launch: container web có thể 'up' nhưng app chết mà orchestrator không biết. |
| OBS-03 | 🔴 CÒN |  | Chưa khắc phục. ReportAccessLog vẫn chỉ ghi vào (write-only), không có reader function cũng như trang/khu vực admin nào hiển thị 'ai xem/tải báo cáo nào, khi nào'. Điểm mù pháp lý/compliance vẫn nguyên — đặc biệt nghiêm trọng với portal tài liệu private-wealth. |
| OBS-04 | 🔴 CÒN |  | Chưa khắc phục. Không có structured JSON logging, không log level, không request-id/correlation-id. audit-write failure vẫn chỉ console.error nuốt lỗi (audit.ts:28) — không nâng mức nghiêm trọng. Không cấu hình logging driver trong compose nên log có thể phình vô hạn. |
| OBS-05 | 🔴 CÒN |  | Chưa khắc phục. Không có alert rule nào cho health 503, error rate, hay audit/access-log write fail. Không có uptime monitor ngoài. Vì OBS-01 và OBS-02 đều chưa làm, alerting vẫn không có nền tảng để gắn. |
| OBS-06 | 🔴 CÒN |  | Chưa khắc phục. Các thao tác nặng (stream PDF, watermark qua pdf-lib/fontkit, argon2) vẫn không được đo lường. Đây là mục low/không chặn launch nhưng vẫn open. |
| OBS-07 | 🔴 CÒN |  | Chưa khắc phục. Trang audit vẫn không lọc/phân trang/tìm kiếm (giới hạn cứng 80 bản ghi mới nhất). PII vẫn được truy vấn (email) trong listAuditLog và vẫn được ghi vào metadata auditLog (accounts.ts:32) — không có retention/ẩn danh. Job dọn DownloadToken hết hạn vẫn chưa hiện thực dù comment từng hứa. Có một cải thiện rất nhỏ: UI audit nay map e.actor = name (không lộ email ra màn hình), nhưng dữ liệu PII vẫn nằm trong DB và vẫn được fetch — chưa đủ để coi là partially_fixed cho gốc vấn đề. |

</details>

<details><summary><strong>Finding MỚI (3)</strong></summary>

- **OBS-08 · 🟡 MEDIUM** — depends_on của nginx không dùng condition service_healthy cho web (kể cả nếu web có healthcheck)
  - 📌 docker-compose.prod.yml service nginx: 'depends_on:\n      - web' (dạng list ngắn). Khác hẳn service web dùng 'depends_on: db: condition: service_healthy'. Nginx sẽ start ngay khi container web vừa tạo, không chờ app sẵn sàng.
  - 💥 Khi release/blue-green, nginx có thể proxy traffic tới web chưa migrate xong/chưa listen → 502 cho client trong cửa sổ khởi động. Là hệ quả trực tiếp của việc web không có healthcheck (OBS-02).
  - 🔧 Sau khi thêm healthcheck cho web (OBS-02), đổi nginx.depends_on sang dạng map 'web: { condition: service_healthy }'. Đây chính là điều kiện để cắt traffic blue/green an toàn. _(effort S)_
- **OBS-09 · 🟡 MEDIUM** — Access log fire-and-forget có thể mất bản ghi mà không ai biết (no durability/alert)
  - 📌 api view/route.ts:66 và download/route.ts:66 dùng 'void logReportAccess(...)'; trong audit.ts:39-44 lỗi ghi ReportAccessLog chỉ console.error('[access-log] failed to write'). Không await, không retry, không alert.
  - 💥 Với portal private-wealth, log 'ai đã tải tài liệu nào' là bằng chứng pháp lý. Nếu DB chậm/lỗi tạm thời, bản ghi VIEW/DOWNLOAD mất âm thầm — không thể chứng minh/đối soát về sau, và không có cảnh báo.
  - 🔧 Coi access-log write failure là tín hiệu nghiêm trọng: log có cấu trúc ở mức error + đếm metric + gắn alert (sau OBS-01/05). Cân nhắc ghi đồng bộ (await) cho DOWNLOAD vì tần suất thấp và giá trị pháp lý cao. _(effort M)_
- **OBS-10 · ⚪ LOW** — Health endpoint không có xác thực/giới hạn và lộ ra ngoài, có thể bị quét/log-spam
  - 📌 src/app/api/health/route.ts GET công khai, mỗi lần chạy 'await prisma.$queryRaw`SELECT 1`'. nginx/blackcrest.conf proxy_pass tất cả tới blackcrest_web, không thấy rule riêng/cache/limit cho /api/health.
  - 💥 Endpoint health công khai có thể bị poll dồn dập từ ngoài, mỗi request tạo một query DB; cũng tăng nhiễu log. Rủi ro thấp nhưng nên kiểm soát.
  - 🔧 Để probe chỉ truy cập nội bộ (qua healthcheck container/localhost) hoặc thêm rate-limit/allow nội bộ ở nginx; cân nhắc cache kết quả ngắn. Không chặn launch. _(effort S)_

</details>

**Điểm mạnh:** /api/health/route.ts được thiết kế đúng: chạy SELECT 1, trả 200 {status:ok} khi DB sống và 503 {status:degraded} khi lỗi, đặt runtime='nodejs' và dynamic='force-dynamic' — sẵn sàng để mắc vào healthcheck (chỉ thiếu khâu wiring). · Audit logging về mặt dữ liệu khá vững: AuditLog append-only (logAudit không bao giờ làm vỡ thao tác chính) và nay report-actions.ts ghi audit thật cho approve/reject/publish; ReportAccessLog ghi đủ userId/ip/userAgent cho VIEW & DOWNLOAD sau khi đã authorize. · Trang admin/audit đã có giao diện đọc AuditLog tử tế (DataTable, nhãn hành động/đối tượng đa ngôn ngữ, gate role staff qua listAuditLog→requireRole) và đã tránh hiển thị email ra UI (chỉ map actor=name). · Có một số log có ngữ cảnh hữu ích với prefix nhất quán ([audit]/[access-log]/[upload]) giúp grep — nền tảng tốt nếu sau này chuyển sang pino.

---

### 8.5 Infrastructure — 52 → 53/100 (C) 🟢 +1

**Delta:** Cải thiện: gần như KHÔNG có ở tầng Infrastructure. Xác nhận tích cực duy nhất là kiến trúc upload đã đúng (Route Handler /api/admin/reports, không qua Server Action, runtime=nodejs) nên giới hạn 1mb của serverActions không áp dụng — điều này làm rõ một nửa của INFRA-12. /api/health đã có sẵn và trả 503 khi DB chết (tốt cho blue/green), nhưng vẫn CHƯA được nối vào HEALTHCHECK của Docker hay healthcheck của compose. Còn lại: 11/12 prior finding STILL_OPEN với bằng chứng file:line cụ thể. Nghiêm trọng nhất vẫn là (1) nginx/certbot dir không tồn tại → nginx prod không boot được lần đầu; (2) backup không mã hóa; (3) migrate deploy || true; (4) .env secret thật trong repo; (5) thiếu toàn bộ TLS hardening. Phát hiện MỚI: mismatch upload thực tế là nginx 12m vs Route Handler 25MB (chứ không phải 1mb), upload 12–25MB sẽ bị nginx trả 413; nginx web upstream là single point of failure (chỉ web:3000, blue/green chỉ là comment); thiếu Postgres backup verification; .dockerignore loại trừ assets? đã kiểm tra — assets vẫn được copy nên ok.

**Hiện trạng:** Tầng Infrastructure gần như KHÔNG thay đổi so với lần audit trước. Toàn bộ file hạ tầng (Dockerfile, docker-compose.yml, docker-compose.prod.yml, nginx/blackcrest.conf, nginx/proxy_params_blackcrest.conf, scripts/backup.sh, .dockerignore, next.config.ts) có mtime 14:57–15:28, tức cũ hơn thời điểm AUDIT.md (17:49) — các "fix" của developer chỉ nằm ở tầng UI/i18n/app code, không động tới hạ tầng. Cả 12 prior finding vẫn còn nguyên (11 still_open, 1 partially_fixed về mặt tài liệu hóa nhưng vẫn sai số liệu). Các điểm chí mạng để go-live vẫn hỏng: thư mục nginx/certbot KHÔNG tồn tại nên nginx prod không thể cold-start (mount fail + cert chưa cấp), backup vẫn plaintext rời lãnh thổ qua rclone (PII định chế lộ), migrate deploy || true vẫn nuốt lỗi migration ở prod, .env chứa secret thật vẫn nằm trong working tree, và toàn bộ TLS hardening (HSTS/ssl_ciphers/dhparam/OCSP/session_cache) vẫn thiếu. Container vẫn chưa có HEALTHCHECK, resource limits, no-new-privileges, cap_drop hay digest pin. Vì không có gì được sửa thực sự, điểm giữ nguyên ở mức 53/100 (C) — chỉ nhỉnh 1 điểm do làm rõ được rằng upload đi qua Route Handler đúng kiến trúc.

<details><summary><strong>Trạng thái finding cũ (12)</strong></summary>

| ID | Trạng thái | Kiểm chứng fix | Ghi chú |
|---|---|---|---|
| INFRA-01 | 🔴 CÒN |  | File .env vẫn nằm trong working tree với secret production-shaped thật (base64 32-byte, không phải 'replace-me'). Chưa rotate, chưa xóa. .dockerignore:4 loại .env khỏi image (tốt) nhưng secret vẫn lộ ở mức repo/bàn giao. Header .env:1 ghi 'generated 2026-06-17' chứng tỏ là giá trị đang dùng. Chưa có secret manager/docker secret. |
| INFRA-02 | 🔴 CÒN |  | Hoàn toàn chưa sửa. Thư mục nginx/certbot/{www,conf} VẪN không tồn tại → bind mount sẽ tạo thư mục rỗng, nginx 443 trỏ tới fullchain.pem/privkey.pem không có thực → nginx FAIL cold-start. Không có self-signed bootstrap, không có service certbot trong compose, không có HTTP-only stage để chạy certbot certonly lần đầu, không tài liệu quy trình renew. |
| INFRA-03 | 🔴 CÒN |  | Chưa sửa. Chỉ có 3 security header cơ bản (X-Content-Type-Options, X-Frame-Options, Referrer-Policy ở dòng 43-45). Thiếu HSTS, ssl_ciphers theo Mozilla intermediate, ssl_dhparam, OCSP stapling, ssl_session_cache/timeout, và CSP/Permissions-Policy cho pdf.js. TLS cấu hình ở mức tối thiểu, dễ rớt điểm SSL Labs. |
| INFRA-04 | 🔴 CÒN |  | Chưa mã hóa. db dump (PII định chế) và tar PDF đều plaintext, rclone sync thẳng lên remote không qua rclone crypt hay gpg --encrypt. Không set chmod 600, không object-lock/immutable. PII rời máy ở dạng đọc được. |
| INFRA-05 | 🔴 CÒN |  | Chưa sửa. `\|\| true` vẫn nuốt lỗi migration ở prod — migration fail nhưng app vẫn start với schema lệch → có thể chạy với DB sai cấu trúc. Chưa tách thành init/one-shot job fail-fast trước khi web start. |
| INFRA-06 | 🔴 CÒN |  | Chưa sửa. Web container thiếu HEALTHCHECK (dù endpoint /api/health đã tồn tại và trả 503 khi DB chết — chưa nối). Không có mem/cpu limits cho cả web lẫn db, không có security_opt:[no-new-privileges:true], không cap_drop:[ALL], không read_only+tmpfs. Db có healthcheck (dòng 20-24) nhưng đó là điểm cũ chưa đổi. |
| INFRA-07 | 🔴 CÒN |  | Chưa sửa. Base image node:22-alpine vẫn dùng tag trôi không pin digest, không `apk upgrade --no-cache` để vá CVE OS, không bước quét trivy. postgres:17-alpine và nginx:1.27-alpine cũng không pin digest. |
| INFRA-08 | 🔴 CÒN |  | Chưa sửa. Driver S3/SeaweedFS vẫn chưa hiện thực (interface có nhưng getStorage chỉ trả filesystemAdapter). Watermark cache ghi vào cache/wm/ NẰM CHUNG STORAGE_ROOT (prod mount /data/storage cùng volume với reports/) → phình vô hạn theo mỗi (reportId+userId), không cron dọn theo mtime, không tách volume, không giám sát disk. |
| INFRA-09 | 🔴 CÒN |  | Chưa sửa. Dev compose vẫn hardcode user=pass=db='blackcrest' (credential yếu, trùng tên). Prod vẫn nội suy password vào DATABASE_URL (lộ qua docker inspect/env) thay vì .pgpass/docker secret. Không cấu hình scram-sha-256 hay siết pg_hba rõ ràng. |
| INFRA-10 | 🔴 CÒN |  | Chưa sửa. nginx vẫn thiếu gzip/brotli cho text/css/js/json/svg và thiếu cache static asset (location /_next/static/ với Cache-Control public,immutable, expires 1y). Mọi asset đều proxy ngược về Next, không tận dụng edge cache. |
| INFRA-11 | 🔴 CÒN |  | Chưa sửa. Vẫn không có scripts/restore.sh và không có job restore-verify hàng tháng (chỉ là comment ở backup.sh:7). Retention offsite vẫn lệ thuộc rclone --max-age (lọc theo tuổi file khi sync, không phải lifecycle policy đúng nghĩa) — có nguy cơ xóa backup cũ hợp lệ hoặc không xóa được như ý. |
| INFRA-12 | 🟡 VÁ MỘT PHẦN |  | Một nửa được làm rõ: upload PDF đi qua Route Handler /api/admin/reports (không qua Server Action) nên giới hạn 1mb của serverActions KHÔNG áp dụng — đúng như khuyến nghị cũ và đã tài liệu hóa ở route.ts:11-13. NHƯNG mismatch kích thước vẫn còn và nay sắc nét hơn: nginx cho 12m trong khi route handler cho 25MB → upload 12–25MB bị nginx trả 413 trước khi tới app. Cần đồng bộ client_max_body_size lên 25m (hoặc giảm MAX_BYTES xuống 12MB). |

</details>

<details><summary><strong>Finding MỚI (5)</strong></summary>

- **INFRA-N01 · 🟡 MEDIUM** — Upload size mismatch thực tế: nginx 12m vs Route Handler 25MB (upload 12-25MB bị 413)
  - 📌 src/app/api/admin/reports/route.ts:16 const MAX_BYTES = 25 * 1024 * 1024; nginx/blackcrest.conf:40 client_max_body_size 12m
  - 💥 Endpoint upload thật chấp nhận tới 25MB nhưng nginx chặn ở 12MB → file PDF 12-25MB bị nginx trả 413 Request Entity Too Large trước khi tới app, EDITOR không hiểu vì sao upload fail. Đây là điểm sắc hơn của INFRA-12 (số liệu thật đã xác định được sau khi đọc route handler).
  - 🔧 Nâng client_max_body_size lên 25m (hoặc 30m có biên) để khớp MAX_BYTES, hoặc giảm MAX_BYTES xuống 12MB. Ghi rõ giới hạn thống nhất ở cả hai nơi và document trong README. _(effort S)_
- **INFRA-N02 · 🟡 MEDIUM** — nginx upstream chỉ có 1 web:3000 — blue/green chỉ là comment, single point of failure
  - 📌 nginx/blackcrest.conf:9-12 upstream blackcrest_web { server web:3000; } với comment 'flip between web_blue/web_green'; docker-compose.prod.yml:26 chỉ định nghĩa một service 'web' (không có web_blue/web_green)
  - 💥 Triển khai blue/green được quảng cáo (compose.prod:3-4, blueprint §5) nhưng thực tế chỉ có một instance web. Mọi deploy gây downtime, không có zero-downtime rollout, không có cách rollback nhanh ở tầng nginx. /api/health tồn tại nhưng không được dùng để flip upstream.
  - 🔧 Hoặc hiện thực thật 2 service web_blue/web_green + script flip upstream sau khi /api/health=200, hoặc gỡ tuyên bố blue/green và chấp nhận rolling restart có downtime ngắn, document rõ. _(effort M)_
- **INFRA-N03 · ⚪ LOW** — HEALTHCHECK của Docker không tồn tại dù endpoint /api/health đã sẵn sàng
  - 📌 src/app/api/health/route.ts:7-13 GET trả 200/503 theo DB; Dockerfile (không có dòng HEALTHCHECK); docker-compose.prod.yml service web (dòng 26-45, không có healthcheck:)
  - 💥 Endpoint health đã được viết chuẩn (503 khi DB chết) nhưng không được nối vào HEALTHCHECK Dockerfile hay healthcheck compose của web → depends_on khác không thể chờ web 'healthy', orchestrator/compose không tự restart khi web treo, và blue/green không có tín hiệu để flip. Đây là phần bổ sung cụ thể cho INFRA-06.
  - 🔧 Thêm HEALTHCHECK CMD wget -qO- http://localhost:3000/api/health || exit 1 vào Dockerfile và/hoặc healthcheck cho service web trong docker-compose.prod.yml (interval/timeout/retries). _(effort S)_
- **INFRA-N04 · ⚪ LOW** — Prisma client copy thủ công dễ vỡ trong runner stage
  - 📌 Dockerfile:33 COPY --from=builder /app/node_modules/.pnpm/@prisma+client* ./node_modules/.pnpm/
  - 💥 Việc copy thủ công thư mục .pnpm/@prisma+client* bằng wildcard rất giòn: nếu pnpm đổi layout hoặc Prisma client phụ thuộc thêm package (engine .so, @prisma/engines) thì runtime có thể thiếu module và crash 'Cannot find module @prisma/client' chỉ phát hiện lúc chạy prod. Standalone output thường đã trace dependency — copy chồng thêm có thể thừa/thiếu không nhất quán.
  - 🔧 Dựa vào next.config output:standalone để trace Prisma (serverExternalPackages đã khai @node-rs/argon2/pdf-lib nhưng KHÔNG có @prisma/client) hoặc copy nguyên node_modules cần thiết một cách tường minh; test khởi động image sau build để xác nhận prisma load được. _(effort M)_
- **INFRA-N05 · ⚪ LOW** — Backup không có verification (row-count/restore test) và không alert khi fail
  - 📌 scripts/backup.sh:8 set -euo pipefail rồi :35 echo 'Backup complete' — không kiểm tra pg_dump size>0, không restore-verify; :27 rclone bọc trong 'if command -v rclone' nên offsite có thể âm thầm bị bỏ qua nếu thiếu rclone
  - 💥 Nếu rclone không cài, backup vẫn 'thành công' nhưng KHÔNG có bản offsite (vi phạm 3-2-1). Không có bước verify dump (pg_restore --list / row count) nên backup hỏng chỉ phát hiện khi cần khôi phục thật. Không gửi cảnh báo khi fail.
  - 🔧 Fail (hoặc cảnh báo) khi rclone vắng mặt thay vì bỏ qua; thêm pg_restore --list để verify dump; viết restore-verify job hàng tháng (khôi phục vào DB tạm + đếm row); gửi notify (email/webhook) khi backup lỗi. _(effort M)_

</details>

**Điểm mạnh:** Dockerfile dùng multi-stage build với Next standalone output và chạy non-root (Dockerfile:24,35 addgroup/adduser + USER nextjs) — nền tảng hardening cơ bản đã có. · /api/health (src/app/api/health/route.ts) được viết chuẩn: trả 503 khi DB không reachable, runtime=nodejs, force-dynamic — sẵn sàng cho healthcheck/blue-green nếu được nối vào. · Postgres bind 127.0.0.1 only ở cả dev lẫn prod compose (docker-compose.yml:17, docker-compose.prod.yml:17) tránh phơi DB ra 0.0.0.0 khi Docker bypass UFW. · Kiến trúc upload đúng: PDF đi qua Route Handler streaming (/api/admin/reports, runtime=nodejs) với magic-byte check + zod validation + rollback file khi tạo record fail, không lạm dụng Server Action. · storage.ts có resolveKey chống path traversal (normalize + chặn ../, kiểm tra startsWith STORAGE_ROOT) — defense in depth tốt cho tầng lưu trữ. · nginx có rate-limit riêng cho auth (5r/m) và API view/download (60r/m) + proxy_buffering off để stream PDF, proxy_params đầy đủ X-Forwarded-* và Upgrade/Connection.

---

### 8.6 Product & Business — 52 → 58/100 (C-) 🟢 +6

**Delta:** CẢI THIỆN: report-actions.ts mới persist thật approve/reject/publish + ghi audit (REPORT_APPROVE/REJECT/PUBLISH) và viewer đã gọi reviewReport thay cho setToast giả (PB-02 từ confirmed → partially_fixed); logReportAccess đã được nối vào view+download routes nên đã có 2 mốc funnel "report viewed"/"download minted" (PB-04 → partially_fixed); hầu hết page UI (portal/reports/admin) đã dùng t() (PB-07 → partially_fixed); KPI portal có comment thừa nhận là ILLUSTRATIVE (PB-05 → partially_fixed). CÒN LẠI: upload PDF vẫn hoàn toàn không tồn tại — nút vẫn no-op (PB-01 still_open); viewer vẫn mô phỏng thị giác, không render PDF thật (PB-06 still_open); EDITOR vẫn không làm được gì trong admin (PB-03 still_open); không có roadmap/changelog/git (PB-08 still_open). MỚI: comment next.config nói "PDF qua streaming Route Handler" là sai vì route upload không tồn tại; khả năng "publish" trong action bị mồ côi (không có UI gọi); timeline duyệt trong SidePanel bịa đặt (4 bước luôn hiện "đã duyệt/đã phát hành" bất kể status thật).

**Hiện trạng:** Sản phẩm vẫn ở trạng thái "demo nhìn-như-thật" với một bước tiến thực chất duy nhất: vòng đời duyệt/từ chối/phát hành báo cáo giờ được PERSIST xuống DB kèm audit qua report-actions.ts mới và đã nối vào viewer (thay cho toast giả). Tuy nhiên hai trụ cột cốt lõi của value proposition vẫn rỗng: (1) không có luồng UPLOAD PDF nào tồn tại (không server action, không route, không storage.put) — không thể đưa nội dung vào hệ thống; (2) trình xem vẫn là 5 trang HTML cứng, KHÔNG render PDF thật dù endpoint /api/reports/[id]/view đã có. Persona EDITOR vẫn phi chức năng (bị loại khỏi mọi write action). KPI/landing vẫn là số tài chính minh họa hardcode (chỉ thêm comment nội bộ, chưa gắn nhãn demo cho người dùng). Có cải thiện một phần về i18n trang và instrumentation truy cập (view/download được log).

<details><summary><strong>Trạng thái finding cũ (8)</strong></summary>

| ID | Trạng thái | Kiểm chứng fix | Ghi chú |
|---|---|---|---|
| PB-01 | 🔴 CÒN |  | Luồng upload PDF vẫn KHÔNG tồn tại — không server action, không route handler, không storage.put. Nút 'Tải lên' vẫn là no-op thuần. Đây là khoảng trống lớn nhất: không có cách hợp lệ nào để đưa báo cáo mới vào hệ thống. REPORT_UPLOAD đã khai báo trong enum nhưng chưa bao giờ được ghi. |
| PB-02 | 🟡 VÁ MỘT PHẦN | 🟡 fix chưa trọn (verified) | Đã sửa phần lõi: approve/reject/publish giờ ghi DB thật + audit bất biến, viewer gọi action thật thay vì toast. Tuy nhiên vòng đời CHƯA đầy đủ: (a) decision 'publish' được report-actions hỗ trợ nhưng KHÔNG có UI nào gọi (mồ côi); (b) hoàn toàn thiếu bước submit DRAFT→REVIEW. Nên chỉ partially_fixed. |
| PB-03 | 🔴 CÒN |  | Persona EDITOR vẫn phi chức năng. EDITOR vào được trang admin (xem danh sách) nhưng bị chặn khỏi mọi tác vụ ghi: duyệt tài khoản, gán entitlement, duyệt báo cáo. Không có upload/tạo draft/submit nào dành cho EDITOR. Khuyến nghị cũ (định nghĩa quyền upload/draft/submit cho EDITOR HOẶC bỏ persona) chưa được thực thi. |
| PB-04 | 🟡 VÁ MỘT PHẦN | 🟡 fix chưa trọn (verified) | Có tiến bộ một phần: 2 mốc funnel cuối ('report viewed', 'download minted') đã được ghi qua logReportAccess trên view+download routes; audit log phủ approve/reject/publish/entitlement/account. CÒN THIẾU các mốc đầu phễu: register submitted, account approved (có audit ACCOUNT_APPROVE nhưng chưa coi là event funnel), first login — không được instrument. Không có lớp analytics privacy-first nào. |
| PB-05 | 🟡 VÁ MỘT PHẦN |  | Mới chỉ thêm comment nội bộ thừa nhận KPI là minh họa — KHÔNG có nhãn 'số liệu minh họa/demo' hiển thị cho người dùng, vẫn phô số tài chính giả (NAV ₫1,28 tỷ, +8,42%) trong bối cảnh wealth. getPortalSummary đã có dữ liệu thật (latestPublishedAt) nhưng portal chưa tận dụng. Landing stats vẫn hardcode hoàn toàn. Đúng tinh thần khuyến nghị nhưng chưa làm tới nơi. |
| PB-06 | 🔴 CÒN |  | Trình xem vẫn là mô phỏng thị giác 5 trang HTML hardcode (số liệu NAV/Sharpe/phân bổ đều cứng trong SummaryPage/PerformancePage/AllocationPage), KHÔNG render PDF thật của báo cáo. Endpoint /api/reports/[id]/view (Range/206) đã tồn tại nhưng viewer chỉ dùng nó cho nút in/tab mới, không nhúng pdf.js. Đây vẫn là gap nghiêm trọng với 'crown jewel'. |
| PB-07 | 🟡 VÁ MỘT PHẦN |  | Cải thiện rõ: các bề mặt người dùng chính (portal, reports, admin) đã chuyển sang next-intl t(). Còn sót: thân tài liệu trong viewer hardcode VN (chấp nhận được vì là tài liệu VN in ra) và một số chuỗi marketing/preview landing vẫn cứng VN (ProductPreview, workflow card). Phần lõi đã sửa nên partially_fixed. |
| PB-08 | 🔴 CÒN |  | Không có roadmap/changelog/issue tracking. README mô tả tính năng như đã hoàn thiện ('đã hiện thực — blueprint §6') nhưng KHÔNG nêu rõ upload/viewer thật/lifecycle đầy đủ vẫn là placeholder, gây hiểu lầm về độ chín. Repo vẫn không dưới git. |

</details>

<details><summary><strong>Finding MỚI (4)</strong></summary>

- **PB-09 · 🟡 MEDIUM** — Comment next.config khẳng định PDF đi qua 'streaming Route Handler' nhưng route upload không tồn tại
  - 📌 next.config.ts:11-15 comment 'PDFs go through a streaming Route Handler, not Server Actions' biện minh cho bodySizeLimit "1mb"; nhưng find src/app/api chỉ có auth, health, reports/[id]/{view,download} — KHÔNG có route upload nào
  - 💥 Comment gây hiểu lầm rằng đã có cơ chế nhận PDF; thực tế không có đường nào (cả Server Action lẫn Route Handler) để upload. Che giấu gap PB-01 và khiến reviewer tưởng đã xử lý.
  - 🔧 Hoặc hiện thực route handler upload thật (multipart streaming → validate zod/MIME/size → storage.put → tạo Report DRAFT + audit REPORT_UPLOAD) đúng như comment, hoặc sửa comment cho khớp hiện trạng và đánh dấu upload là chưa làm. _(effort L)_
- **PB-10 · 🟡 MEDIUM** — Khả năng 'publish' trong report-actions.ts bị mồ côi — không có UI nào gọi
  - 📌 src/server/report-actions.ts:12 decision enum gồm "publish" và :41-46 map sang PUBLISHED + set publishedAt; nhưng pdf-viewer.tsx:677 handleReview chỉ nhận "approve"|"reject", dialog state :665 chỉ "approve"|"reject" — không có nút/đường gọi publish
  - 💥 Báo cáo có thể được APPROVED nhưng không có cách nào trên UI để chuyển sang PUBLISHED → khách hàng không bao giờ thấy báo cáo đã duyệt. Vòng đời đứt ở mắt xích cuối.
  - 🔧 Thêm nút 'Phát hành' trong SidePanel hiển thị khi status===APPROVED gọi reviewReport({decision:'publish'}); hoặc tự động publish khi approve nếu đó là ý đồ thiết kế. _(effort M)_
- **PB-11 · 🟡 MEDIUM** — Timeline phê duyệt trong SidePanel bịa đặt — luôn hiển thị 4 bước 'đã hoàn tất' bất kể status thật
  - 📌 src/app/[locale]/(client)/reports/[slug]/pdf-viewer.tsx:1125-1140 timeline 4 bước (tạo draft/submit/approve/publish) đều hardcode tone 'approved'/'published' với icon check :1199-1203, không đọc report.status; ngày tháng đều '—' hoặc dùng chung publishedAt
  - 💥 Approver nhìn thấy quy trình duyệt như đã hoàn tất toàn bộ kể cả khi báo cáo còn DRAFT/REVIEW → thông tin sai lệch về trạng thái thực, có thể dẫn tới quyết định duyệt nhầm. Đặc biệt nguy hiểm trong bối cảnh kiểm soát tài liệu.
  - 🔧 Suy ra trạng thái từng bước từ report.status (và audit log thật nếu có) thay vì hardcode; bước chưa đạt tới phải hiển thị pending/chưa hoàn thành với mốc thời gian thật từ AuditLog. _(effort M)_
- **PB-12 · ⚪ LOW** — KPI tài chính giả hiển thị cho nhà đầu tư mà không có nhãn 'minh họa/demo' trên màn hình
  - 📌 portal/page.tsx:118-128 render KPIS (NAV ₫1,28 tỷ, NAV/đơn vị 12.847 +8,42% YTD, dòng tiền ròng...) qua StatCard không kèm bất kỳ chú thích 'số liệu minh họa' nào; comment thừa nhận illustrative chỉ nằm trong source :42-45
  - 💥 Trong sản phẩm private-wealth, phô số tài chính bịa cho nhà đầu tư thật (ngay cả demo) là rủi ro uy tín/pháp lý; người dùng không phân biệt được đâu là số thật.
  - 🔧 Gắn nhãn rõ 'Số liệu minh họa' trên cụm KPI, hoặc thay bằng KPI tính từ dữ liệu thật (số tài liệu được cấp, lượt xem/tải gần đây, mốc phát hành mới nhất từ getPortalSummary). _(effort S)_

</details>

**Điểm mạnh:** report-actions.ts mới persist thật vòng đời duyệt/từ chối/phát hành xuống DB (prisma.report.update set status + publishedAt) kèm audit bất biến (REPORT_APPROVE/REJECT/PUBLISH) và viewer đã gọi action thật thay vì toast giả — đúng trọng tâm khuyến nghị PB-02 · Instrumentation truy cập đã được nối: logReportAccess ghi VIEW trên /api/reports/[id]/view và DOWNLOAD trên route download — bắt được 2 mốc cuối phễu một cách privacy-aware (server-side, fire-and-forget) · i18n cấp trang đã cải thiện đáng kể: portal/reports/admin đều dùng getTranslations()/t() với catalog vi/en/zh đầy đủ, nâng trải nghiệm cho persona đa ngôn ngữ · Lớp entitlement + RBAC ở data layer chắc chắn (canViewReport gọi ở getReportBySlug, requireRole/requireFreshUser ở mọi action) — nền tảng bảo mật cho value proposition 'kiểm soát đến từng trang' là thật · Comment mã trung thực hơn: đã ghi nhận rõ KPI là 'ILLUSTRATIVE' và viewer là 'VISUAL recreation — no real PDF renderer', giúp reviewer/nhà phát triển hiểu đúng phạm vi (dù chưa phản ánh ra UI/README)

---

### 8.7 Security — AuthN, Session, Secrets, Web — 62 → 60/100 (C-) 🔴 -2

**Delta:** CẢI THIỆN: gần như không có gì trong dimension security. Chỉ ghi nhận register-action giữ thông điệp field-hint thay vì khẳng định trắng trợn (vẫn lộ), và report-actions.ts mới có dùng requireRole đúng cách (positive). nginx vẫn có X-Content-Type-Options / X-Frame-Options / Referrer-Policy (vốn đã có từ trước, KHÔNG phải fix mới). CÒN TỒN ĐỌNG: 11/11 prior findings vẫn open — secret chưa rotate và vẫn nằm trên đĩa (SEC-01), fallback hardcode DOWNLOAD_TOKEN_SECRET (SEC-02), không CSP (SEC-03), tokenVersion revoke vẫn hỏng + role change không bump (SEC-04), không HSTS (SEC-05), timing enumeration login (SEC-06), register lộ email tồn tại (SEC-07), password chỉ min 8 không complexity/breach check (SEC-08), download token qua query + thiếu aud/iss (SEC-09), trustHost:true mọi môi trường + không khai báo cookies (SEC-10), seed DEV_PASSWORD không có prod guard (SEC-11). Không có regression mới đáng kể trong security.

**Hiện trạng:** Trạng thái bảo mật AuthN/Session/Secrets/Web gần như KHÔNG thay đổi so với lần audit trước. Hầu hết các "fix" mà developer tuyên bố nằm ở dimension khác (UI, i18n, report-actions). Trong phạm vi security: TẤT CẢ 11 prior findings vẫn còn nguyên (still_open), không có cái nào được khắc phục thực sự. Các điểm nghiêm trọng vẫn tồn tại: secret thật còn trên đĩa (.env), DOWNLOAD_TOKEN_SECRET vẫn có fallback hardcode, không có CSP/HSTS, cơ chế tokenVersion thu hồi phiên VẪN không hoạt động (requireFreshUser lấy tokenVersion từ DB nhưng KHÔNG so sánh với JWT; đổi role không bump tokenVersion). Nền tảng kiến trúc vẫn vững (re-check auth + entitlement tại data layer trên mọi route, Argon2id, one-time download token atomic, middleware không phải security boundary) — đó là lý do điểm chưa tụt sâu. Nhưng vì developer nói "đã fix nhiều" mà thực tế dimension này không được động tới, điểm giữ ở mức 60/100 (C-).

<details><summary><strong>Trạng thái finding cũ (11)</strong></summary>

| ID | Trạng thái | Kiểm chứng fix | Ghi chú |
|---|---|---|---|
| SEC-01 | 🔴 CÒN |  | File .env vẫn chứa secret thật trên đĩa. AUTH_SECRET khác placeholder của .env.example ("replace-me") nhưng đây chính là giá trị đã tồn tại từ lần audit trước (mtime .env = 14:50, trước audit) — KHÔNG có bằng chứng rotate sau khi audit. Không có fail-fast kiểm tra secret trùng mẫu/yếu khi khởi động. .gitignore có loại trừ .env (tốt) nhưng project không dưới git nên vô tác dụng; secret vẫn coi như đã lộ và chưa xoay. |
| SEC-02 | 🔴 CÒN |  | Fallback hardcode "insecure-dev-download-secret" VẪN còn nguyên — không hề bỏ. Nếu prod thiếu DOWNLOAD_TOKEN_SECRET, app sẽ ký/verify token bằng secret công khai này -> ai cũng có thể forge download token. Không có throw fail-fast tại boot. AUTH_SECRET không được validate tường minh ở đâu trong src/. |
| SEC-03 | 🔴 CÒN |  | Hoàn toàn vẫn KHÔNG có Content-Security-Policy ở bất kỳ đâu — không trong next.config.ts headers(), không trong nginx. Không có Permissions-Policy, không có nonce/strict-dynamic. Đặc biệt nguy hiểm với một PDF viewer (cần object-src/frame-ancestors). |
| SEC-04 | 🔴 CÒN |  | Cơ chế thu hồi phiên qua tokenVersion VẪN HỎNG hoàn toàn. requireFreshUser lấy tokenVersion từ DB nhưng không bao giờ đối chiếu với token trong JWT -> bump tokenVersion thực tế vô nghĩa. Hơn nữa session callback (auth.config.ts:31-38) không đưa tokenVersion vào session nên không thể so sánh. Đổi ROLE (accounts.ts không có action đổi role; nhưng dù đổi cũng không bump) không bump tokenVersion -> client bị hạ quyền vẫn giữ JWT role cũ tới 30 phút. Khuyến nghị cũ chưa được thực hiện. |
| SEC-05 | 🔴 CÒN |  | Vẫn THIẾU HSTS dù đã terminate TLS (listen 443 ssl, dòng 35) và đã redirect 80->443 (dòng 28-30). Không có add_header Strict-Transport-Security ở server block 443. |
| SEC-06 | 🔴 CÒN |  | Account enumeration qua timing VẪN còn. Khi user không tồn tại (hoặc không có passwordHash), authorize trả null ngay lập tức mà không chạy một argon2 verify dummy để cân bằng thời gian. Argon2 verify ~hàng chục-trăm ms tạo chênh lệch thời gian rõ rệt -> phân biệt email tồn tại/không. |
| SEC-07 | 🔴 CÒN |  | Đăng ký VẪN tiết lộ rõ email đã tồn tại qua thông điệp "Email này đã được đăng ký.". Comment dòng 67 thừa nhận "Avoid leaking... beyond a generic field hint" nhưng đó vẫn là leak trực tiếp. Không có rate-limit ở tầng app cho endpoint register (chỉ nginx limit_req zone=auth áp cho /api/auth/, KHÔNG áp cho server action register). |
| SEC-08 | 🔴 CÒN |  | Chính sách mật khẩu VẪN chỉ là min 8 ký tự. Không có yêu cầu độ phức tạp, không có đối chiếu danh sách lộ (zxcvbn / HIBP k-anonymity). Khuyến nghị cũ (10-12 ký tự + breach check) chưa được áp dụng. |
| SEC-09 | 🔴 CÒN |  | Download token VẪN truyền qua query string (route.ts:30, download-actions.ts:28 url ?token=...) và VẪN thiếu ràng buộc iss/aud cả khi ký lẫn khi verify. Mitigations hiện có (TTL 60s + one-time atomic consume tại download-token.ts:50-54) giảm rủi ro nhưng khuyến nghị cũ (setIssuer/setAudience, tránh log query) chưa thực hiện. nginx không có cấu hình tắt log query cho route download. |
| SEC-10 | 🔴 CÒN |  | VẪN trustHost: true ở mọi môi trường và KHÔNG khai báo tường minh khối cookies (httpOnly/sameSite:'lax'/secure/__Host- prefix). Đang dựa hoàn toàn vào default của Auth.js. Khuyến nghị cũ chưa thực hiện. |
| SEC-11 | 🔴 CÒN |  | Seed VẪN dùng một DEV_PASSWORD chung hardcode cho mọi user và KHÔNG có guard if(process.env.NODE_ENV==="production") throw ở đầu. Chạy nhầm trên prod sẽ tạo/ghi đè tài khoản admin với mật khẩu công khai. Không có forcePasswordChange. |

</details>

<details><summary><strong>Finding MỚI (3)</strong></summary>

- **SEC-12 · 🟠 HIGH — ✅ xác nhận** — tokenVersion không được đưa vào session callback nên không thể so sánh ở bất kỳ đâu
  - 📌 src/auth.config.ts:22-30 jwt callback set token.tokenVersion; nhưng session callback (31-38) chỉ set id/role/status, KHÔNG set session.user.tokenVersion. next-auth.d.ts:5-11 Session.user cũng không khai báo tokenVersion.
  - 💥 Ngay cả khi sửa requireFreshUser để so sánh tokenVersion, session.user.tokenVersion luôn undefined -> so sánh sẽ luôn sai/không khả thi. Đây là nguyên nhân gốc thứ hai khiến cơ chế revoke không thể hoạt động, bổ trợ cho SEC-04.
  - 🔧 Đưa token.tokenVersion vào session.user trong session callback và khai báo trong next-auth.d.ts; sau đó so sánh dbUser.tokenVersion !== session.user.tokenVersion trong requireFreshUser và ép re-login khi lệch. _(effort S)_
- **SEC-14 · 🟡 MEDIUM** — Không có giới hạn tần suất ở tầng ứng dụng cho register / login server action
  - 📌 src/server/auth-actions.ts registerAction/loginAction không có throttle; nginx limit_req zone=auth (blackcrest.conf:43) chỉ áp cho location /api/auth/, KHÔNG áp cho Server Action POST tới route trang (vd /vi/register, /vi/login) đi qua location / (blackcrest.conf:56).
  - 💥 loginAction và registerAction chạy qua Server Action (POST tới đường dẫn trang, không phải /api/auth/) nên rate-limit nginx không bảo vệ -> brute-force mật khẩu và enumeration email qua register không bị chặn ở mức hạ tầng hiện có.
  - 🔧 Thêm rate-limit ở tầng app (vd theo IP + email, dùng store như Postgres/Redis) cho loginAction/registerAction, HOẶC mở rộng nginx limit_req cho các path action đăng nhập/đăng ký, hoặc dùng next-safe-action với rate limiter. _(effort M)_
- **SEC-13 · ⚪ LOW** — clientIp tin tưởng x-forwarded-for không xác thực — IP watermark/audit có thể bị giả mạo
  - 📌 src/app/api/reports/[id]/view/route.ts:13-19 và download/route.ts:12-18 đọc req.headers.get("x-forwarded-for")?.split(",")[0] làm IP mà không xác minh request đến từ nginx tin cậy.
  - 💥 Kẻ tấn công gọi trực tiếp web:3000 (nếu lọt qua nginx) hoặc set header tùy ý có thể chèn IP giả vào watermark PDF và bảng audit (audit.ts), làm sai lệch chuỗi truy vết rò rỉ tài liệu — vốn là crown-jewel của hệ thống.
  - 🔧 Chỉ tin x-forwarded-for khi request đến từ proxy đã biết; cấu hình số hop tin cậy hoặc dùng x-real-ip do nginx đặt; đảm bảo cổng 3000 chỉ expose nội bộ (đã expose:3000 trong compose — tốt) và không nhận XFF từ client trực tiếp. _(effort M)_

</details>

**Điểm mạnh:** Kiến trúc authZ vững: canViewReport (authz.ts:15-27) là điểm kiểm soát duy nhất, dùng correlated EXISTS qua Prisma some; mọi route PDF re-check auth + entitlement trên TỪNG request (view/route.ts:42, download/route.ts:52) — không tin middleware (đã ghi rõ CVE-2025-29927 ở middleware.ts:8). · Download token an toàn về vòng đời: one-time qua updateMany atomic (download-token.ts:50-54), TTL 60s, và route vẫn re-validate user.status===APPROVED + canViewReport SAU khi consume token (download/route.ts:42-54) — defense in depth tốt. · Argon2id với tham số mạnh (memoryCost 64MiB, timeCost 3) tại password.ts:7-13; verify bọc try/catch trả false an toàn. · Input validation bằng Zod đồng đều trên toàn bộ Server Actions và Route Handlers (cuid validation cho id, schema cho login/register/review). · Không có lỗ XSS dạng dangerouslySetInnerHTML/eval; Server Actions của Next 15 có CSRF/same-origin mặc định; login chặn open-redirect tường minh (auth-actions.ts:99-104).

---

### 8.8 SEO — 52 → 61/100 (D+) 🟢 +9

**Delta:** Cải thiện so với lần trước: (1) thêm noindex mặc định ở root layout → các route private nay thực sự noindex (điểm cộng lớn nhất, đúng trọng tâm gated-portal); (2) nội dung landing en/zh đã được localize thật trong messages/{en,zh}.json nên không còn duplicate content tiếng Việt; (3) landing và login/register đều có metadata.title rõ ràng. Vẫn còn nguyên: KHÔNG có robots.ts, sitemap.ts, manifest, opengraph-image, favicon/icon, apple-icon, metadataBase, alternates/hreflang, openGraph, Twitter card, canonical, JSON-LD — không một file đặc biệt SEO nào của Next được thêm vào. Phát sinh rủi ro mới: cả 3 locale cùng index nhưng thiếu hreflang/canonical (SEO-NEW-01) khiến Google có thể coi 3 bản là cạnh tranh nhau; và OG images dùng URL tương đối sẽ hỏng do không có metadataBase nếu sau này thêm OG.

**Hiện trạng:** SEO của Blackcrest đã có một cải thiện nền tảng quan trọng: root layout `src/app/[locale]/layout.tsx:17` nay đặt `robots: { index: false, follow: false }` làm mặc định, nên toàn bộ route gated (/portal, /admin) và cả login/register tự động phát meta `noindex` — đúng tinh thần "gated portal chỉ index trang marketing". Trang landing `(public)/page.tsx:16` override `index: true, follow: true` và nội dung đã được dịch thật cho cả en/zh (messages/{en,zh}.json), nên không còn là bản sao tiếng Việt. Tuy nhiên đây mới là phân nửa công việc: KHÔNG có robots.ts, sitemap.ts, manifest.ts, opengraph-image, favicon/icon, metadataBase, alternates/hreflang, openGraph/Twitter, canonical hay JSON-LD ở bất kỳ đâu trong project (đã grep toàn bộ src). Việc index cả 3 locale mà thiếu hreflang/canonical là rủi ro mới cần khắc phục.

<details><summary><strong>Trạng thái finding cũ (7)</strong></summary>

| ID | Trạng thái | Kiểm chứng fix | Ghi chú |
|---|---|---|---|
| SEO-01 | 🟡 VÁ MỘT PHẦN | 🟡 fix chưa trọn (verified) | Phần lõi đã được xử lý: nội dung landing en/zh nay là bản dịch thật (English/中文) chứ không còn là tiếng Việt sao chép, nên không còn duplicate-content sai ngôn ngữ. NHƯNG cả 3 locale vẫn cùng index:true mà KHÔNG có hreflang/canonical liên kết chúng (xem SEO-02/SEO-07 vẫn still_open) → Google chưa biết đây là 3 phiên bản ngôn ngữ của cùng một trang, vẫn còn rủi ro. Ngoài ra (public)/page.tsx vẫn còn 8 chuỗi tiếng Việt hardcode trong ProductPreview/Workflow (vd "Báo cáo Quý III 2026", "Tổng quan quỹ") rò rỉ vào trang en/zh — nội dung mockup trang trí nên ảnh hưởng nhẹ. |
| SEO-02 | 🔴 CÒN |  | Hoàn toàn chưa làm. metadataBase vẫn thiếu nên mọi URL trong metadata sẽ là tương đối. Không có alternates.languages (hreflang) cho vi/en/zh dù routing đã localePrefix:'always' và nội dung đã dịch — đây giờ là lỗ hổng nghiêm trọng hơn vì cả 3 locale đều index. Vẫn không có generateMetadata theo locale. |
| SEO-03 | 🔴 CÒN |  | Chưa có openGraph, chưa có twitter card, chưa có opengraph-image.tsx/PNG. Landing share lên mạng xã hội vẫn không có preview. public/logos/ có sẵn logo-mark.svg nhưng chưa được tận dụng làm OG image. |
| SEO-04 | 🟡 VÁ MỘT PHẦN |  | robots.ts/sitemap.ts vẫn CHƯA được thêm — không có host/sitemap directive cho crawler, không có sitemap liệt kê URL công khai. Tuy nhiên mục tiêu cốt lõi 'chặn /portal,/admin khỏi index' nay đã đạt được gián tiếp qua meta noindex mặc định ở root layout (mọi route gated thừa kế index:false). Vì vậy nâng từ still_open lên partially_fixed: việc bảo vệ route private đã có, nhưng vẫn thiếu robots.txt/sitemap đúng nghĩa. |
| SEO-05 | 🔴 CÒN |  | Chưa có structured data Organization/WebSite. Không có JSON-LD ở landing. |
| SEO-06 | 🔴 CÒN |  | Vẫn thiếu favicon/apple-touch-icon/web manifest. Trình duyệt và Google sẽ dùng icon mặc định. public/logos/logo-mark.svg vẫn chưa được dùng làm icon. |
| SEO-07 | 🔴 CÒN |  | Chưa có canonical URL. Do đã bật index cho cả 3 locale, việc thiếu canonical (kết hợp thiếu hreflang ở SEO-02) làm tăng rủi ro Google chọn sai URL đại diện. |

</details>

<details><summary><strong>Finding MỚI (3)</strong></summary>

- **SEO-NEW-01 · 🟠 HIGH — ✅ xác nhận** — Index cả 3 locale nhưng thiếu hreflang + canonical → rủi ro nội dung cạnh tranh
  - 📌 (public)/page.tsx:16 robots:{index:true} áp cho mọi locale (vi/en/zh đều render trang này); routing.ts:8-15 localePrefix:'always' tạo /vi,/en,/zh; nhưng grep alternates|hreflang|canonical trong src = 0
  - 💥 Sau khi developer localize nội dung và bật index cho cả 3 ngôn ngữ, việc thiếu hreflang khiến Google không biết /vi,/en,/zh là 3 phiên bản ngôn ngữ của cùng một trang. Có thể phục vụ sai locale cho người dùng, làm loãng tín hiệu xếp hạng, và bị coi là near-duplicate (bố cục giống hệt). Đây là rủi ro mới phát sinh chính từ việc 'fix' SEO-01.
  - 🔧 Thêm metadataBase (NEXT_PUBLIC_SITE_URL) vào root layout và dùng generateMetadata trả alternates:{canonical, languages:{vi,en,zh,'x-default'}} cho trang landing. next-intl có helper sinh alternate theo locale. _(effort M)_
- **SEO-NEW-03 · 🟡 MEDIUM** — Thiếu metadataBase khiến mọi URL tuyệt đối trong metadata sẽ sai khi thêm OG/canonical
  - 📌 layout.tsx:10-18 metadata object KHÔNG có metadataBase; .env/.env.example không có NEXT_PUBLIC_SITE_URL (chỉ có NEXT_PUBLIC_APP_NAME)
  - 💥 Là tiền đề cho SEO-02/03/07: nếu thêm openGraph.images hay alternates.canonical mà không có metadataBase, Next sẽ cảnh báo và sinh URL tương đối không hợp lệ cho crawler/social. Cần làm trước.
  - 🔧 Thêm NEXT_PUBLIC_SITE_URL vào .env(.example) và set metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL!) trong root layout. _(effort S)_
- **SEO-NEW-02 · ⚪ LOW** — Mock content tiếng Việt hardcode rò rỉ vào trang landing en/zh
  - 📌 (public)/page.tsx:291 'blackcrest.app/portal/bao-cao/q3-2026.pdf', :324 'Báo cáo Quý III 2026', :328 'Quỹ Cân Bằng Blackcrest', :337 'NAV / đơn vị', :347 'Lợi nhuận YTD', và railItems :275-279 ('Tổng quan quỹ', 'Hiệu suất Q3'...) — 8 chuỗi VI cứng
  - 💥 Khi crawl /en và /zh, các khối mockup này vẫn hiển thị tiếng Việt, làm giảm chất lượng tín hiệu ngôn ngữ của trang và trải nghiệm khách quốc tế. Nhẹ vì là nội dung trang trí phụ, nhưng vẫn lẫn lộn ngôn ngữ trên trang đã tuyên bố lang=en/zh.
  - 🔧 Chuyển các chuỗi mockup này sang messages/{vi,en,zh}.json (hoặc dùng số/nhãn trung lập) để trang en/zh đồng nhất ngôn ngữ. _(effort S)_

</details>

**Điểm mạnh:** Root layout đặt robots:{index:false,follow:false} mặc định (layout.tsx:17) — mọi route gated (/portal,/admin) và login/register tự noindex; đây là quyết định SEO đúng đắn nhất cho một portal bảo mật · Nội dung landing đã được localize thật cho en/zh (messages/en.json tiếng Anh, messages/zh.json tiếng Trung) thay vì sao chép tiếng Việt — xóa bỏ duplicate-content sai ngôn ngữ · SSR/SSG vững: RSC mặc định + generateStaticParams pre-render mọi locale + setRequestLocale bật static rendering, nội dung crawl được hoàn toàn · Mỗi trang công khai có metadata.title riêng (landing, login, register) với title template thống nhất '%s · Blackcrest' · middleware matcher loại trừ /api,_next và file tĩnh hợp lý, không cản trở crawler ở trang công khai

---

### 8.9 Accessibility (A11y) — 58 → 63/100 (D+) 🟢 +5

**Delta:** CẢI THIỆN: (1) A11Y-05 đã sửa hẳn — thêm block @media (prefers-reduced-motion: reduce) áp cho *, ::before, ::after nên Dialog pop/Toast slide/spinner/reveal đều dừng. (2) A11Y-04 sửa phần lớn ở light theme — ink-3 #565b63 (6.84:1) và ink-4 #686e76 (5.15:1) trên nền trắng đều đạt AA; có comment giải thích rõ trong colors.css:46-52. (3) A11Y-13 giảm rủi ro nhờ form field dùng focus-within:border-accent (viền đặc #16181d ≈ 17.76:1) bên cạnh halo. VẪN CÒN: focus management của Dialog (A11Y-01), aria liên kết Dialog (A11Y-02), Tabs pattern (A11Y-03), Tooltip Esc/describedby (A11Y-06), tên thumbnail (A11Y-07), skip-link (A11Y-08), landmark landing (A11Y-09), Toast role (A11Y-10), điều hướng phím LanguageSwitcher (A11Y-11), Logo mark (A11Y-12) — gần như không đụng tới. MỚI PHÁT SINH: regression tương phản ink-4 ở dark theme (3.45:1), và token focus-ring vẫn để 0.28/0.30 (chưa nâng).

**Hiện trạng:** Trạng thái hiện tại: A11y mới chỉ nhích nhẹ. Hai sửa đổi thật sự có giá trị đã được áp dụng — reduced-motion guard toàn cục (globals.css:220-229) và nâng tương phản các token ink ở light theme đạt WCAG AA (ink-4 #686e76 = 5.15:1). Tuy nhiên các lỗ hổng nghiêm trọng nhất vẫn còn nguyên: Dialog (src/components/ui/dialog.tsx) vẫn KHÔNG có focus-trap, không set/restore focus, không aria-labelledby/aria-describedby — chỉ có Escape; Tabs vẫn không theo ARIA tab pattern; Tooltip vẫn không đóng bằng Esc và không liên kết aria-describedby; nút thumbnail trong PDF viewer vẫn không có tên truy cập; vẫn thiếu skip-link trên mọi layout; trang landing vẫn không có <main>; Toast vẫn hardcode role="status" kể cả khi tone=danger; LanguageSwitcher vẫn dùng listbox không có điều hướng mũi tên. Đáng lo: việc darken token đã tạo regression ở DARK theme — ink-4 (#62666d) chỉ đạt 3.45:1, rớt AA cho văn bản thường. 10/13 finding cũ vẫn mở hoặc mới sửa một phần.

<details><summary><strong>Trạng thái finding cũ (13)</strong></summary>

| ID | Trạng thái | Kiểm chứng fix | Ghi chú |
|---|---|---|---|
| A11Y-01 | 🔴 CÒN |  | Vẫn không có focus-trap, không set focus ban đầu, không restore focus khi đóng. Chỉ thêm/giữ Escape. Tab vẫn thoát ra khỏi modal ra nội dung nền — đây là lỗi A11y nặng nhất của portal và chưa được chạm tới. |
| A11Y-02 | 🔴 CÒN |  | Dialog vẫn không liên kết tiêu đề/mô tả với role=dialog. Screen reader khi mở modal sẽ không đọc được tên/ngữ cảnh. Chưa sửa. |
| A11Y-03 | 🔴 CÒN |  | Tabs vẫn không theo ARIA tab pattern. Dùng tại pdf-viewer SidePanel (tabInfo/tabAccess) nên người dùng bàn phím/screen reader không nhận biết đây là tab. Chưa sửa. |
| A11Y-04 | 🟡 VÁ MỘT PHẦN | 🟡 fix chưa trọn (verified) | Đã darken token và đạt AA ở light theme (kèm comment giải thích). Nhưng DARK theme bị bỏ sót: ink-4 #62666d chỉ 3.45:1, dùng cho văn bản thật (pdf-viewer:791 subtitle, số thumbnail, đếm trang). Còn raw #9aa0a8 (2.64:1) vẫn nằm trong thân tài liệu PDF mô phỏng (pdf-viewer:135,280). |
| A11Y-05 | ✅ ĐÃ FIX |  | Đã thêm guard toàn cục đúng khuyến nghị. Bao trùm mọi keyframe bc-* (bc-fade/bc-pop/bc-toast/bc-rise/bc-page-enter) và mọi transition/spin/pulse. Sửa triệt để. |
| A11Y-06 | 🔴 CÒN |  | Tooltip vẫn không đóng bằng Esc và không liên kết aria-describedby với trigger. Trong pdf-viewer Tooltip lại bọc IconButton vốn đã có aria-label trùng nội dung → screen reader đọc lặp. Chưa sửa. |
| A11Y-07 | 🔴 CÒN |  | Nút thumbnail vẫn không có accessible name mô tả (chỉ là con số). Rail (aside dòng 845) cũng chưa bọc trong <nav aria-label>. Chưa sửa. |
| A11Y-08 | 🔴 CÒN |  | Vẫn thiếu hoàn toàn skip-link 'Bỏ qua tới nội dung' trên mọi layout. <main> trong app-shell không có id để nhảy tới. Chưa sửa. |
| A11Y-09 | 🔴 CÒN |  | Trang landing vẫn không có landmark <main> (chỉ có <header> và <footer>). Lưu ý: trang login (login/page.tsx:30) và register (register/page.tsx:26) ĐÃ có <main> — nhưng đó là trang riêng, không phải finding này. Landing chưa sửa. |
| A11Y-10 | 🔴 CÒN |  | Toast vẫn dùng role=status (polite) kể cả khi tone='danger'/'warning'. Lỗi tải/từ chối báo cáo sẽ không được screen reader thông báo kịp thời (cần role=alert/assertive). Chưa sửa. |
| A11Y-11 | 🔴 CÒN |  | LanguageSwitcher vẫn khai báo listbox/option nhưng không hỗ trợ điều hướng mũi tên — vi phạm hợp đồng ARIA listbox. Chưa sửa. |
| A11Y-12 | 🔴 CÒN |  | Component Logo với variant='mark' vẫn không có tên truy cập độc lập. Hiện được che một phần vì nơi dùng bọc <Link aria-label='Blackcrest'> (app-shell.tsx:123, page.tsx:164) — nhưng bản thân component vẫn thiếu, dùng mark độc lập sẽ vô danh. Chưa sửa ở cấp component. |
| A11Y-13 | 🟡 VÁ MỘT PHẦN |  | Token focus-ring KHÔNG được nâng (vẫn 0.28 light / 0.30 dark). Tuy nhiên form field còn có viền accent đặc khi focus, đủ tương phản >3:1 làm chỉ báo chính, nên rủi ro thực tế giảm. Vẫn nên nâng opacity ring và lưu ý checkbox/switch (checkbox.tsx:50, switch.tsx:50) chỉ dựa vào halo focus-ring yếu này khi focus-visible. |

</details>

<details><summary><strong>Finding MỚI (5)</strong></summary>

- **A11Y-14 · 🟠 HIGH — ✅ xác nhận** — Regression: ink-4 ở dark theme rớt WCAG AA (3.45:1) sau khi chỉ sửa light theme
  - 📌 src/styles/tokens/colors.css:116 [data-theme="dark"] --color-text-quaternary:#62666d → 3.45:1 trên #08090a (3.30 trên level-1, 3.17 trên level-2); dùng cho văn bản thật, vd pdf-viewer.tsx:791 className="text-[12px] text-ink-4" (slug/category), số thumbnail dòng 884, đếm trang dòng 932
  - 💥 Người dùng dark theme đọc metadata phụ (slug, danh mục, số trang, nhãn) không đạt tương phản tối thiểu — vi phạm WCAG 1.4.3. Việc fix light theme đã bỏ quên đối xứng dark.
  - 🔧 Nâng --color-text-quaternary dark lên ≥ #8b9099 (~4.5:1 trên #08090a) hoặc chỉ dùng ink-4 cho phần tử phi-văn-bản ở dark theme. Kiểm cả ink-3 dark #8a8f98 (6.13:1 — đạt) để giữ thứ bậc. _(effort S)_
- **A11Y-15 · 🟡 MEDIUM** — Tabs không có role=tabpanel/aria-labelledby liên kết nội dung tab
  - 📌 src/app/[locale]/(client)/reports/[slug]/pdf-viewer.tsx:1155-1264 vùng nội dung {tab==="info" ? ... : ...} render trực tiếp trong <div className=flex-1 overflow-auto p-4>, không có role=tabpanel, không aria-labelledby trỏ về tab; Tabs component cũng không phát id
  - 💥 Ngay cả khi sửa A11Y-03 ở component, panel nội dung (Thông tin/Truy cập) vẫn không được liên kết với tab tương ứng nên screen reader không hiểu quan hệ.
  - 🔧 Khi triển khai tab pattern, gán id cho mỗi tab và role=tabpanel + aria-labelledby={tabId} cho vùng nội dung; ẩn panel không active bằng hidden. _(effort M)_
- **A11Y-16 · ⚪ LOW** — Rail thumbnail không phải landmark điều hướng và không có aria-current
  - 📌 src/app/[locale]/(client)/reports/[slug]/pdf-viewer.tsx:845 <aside className="w-[168px] ..."> chứa danh sách nút trang; không có <nav aria-label> bao quanh, nút active (dòng 848 const active) không đặt aria-current="true"
  - 💥 Người dùng screen reader không nhận biết đây là bộ điều hướng trang và không biết trang nào đang xem.
  - 🔧 Bọc rail trong <nav aria-label="Điều hướng trang">; thêm aria-current="true" cho nút trang hiện tại (đi kèm aria-label của A11Y-07). _(effort S)_
- **A11Y-17 · ⚪ LOW** — Văn bản trong tài liệu PDF mô phỏng dùng xám dưới ngưỡng AA
  - 📌 src/app/[locale]/(client)/reports/[slug]/pdf-viewer.tsx:135 color:#9aa0a8 (footer 2.64:1), dòng 280/281 #9aa0a8, nhiều nhãn #6a6f78 (5.05:1 — ok) và footer trang dòng 138-141
  - 💥 Đây là HTML thật được render (không phải ảnh PDF), nên screen reader/zoom vẫn đọc; footer 'Bảo mật — chỉ dành cho nhà đầu tư · Trang n/total' ở 2.64:1 khó đọc. Mức độ thấp vì là thân tài liệu in mô phỏng.
  - 🔧 Thay #9aa0a8 trong các đoạn văn bản tài liệu bằng ≥#6a6f78 (đạt ~5:1) hoặc đậm hơn cho footer/metadata; giữ watermark (rgba .05) là phi-văn-bản nên chấp nhận. _(effort S)_
- **A11Y-18 · ⚪ LOW** — Checkbox/Switch chỉ dựa vào halo focus-ring yếu (0.28/0.30) làm chỉ báo focus
  - 📌 src/components/ui/checkbox.tsx:50 peer-focus-visible:shadow-[0_0_0_3px_var(--color-focus-ring)] và switch.tsx:50 tương tự; globals.css:156-160 loại trừ form field khỏi ring đen toàn cục; --color-focus-ring=rgba(20,22,27,0.28)
  - 💥 Khác với Input/Select (có thêm border-accent đặc), Checkbox và Switch không có viền đặc khi focus — chỉ có halo mờ 0.28, có thể không đạt 3:1 so với nền, làm người dùng bàn phím khó định vị (WCAG 2.4.7/1.4.11).
  - 🔧 Tăng opacity --color-focus-ring (≈0.5) hoặc thêm viền accent đặc/đổi màu box khi peer-focus-visible cho checkbox/switch. _(effort S)_

</details>

**Điểm mạnh:** Reduced-motion được xử lý triệt để bằng guard toàn cục trong globals.css:220-229 — vượt yêu cầu, bao mọi animation/transition · IconButton ép buộc prop label gắn vào aria-label (icon-button.tsx:64-65) nên không có nút icon vô danh ở toolbar · DataTable dùng bảng ngữ nghĩa thật: thead/tbody, th scope=col, caption sr-only, srHeader cho cột hành động (data-table.tsx:54-69) · Form lỗi dùng role=alert đúng cách ở login-form.tsx:66 và register-form.tsx:108; field error liên kết qua Input error · Light theme ink-3/ink-4 đã được darken có chủ đích đạt WCAG AA, kèm comment giải thích rõ trong colors.css:46-52 · focus-visible ring đen toàn cục cho a/button/role=tab/option/tabindex (globals.css:156-160) và form field có viền accent đặc khi focus · Trang login/register dùng <main>; landmark header/footer/figure/blockquote hợp lý trên landing

---

### 8.10 API Layer & Server Actions — 68 → 63/100 (C) 🔴 -5

**Delta:** CẢI THIỆN: (1) Thêm report-actions.ts với reviewReport trả về ReviewResult {ok,error}, bắt ForbiddenError (try/catch quanh requireRole) và ZodError (safeParse → "Yêu cầu không hợp lệ"), thay thế toast giả ở viewer — chuẩn hoá error một phần cho API-05. (2) take của listVisibleReports được nâng (reports 24, portal 6) giảm nhẹ nguy cơ cắt dữ liệu cho API-04. (3) PDF routes có Cache-Control: private, no-store đúng (không phải vấn đề mới). VẪN CÒN: API-01 rate limiting (0 thay đổi — không dep, không 429/Retry-After), API-02 timeout/maxDuration (0 thay đổi), API-03 pagination admin (3 query vẫn unbounded, listGroupsWithEntitlements còn include lồng nặng), API-04 nextCursor vẫn không nối vào UI (không có nút "Tải thêm"), API-06 envelope lỗi vẫn lẫn ngôn ngữ + plain-text, API-07 React Query vẫn chết, API-08 audit vẫn 80 cứng không cursor + hiển thị độ dài trang. Điểm hạ nhẹ 68→63 vì phần lớn finding tồn đọng và xuất hiện vài bất nhất mới trong code mới.

**Hiện trạng:** Tầng API hiện tại có kiến trúc nền tảng vững (re-check auth+entitlement ở mọi route/action qua canViewReport, one-time download token tiêu thụ atomic, watermark cache theo user, Range/206 cho pdf.js, healthcheck nhị phân DB). Tuy nhiên các điểm yếu vận hành cốt lõi mà bản audit trước nêu ra gần như chưa được khắc phục: VẪN không có rate limiting cho login/register/download (rủi ro brute-force + lạm dụng sinh PDF), VẪN không có timeout/maxDuration nào cho route stream và stamp() watermark, các truy vấn admin (listAdminReports/listAccounts/listGroupsWithEntitlements) VẪN findMany không take, nextCursor đã có sẵn ở listVisibleReports nhưng UI VẪN không dùng, và audit log VẪN cắt cứng 80 dòng không cursor. Cải thiện thực chất duy nhất là report-actions.ts mới: reviewReport trả ActionState {ok,error} có bắt ZodError/Forbidden — nhưng accounts.ts và entitlements.ts vẫn .parse() ném thẳng. Envelope lỗi route handler vẫn lẫn ngôn ngữ + plain text. React Query vẫn là hạ tầng chết (không call site useQuery/useMutation nào).

<details><summary><strong>Trạng thái finding cũ (8)</strong></summary>

| ID | Trạng thái | Kiểm chứng fix | Ghi chú |
|---|---|---|---|
| API-01 | 🔴 CÒN |  | Chưa khắc phục. Hoàn toàn không có rate limiting trên login/register/download/view; không có dependency, không có bảng đếm in-house, không có response 429 nào. Đây vẫn là rủi ro cao nhất của dimension (brute-force mật khẩu + lạm dụng sinh PDF watermark tốn CPU). |
| API-02 | 🔴 CÒN |  | Chưa khắc phục. Không có route segment maxDuration, không có timeout cho stream hay stamp(), không có giới hạn trang/byte. PDF lớn hoặc storage chậm có thể treo worker Node tới giới hạn hạ tầng. |
| API-03 | 🔴 CÒN |  | Chưa khắc phục. Cả ba query admin vẫn nạp toàn bảng. listGroupsWithEntitlements đặc biệt nặng vì include lồng (entitlements + report.translations) không phân trang, không lazy-load — sẽ thoái hoá tuyến tính theo dữ liệu. |
| API-04 | 🟡 VÁ MỘT PHẦN |  | Cải thiện một phần (take nâng 12→24 ở thư viện, 6 ở portal) nhưng cốt lõi chưa giải quyết: nextCursor vẫn bị bỏ hoàn toàn, không có nút 'Tải thêm'/infinite scroll. Quá 24 báo cáo sẽ bị cắt âm thầm, không cảnh báo còn dữ liệu. |
| API-05 | 🟡 VÁ MỘT PHẦN |  | Khắc phục một phần: chỉ reviewReport (action mới) trả ActionState chuẩn. Các action ghi còn lại (approve/reject/suspend/reinstate trong accounts.ts, grant/revoke trong entitlements.ts) vẫn .parse() và requireRole ném lỗi thô lên error boundary chung — đúng như finding cũ mô tả. |
| API-06 | 🔴 CÒN |  | Chưa khắc phục. Shape phản hồi route handler vẫn không nhất quán (JSON cho health, plain-text cho PDF routes) và lẫn ngôn ngữ Anh/Việt; không có envelope {error,code} hay helper jsonError tách riêng. |
| API-07 | 🔴 CÒN |  | Chưa khắc phục. React Query vẫn được wire toàn cục nhưng không có call site nào dùng; các tương tác client mới (download, review) gọi thẳng server action không có retry/backoff/timeout. Hạ tầng vẫn chết, vẫn nên gỡ hoặc dùng thật. |
| API-08 | 🔴 CÒN |  | Chưa khắc phục. Audit log vẫn giới hạn cứng (giờ là 80), không có cursor theo (createdAt,id), không có bộ lọc action/khoảng thời gian, và UI vẫn hiển thị độ dài trang thay vì tổng số — lịch sử kiểm toán vẫn bị cắt âm thầm. |

</details>

<details><summary><strong>Finding MỚI (4)</strong></summary>

- **API-11 · 🟠 HIGH — 🔧 chỉnh severity** — DOWNLOAD_TOKEN_SECRET fallback 'insecure-dev-download-secret' không kiểm tra ở production
  - 📌 download-token.ts:11-13 `process.env.DOWNLOAD_TOKEN_SECRET ?? "insecure-dev-download-secret"` — không có guard NODE_ENV/throw khi thiếu; secret này ký token tải HS256 ở download/route.ts qua consumeDownloadToken.
  - 💥 Nếu deploy production thiếu biến môi trường, toàn bộ download token bị ký bằng secret công khai trong source → kẻ tấn công tự tạo token hợp lệ, bỏ qua kiểm soát một-lần. Vẫn còn re-check entitlement (download/route.ts:52) giảm nhẹ, nhưng đây là lỗ thủng cơ chế token.
  - 🔧 Khi NODE_ENV==='production' và thiếu DOWNLOAD_TOKEN_SECRET thì throw lúc khởi động; bỏ fallback hardcode hoặc chỉ cho phép ở dev. Cùng pattern cần soát cho mọi secret tương tự. _(effort S)_
  - 🔎 _Kiểm chứng:_ Fallback secret real at download-token.ts lines 11-13 but high severity is wrong because consumeDownloadToken lines 50-54 requires the jti to already exist in the DB created only by mintDownloadToken via requestDownloadUrl after auth so a forged token with a random jti returns count zero and the route returns 403 and the route also rechecks APPROVED status and canViewReport so it is only a config hygiene smell lowered to low</parameter>
<parameter name="adjustedSeverity">low
- **API-09 · 🟡 MEDIUM** — stamp() watermark đồng bộ chặn worker, không cap số trang/kích thước — nhân lên rủi ro thiếu timeout
  - 📌 watermark.ts:48 `for (const page of pdf.getPages())` vẽ text trên MỌI trang không giới hạn; :100 `storage.get(report.fileKey)` đọc toàn bộ PDF vào RAM rồi pdf.save() — đều đồng bộ trong request đầu tiên của mỗi user, không AbortController/maxDuration.
  - 💥 Một PDF nhiều trăm trang (hoặc nhiều user lần đầu cùng lúc) khiến mỗi request stamp đồng bộ chiếm CPU/RAM và giữ kết nối tới khi xong; không có hàng rào timeout nên có thể cạn worker Node. Đây là mặt cụ thể của API-02 nhưng đáng tách vì là điểm CPU-bound rõ rệt.
  - 🔧 Cap số trang (vd >300 từ chối hoặc chỉ stamp footer), giới hạn byte file đầu vào, bọc stamp() trong Promise.race với timeout (~10s) trả 503/Retry-After, cân nhắc hàng đợi sinh watermark thay vì sinh trong request. _(effort M)_
- **API-10 · ⚪ LOW** — getWatermarkedKey có race condition: nhiều request đồng thời của cùng user cùng stamp + put đè lên nhau
  - 📌 watermark.ts:93-107 kiểm tra `storage.stat(key)` (check-then-act) rồi mới stamp + `storage.put(key,...)`; không có lock/đặt chỗ. Hai request view+download đồng thời lần đầu (hoặc reload nhanh) đều thấy cached.exists=false và cùng sinh + ghi đè cùng key.
  - 💥 Lãng phí CPU (stamp 2 lần) và có khả năng ghi tệp dở dang nếu hai writeFile chồng nhau; không sai về bảo mật nhưng tốn tài nguyên — khuếch đại rủi ro lạm dụng do thiếu rate limit (API-01).
  - 🔧 Ghi vào tệp tạm rồi rename atomic, hoặc dùng in-flight promise map theo key để gộp request trùng; tối thiểu writeFile tmp + rename trong filesystemAdapter.put. _(effort M)_
- **API-12 · ⚪ LOW** — Server Actions không phân biệt 401 (chưa đăng nhập) với 403 (thiếu quyền) — thông điệp gộp
  - 📌 rbac.ts:21 requireAuth ném AuthError, :28 requireRole ném ForbiddenError; report-actions.ts:32-35 gộp cả hai thành một catch trả 'Bạn không có quyền duyệt báo cáo.' — mất phân biệt phiên hết hạn vs thiếu quyền.
  - 💥 Người dùng phiên hết hạn nhận thông báo 'không có quyền' gây hiểu nhầm; client không thể quyết định re-login vs ẩn nút. Không nghiêm trọng nhưng làm UX/error semantics kém nhất quán.
  - 🔧 Phân nhánh catch theo instanceof AuthError vs ForbiddenError, trả mã/thông điệp khác nhau (yêu cầu đăng nhập lại vs không đủ quyền). _(effort S)_

</details>

**Điểm mạnh:** canViewReport là điểm kiểm soát entitlement DUY NHẤT và được gọi lại ở mọi route/action nhạy cảm (view/route.ts:42, download/route.ts:52, download-actions.ts:20, reports.ts:27) — defense in depth đúng blueprint §6.1, không tin middleware (CVE-2025-29927) · Download token một-lần tiêu thụ ATOMIC qua updateMany flip consumedAt với điều kiện expiresAt (download-token.ts:50-54, res.count!==1 → null) — chống reuse đúng cách; route còn re-check status APPROVED + entitlement sau khi tiêu thụ token · Range/206 streaming hoàn chỉnh với xử lý 416 Range Not Satisfiable và Content-Range chuẩn (view/route.ts:72-92), phục vụ pdf.js không phơi bày storage key · Cache-Control: private, no-store trên cả hai PDF routes + force-dynamic trên page gated + QueryClient tạo mới mỗi request server tránh rò cache entitlement giữa user (get-query-client.ts) · report-actions.ts mới chuẩn hoá đúng hướng: ReviewResult {ok,error}, safeParse + try/catch quanh requireRole, audit immutable, revalidatePath chính xác — thay thế toast giả trước đó · listVisibleReports dùng keyset (publishedAt,id) với take+1/hasMore đúng kỹ thuật và Prisma `some` (correlated EXISTS) tránh nhân dòng khi user thuộc nhiều group (authz.ts:30-40,66-89)

---

### 8.11 Localization (i18n) — 42 → 66/100 (C+ / D+ → C) 🟢 +24

**Delta:** ĐÃ CẢI THIỆN: pdf-viewer chrome (toolbar, side-panel, dialog, toast, timeline) chuyển hẳn sang useTranslations("Viewer"/"Status") + STATUS dùng key dịch (I18N-01 từ "gần 100% hard-code" → còn lại chỉ thân tài liệu); landing marketing copy tách sang namespace Landing/Marketing (I18N-02 phần lớn); error.tsx + not-found.tsx dùng t() namespace Errors (I18N-05 gần như xong); các trang admin/portal (audit/reports/entitlements/accounts) + nhãn hành động audit map qua key (I18N-06 hết); rememberMe/aria-label signOut/openMenu/closeMenu/placeholder đã t() (I18N-07 phần lớn); formatDate/formatDateTime nhận tham số locale. CÒN LẠI: thân pdf-viewer vẫn hard-code VI hoàn toàn (nội dung "thật" + watermark "BẢO MẬT" + footer); formatVND/formatVNDCompact/formatPercent/formatNumber vẫn vi-VN + "tỷ"/"tr" cứng (I18N-03 chưa xử lý); không có ICU plural (I18N-04 chưa xử lý); metadata layout/login/register/landing vẫn export tĩnh tiếng Việt, chưa generateMetadata (I18N-02 phần metadata + I18N-08 chưa xử lý). PHÁT SINH MỚI: report-actions.ts trả lỗi VI cứng hiển thị qua toast; registerAction/zod messages còn VI cứng (loginAction đã dịch nhưng register thì chưa — không nhất quán); route handler view/download trả "Tài liệu chưa có tệp PDF." cứng; fallback "Người duyệt"/"Nhà đầu tư" cứng.

**Hiện trạng:** i18n đã có bước tiến rõ rệt: toàn bộ chrome ứng dụng (admin, portal, login/register form, app-shell, error/404, toolbar + side-panel của pdf-viewer) đã dùng next-intl với 3 catalog vi/en/zh đồng bộ key gần như tuyệt đối. Locale routing và fallback vững. TUY NHIÊN hai mảng nặng nhất vẫn còn: (1) THÂN tài liệu của crown-jewel pdf-viewer (5 trang nội dung, watermark, footer) vẫn 100% hard-code tiếng Việt; (2) hàm format số/tiền tệ/phần trăm vẫn khoá cứng vi-VN với hậu tố "tỷ"/"tr" nên sai trên en/zh. Pluralization vẫn chưa có (dùng {n, number} + danh từ tĩnh). Metadata trang (root layout, login, register, landing) và một số chuỗi lỗi server vẫn hard-code VI.

<details><summary><strong>Trạng thái finding cũ (8)</strong></summary>

| ID | Trạng thái | Kiểm chứng fix | Ghi chú |
|---|---|---|---|
| I18N-01 | 🟡 VÁ MỘT PHẦN | 🟡 fix chưa trọn (verified) | Surface quan trọng nhất đã dịch phần khung điều khiển (toolbar, side-panel, dialog, toast, timeline) — đây là tiến bộ lớn. Nhưng THÂN tài liệu (5 trang nội dung mô phỏng + watermark + footer) vẫn 100% tiếng Việt cứng. Watermark có thể coi là 'tài liệu in VN' nhưng các nhãn UI/footer như 'Trang n/total' nên dùng Common.page/of; toàn bộ KPI/bảng/đoạn văn vẫn cứng. |
| I18N-02 | 🟡 VÁ MỘT PHẦN | 🟡 fix chưa trọn (verified) | Copy marketing chính đã localize đầy đủ 3 ngôn ngữ. Còn lại: metadata vẫn tĩnh tiếng Việt (chưa generateMetadata async theo locale), và nội dung 'ảnh chụp sản phẩm' (ProductPreview rail + mockup, decision strip trong Workflow) vẫn hard-code VI cho mọi locale. |
| I18N-03 | 🔴 CÒN |  | Chưa khắc phục. formatDate/formatDateTime đã nhận locale nhưng tiền tệ/số/phần trăm vẫn cứng vi-VN; hậu tố compact 'tỷ'/'tr' tiếng Việt hiển thị nguyên trên en/zh (sai). Cần cho nhận locale + map sang Intl locale hoặc dùng notation:'compact'. |
| I18N-04 | 🔴 CÒN |  | Vẫn không có ICU plural ở bất kỳ catalog nào. Dùng {n, number} + danh từ tĩnh hoặc nối chuỗi count. Với vi/zh không có biến cách số ít/nhiều nên không 'lỗi hiển thị', nhưng bản en sẽ sai khi cần số ít (1 document) và cơ chế khuyến nghị (ICU plural) vẫn chưa áp dụng. |
| I18N-05 | ✅ ĐÃ FIX |  | Đã khắc phục đúng khuyến nghị: error.tsx (client) dùng useTranslations, not-found.tsx dùng getTranslations, namespace Errors đầy đủ 3 ngôn ngữ. |
| I18N-06 | ✅ ĐÃ FIX |  | Đã khắc phục toàn diện: mọi trang admin + portal có header bảng, empty state, mô tả, và nhãn hành động/đối tượng audit map qua key dịch theo loại sự kiện đúng như khuyến nghị. |
| I18N-07 | 🟡 VÁ MỘT PHẦN |  | Phần lớn chuỗi UI lẻ + aria-label đã chuyển sang t() (rememberMe, signOut, open/closeMenu, placeholder). Còn sót: thông báo lỗi server (report-actions, route handler PDF) vẫn tiếng Việt cứng và hiển thị thẳng cho người dùng mọi locale. |
| I18N-08 | 🔴 CÒN |  | Chưa khắc phục. Metadata root layout vẫn export tĩnh tiếng Việt cho mọi locale; tương tự login/page.tsx:8-10 'Đăng nhập', register/page.tsx:7-9 'Yêu cầu truy cập', (public)/page.tsx:12-17. Cần generateMetadata async theo locale như khuyến nghị. |

</details>

<details><summary><strong>Finding MỚI (5)</strong></summary>

- **I18N-09 · 🟡 MEDIUM** — report-actions.ts trả thông báo lỗi tiếng Việt cứng, hiển thị thẳng qua Toast cho mọi locale
  - 📌 src/server/report-actions.ts:34 'Bạn không có quyền duyệt báo cáo.', :38 'Yêu cầu không hợp lệ.', :52 'Không tìm thấy báo cáo.' — trả về {ok:false,error}. pdf-viewer.tsx:692/1076 setDownloadErr(res.error) rồi hiển thị Toast message={downloadErr}.
  - 💥 Người dùng en/zh khi duyệt/từ chối báo cáo lỗi sẽ thấy thông báo tiếng Việt. File này MỚI (chưa có ở audit trước) nên là điểm phát sinh.
  - 🔧 Trả mã lỗi ('forbidden'/'invalid'/'notFound') thay vì chuỗi, rồi dịch ở client qua t('Viewer.*'); hoặc dùng getTranslations({locale}) trong action. _(effort M)_
- **I18N-10 · 🟡 MEDIUM** — registerAction & schema zod còn tiếng Việt cứng trong khi loginAction đã được dịch (không nhất quán)
  - 📌 src/server/auth-actions.ts:24-32 zod messages 'Vui lòng nhập họ tên.'/'Email không hợp lệ.'/'Mật khẩu xác nhận không khớp.'; :70 'Email này đã được đăng ký.'; :88 'Yêu cầu của bạn đã được ghi nhận...'. Trong khi :115 loginAction đã getTranslations({locale, namespace:'Auth'}).
  - 💥 register-form hiển thị lỗi/thành công tiếng Việt cho en/zh. Bản thân fix loginAction tạo ra sự không nhất quán: cùng file, một action dịch một action không.
  - 🔧 Cho registerAction nhận locale (hidden field như loginAction) + getTranslations; chuyển message zod sang key dịch (Auth namespace). _(effort M)_
- **I18N-11 · ⚪ LOW** — Route handler PDF trả chuỗi lỗi tiếng Việt cứng
  - 📌 src/app/api/reports/[id]/view/route.ts:51 new Response('Tài liệu chưa có tệp PDF.', {status:404}); src/app/api/reports/[id]/download/route.ts:61 cùng chuỗi.
  - 💥 Khi mở/in/tải file thiếu PDF, người dùng en/zh nhận thông báo tiếng Việt. API không qua next-intl (matcher loại trừ /api) nên cần truyền locale qua query/header để dịch.
  - 🔧 Đọc locale từ referer/query và getTranslations({locale}), hoặc trả mã lỗi để client dịch. _(effort S)_
- **I18N-12 · ⚪ LOW** — Fallback tên người dùng/người duyệt hard-code tiếng Việt
  - 📌 (client)/reports/page.tsx:30 userName = user.name ?? user.email ?? 'Nhà đầu tư'; (client)/reports/[slug]/page.tsx:61 reviewerName={user.name ?? 'Người duyệt'}. (portal/page.tsx:40 đã dùng tRoles('CLIENT') đúng).
  - 💥 Hiển thị nhãn fallback tiếng Việt trên en/zh. Nhỏ vì hiếm khi name lẫn email cùng null.
  - 🔧 Dùng tRoles('CLIENT') / t('Viewer.approver') thay cho chuỗi cứng (đồng bộ với portal/page.tsx). _(effort S)_
- **I18N-13 · ⚪ LOW** — ProductPreview & decision-strip của landing vẫn hard-code tiếng Việt cho mọi locale
  - 📌 (public)/page.tsx:276-279 railItems ['Tổng quan quỹ','Hiệu suất Q3','Phân bổ tài sản','Giao dịch','Ghi chú quản lý']; :325 'Báo cáo Quý III 2026'; :328 'Quỹ Cân Bằng Blackcrest'; :337 'NAV / đơn vị'; :346 'Lợi nhuận YTD'; :471 'Báo cáo Quý III 2026'.
  - 💥 Phần 'ảnh sản phẩm' trên trang chủ hiển thị tiếng Việt khi người dùng chọn en/zh — phá vỡ trải nghiệm đa ngôn ngữ ngay ở landing.
  - 🔧 Đưa các nhãn mock này vào namespace Landing (hoặc Marketing.preview*) và t() theo locale. _(effort S)_

</details>

**Điểm mạnh:** Locale routing + fallback rất chắc: routing.ts (vi default, localePrefix always, cookie 1 năm), middleware createMiddleware(routing), request.ts hasLocale→defaultLocale, layout notFound() cho locale lạ, navigation helpers locale-aware. · Catalog 3 ngôn ngữ vi/en/zh đồng bộ key gần như tuyệt đối (cùng 13 namespace, cùng toàn bộ khóa) — không phát hiện key lệch/thiếu giữa các bản. · Toàn bộ chrome ứng dụng (admin audit/reports/entitlements/accounts, portal, login/register form, app-shell, error.tsx, not-found.tsx, toolbar + side-panel + dialog + toast của pdf-viewer) đã dùng next-intl đúng cách (useTranslations cho client, getTranslations cho RSC). · STATUS giờ dùng key dịch qua REPORT_STATUS/ACCOUNT_STATUS (lib/status.ts) + tStatus(...) thay vì map cứng — single source of truth cho badge tone + key. · Nhãn hành động/đối tượng audit map qua key dịch theo enum (audit/page.tsx actionLabels/targetLabels) — đúng khuyến nghị cũ. · loginAction đã dịch lỗi theo locale qua getTranslations({locale, namespace:'Auth'}); formatDate/formatDateTime đã nhận tham số locale. · aria-label (signOut, open/closeMenu) đã localize giúp screen reader đọc đúng ngôn ngữ.

---

### 8.12 Dependencies — 68 → 66/100 (C) 🔴 -2

**Delta:** CẢI THIỆN: (1) next resolve lên 15.5.19 trong lockfile (trước 15.3.x) — kéo theo @types/node 22.19.21 đúng dòng 22, không nhảy major; (2) lucide-react được gom toàn bộ vào src/components/icon.tsx (81 named import + map 174 entry) thay vì rải rác, dễ kiểm soát hơn về sau. VẪN CÒN: tất cả 6 finding cũ về bản chất chưa được vá — next-auth beta.31 (DEP-01), zustand chết (DEP-02), react-query provider rỗng (DEP-03), postcss XSS moderate (DEP-04, vẫn 1 vuln qua pnpm audit), drift major zod/prisma/jose/next (DEP-05), thiếu optimizePackageImports (DEP-06). package.json không đổi dòng nào (chỉ lockfile re-resolve). Điểm gần như giữ nguyên: 68 -> 66 (hạ nhẹ vì developer tuyên bố "fixed a lot" nhưng tầng deps thực tế gần như không được động tới, và lỗ hổng bảo mật moderate đã biết vẫn để nguyên dù bản vá rất rẻ qua overrides).

**Hiện trạng:** Tầng dependencies về cơ bản KHÔNG thay đổi so với audit trước. package.json vẫn giữ nguyên bộ dependencies cũ (xác nhận qua mtime cũ và nội dung file): next-auth vẫn ghim cứng beta.31, zustand vẫn được khai báo nhưng 0 lần sử dụng, @tanstack/react-query vẫn chỉ mount provider rỗng. Điểm sáng nhỏ duy nhất là lockfile đã resolve next lên 15.5.19 (so với 15.3.x trước đây) — nhưng đây là kết quả tự nhiên của semver range "^15.3.0" qua một lần pnpm install, KHÔNG phải một bản vá chủ động. Lỗ hổng postcss moderate (GHSA-qx2v-qp2m-jg93) VẪN còn: pnpm audit báo 1 moderate, và chính next@15.5.19 vẫn ghim postcss@8.4.31 (<8.5.10) — không có pnpm overrides nào được thêm. optimizePackageImports vẫn vắng mặt trong next.config.ts. Việc gom 81 icon lucide về một file icon.tsx là cải thiện tổ chức code nhưng không thay đổi bundle impact. Dự án vẫn không có git/CI nên không có audit tự động trong pipeline.

<details><summary><strong>Trạng thái finding cũ (6)</strong></summary>

| ID | Trạng thái | Kiểm chứng fix | Ghi chú |
|---|---|---|---|
| DEP-01 | 🔴 CÒN |  | Vẫn ghim cứng bản BETA trên đường xác thực production, không đổi một ký tự. Auth.js v5 vẫn chưa GA nên rủi ro vốn dĩ chưa thể loại bỏ; tuy nhiên orchestrator xác nhận VẪN 0 test tự động (không *.test/*.spec, không vitest/jest/playwright) -> chưa có regression test nào cho login/middleware/RBAC như khuyến nghị, cũng không thấy tài liệu chấp nhận rủi ro. Giữ nguyên mức high. |
| DEP-02 | 🔴 CÒN |  | zustand vẫn được khai báo và vẫn nằm trong lockfile (resolve 5.0.14) nhưng tuyệt đối không có import nào trong toàn bộ src/. Dead dependency chưa được gỡ. |
| DEP-03 | 🔴 CÒN |  | @tanstack/react-query vẫn chỉ có provider (providers.tsx) + factory (lib/get-query-client.ts), không một consumer nào gọi useQuery/useMutation. Provider được mount ở src/app/[locale]/layout.tsx:42 nhưng rỗng nghĩa. Comment trong providers.tsx hứa 'dùng cho client islands' nhưng chưa có island nào dùng. Lifecycle approve/reject vẫn không qua react-query. |
| DEP-04 | 🔴 CÒN |  | Lỗ hổng moderate postcss XSS VẪN còn nguyên. Đáng chú ý: dù next đã lên 15.5.19, chính next vẫn ghim transitive postcss@8.4.31 (<8.5.10). Trong tree còn postcss@8.5.15 (đã vá, do @tailwindcss/postcss kéo) nhưng đường next/next-auth/next-intl vẫn dính 8.4.31. Không có pnpm overrides nào trong package.json để ép postcss>=8.5.10 -> bản vá rẻ (chỉ vài dòng overrides) vẫn bị bỏ qua. |
| DEP-05 | 🟡 VÁ MỘT PHẦN |  | Có nhích nhẹ: next từ 15.3.x lên 15.5.19 trong cùng dải minor, và @types/node giữ đúng dòng 22 (không nhảy 25) theo đúng khuyến nghị cũ -> tốt. Nhưng tất cả các bước nhảy MAJOR vẫn còn nguyên: zod 3->4, prisma 6->7, jose 5->6, next 15->16. Không có Renovate/Dependabot (dự án còn chưa vào git). Xếp partially_fixed vì có giữ đúng pin @types/node và có cập nhật minor next, nhưng phần lớn drift vẫn tồn tại. |
| DEP-06 | 🟡 VÁ MỘT PHẦN |  | Đã gom toàn bộ icon lucide về một file duy nhất src/components/icon.tsx (81 named import tĩnh) thay vì rải khắp nơi — cải thiện tổ chức và giúp tree-shaking dễ hơn ở một điểm. NHƯNG experimental.optimizePackageImports: ['lucide-react'] VẪN chưa được thêm vào next.config.ts như khuyến nghị, nên Next chưa tự barrel-optimize. Bundle impact về cơ bản chưa được chứng minh là giảm; chưa có bundle analyzer trước/sau. |

</details>

<details><summary><strong>Finding MỚI (2)</strong></summary>

- **DEP-08 · 🟡 MEDIUM** — Lỗ hổng postcss có thể vá rẻ bằng pnpm overrides nhưng không có overrides nào được khai báo
  - 📌 package.json:1-50 không có khối 'pnpm.overrides' hay 'overrides'; grep 'overrides' trong package.json + pnpm-lock.yaml = rỗng; trong khi tree đã có sẵn postcss@8.5.15 (đã vá) tại pnpm-lock.yaml:1256
  - 💥 Lỗ hổng moderate (DEP-04) hoàn toàn có thể đóng ngay bằng vài dòng overrides ép postcss>=8.5.10, đặc biệt khi bản vá 8.5.15 đã có sẵn trong tree. Việc không làm cho thấy chưa có quy trình xử lý audit -> rủi ro tồn đọng các CVE moderate khác về sau.
  - 🔧 Thêm vào package.json: "pnpm": { "overrides": { "postcss@<8.5.10": ">=8.5.10" } } rồi pnpm install và xác nhận lại bằng pnpm audit --prod. Khi dự án vào git, gắn pnpm audit vào CI. _(effort S)_
- **DEP-07 · ⚪ LOW** — Hai phiên bản MAJOR của jose cùng tồn tại trong dependency tree (5.10.0 và 6.2.3)
  - 📌 pnpm-lock.yaml:1063 jose@5.10.0 (app dùng tại src/lib/download-token.ts:3 SignJWT/jwtVerify) đồng thời pnpm-lock.yaml:1066 jose@6.2.3 do @auth/core@0.41.2 kéo (pnpm-lock.yaml:1392 'jose: 6.2.3')
  - 💥 Hai bản jose major khác nhau bị đóng gói song song -> tăng dung lượng, và tạo nguy cơ nhầm lẫn nếu sau này nâng app lên jose 6 mà API đổi. Code app (download-token.ts) chạy jose 5 trong khi lớp auth chạy jose 6 -> bề mặt crypto không thống nhất.
  - 🔧 Cân nhắc nâng dependency jose của app từ ^5.9.6 lên ^6 để hợp nhất một major duy nhất (kiểm tra breaking change của jose 6 với SignJWT/jwtVerify trong download-token.ts), hoặc chấp nhận và tài liệu hóa lý do giữ jose 5. Kiểm chứng bằng pnpm why jose sau khi đổi. _(effort M)_

</details>

**Điểm mạnh:** @types/node giữ đúng dòng 22.x (22.19.21) khớp Node 22 runtime — đúng khuyến nghị, không nhảy bừa lên major mới hơn · pnpm được ghim qua trường packageManager với hash SHA-512 (pnpm@11.7.0+sha512...) đảm bảo reproducibility của toolchain · next-auth được pin tuyệt đối (5.0.0-beta.31) thay vì caret range — đúng nguyên tắc cho một dependency bản beta dễ vỡ · lucide-react đã được gom toàn bộ về một file src/components/icon.tsx (81 named import + map) thay vì rải rác — dễ kiểm soát và tree-shake tại một điểm · Toàn bộ là package chính thống, đang bảo trì tích cực; không có dep abandoned/lạ trong tree · next được re-resolve lên 15.5.19 trong lockfile, kéo theo các bản vá minor của hệ sinh thái Next

---

### 8.13 Code Quality — 72 → 70/100 (C+) 🔴 -2

**Delta:** CẢI THIỆN: (1) CQ-01 — vòng đời báo cáo nay persist thật qua reviewReport() có requireRole+logAudit, ghi note vào metadata, thay toast giả; (2) CQ-05 một phần — lib/status.ts đã ra đời và được admin/accounts, admin/reports, portal, reports dùng chung. CHƯA GIẢI QUYẾT: ESLint/Prettier vẫn vắng bóng hoàn toàn (CQ-03), react-query/zustand vẫn chết & src/stores rỗng (CQ-02), session! vẫn ở cả 6 page vì không ai dùng requireAuth() đã có sẵn (CQ-06), watermark cache vẫn không gắn fileHash (CQ-08), Switch/Tag vẫn không có JSX dùng (CQ-09), số liệu demo + total=5 vẫn hardcode trong pdf-viewer (CQ-10). THỤT LÙI: pdf-viewer.tsx tăng 1243→1294 dòng (CQ-04 nặng hơn); xử lý lỗi Server Action nay có 4 quy ước thay vì 3 (CQ-07 tệ hơn), và file mới stat-card.tsx nhân bản nguyên map DOT_TONES của badge.tsx thành DOT_BG.

**Hiện trạng:** Chất lượng code hiện tại ở mức khá nhưng KHÔNG cải thiện rõ rệt so với lần trước, thậm chí có điểm thụt lùi. Điểm sáng thực sự: vòng đời duyệt/từ chối báo cáo nay là Server Action thật (src/server/report-actions.ts) có persist + logAudit (CQ-01 đã sửa), và đã tạo lib/status.ts làm nguồn trạng thái dùng chung được nhiều trang admin/client áp dụng (CQ-05 sửa một phần). Các UI primitive mới (data-table.tsx, stat-card.tsx, empty-state.tsx) viết sạch, có JSDoc, type chặt; toàn repo KHÔNG có any/@ts-ignore/eslint-disable và pnpm typecheck pass sạch. NHƯNG phần lớn nợ kỹ thuật then chốt vẫn nguyên: vẫn KHÔNG có ESLint/Prettier (không cả binary lẫn config), react-query và zustand vẫn là dependency chết, session! vẫn rải khắp 6 page, watermark cache vẫn thiếu fileHash, Switch/Tag vẫn không dùng, số liệu demo vẫn hardcode. Đáng lo nhất là pdf-viewer.tsx PHÌNH từ 1243 lên 1294 dòng (regression độ phức tạp) và số kiểu xử lý lỗi trong Server Action tăng từ 3 lên 4 mẫu khác nhau.

<details><summary><strong>Trạng thái finding cũ (10)</strong></summary>

| ID | Trạng thái | Kiểm chứng fix | Ghi chú |
|---|---|---|---|
| CQ-01 | ✅ ĐÃ FIX |  | Đã sửa thực chất: toast giả được thay bằng Server Action persist trạng thái + ghi audit immutable + lưu note. Lưu ý nhỏ: không dùng useActionState như khuyến nghị mà dùng local state (setReviewing/setToast/setDownloadErr) — vẫn chấp nhận được nhưng dùng lại setDownloadErr để hiện lỗi duyệt là hơi gượng. |
| CQ-02 | 🔴 CÒN |  | Vẫn là hạ tầng chết nguyên trạng. react-query chỉ được mount provider mà không có truy vấn nào; zustand không có store nào; thư mục src/stores vẫn rỗng. Không gỡ cũng không dùng — đúng như khuyến nghị cũ chưa được xử lý. |
| CQ-03 | 🔴 CÒN |  | Chưa thêm bất kỳ hàng rào tự động nào. Script lint trỏ next lint nhưng thiếu cả eslint-config-next lẫn config flat; không có format/format:check. Không có CI nên không có chốt chặn nào chạy. |
| CQ-04 | ⛔ HỒI QUY |  | Thụt lùi: file phình thêm ~51 dòng, vẫn là điểm nóng độ phức tạp duy nhất. Chưa tách report-pages.tsx hay SidePanel ra module riêng; logic duyệt + tải + IntersectionObserver + zoom vẫn nằm chung. |
| CQ-05 | 🟡 VÁ MỘT PHẦN |  | Sửa một phần: bản đồ STATUS đã có nguồn dùng chung và được nhiều màn dùng. Nhưng pdf-viewer vẫn giữ STATUS_LABEL trùng key với REPORT_STATUS và thêm DOC_STATUS_LABEL_VI; prelude RSC (setRequestLocale+auth) chưa được gói thành helper, vẫn nhân bản khắp nơi. |
| CQ-06 | 🔴 CÒN |  | Hoàn toàn chưa đụng tới: cả 6 page vẫn dùng non-null assertion session!.user trong khi helper requireAuth() (an toàn, đã có sẵn) bị bỏ không. Mẫu của page lệch với mẫu của lib. |
| CQ-07 | 🔴 CÒN |  | Không thống nhất, thậm chí tệ hơn: nay có 4 quy ước trả lỗi thay vì 3. entitlements/accounts vẫn dùng .parse() (ném khi input sai) và không map ForbiddenError thành phản hồi rõ ràng — đúng điểm khuyến nghị cũ chỉ ra mà chưa sửa. |
| CQ-08 | 🔴 CÒN |  | Chưa sửa: khoá cache vẫn chỉ gồm reportId + hash(userId), không có version/contentHash của tệp gốc. Đổi fileKey sẽ tiếp tục phục vụ bản watermark cũ. createHash chỉ dùng để băm userId, không băm nội dung tệp. |
| CQ-09 | 🔴 CÒN |  | Vẫn là primitive chết: không có JSX nào render Switch hay Tag, nhưng cả hai vẫn xuất qua barrel mà không có ghi chú 'dự phòng DS'. Chưa dùng cũng chưa đánh dấu lý do giữ lại. |
| CQ-10 | 🔴 CÒN |  | Chưa tập trung hoá: số liệu minh hoạ vẫn rải rác inline trong nhiều component, không có /lib/demo-data và cờ bật/tắt. total={5} vẫn truyền cứng cho từng page dù pages.length đã sẵn — chỉ dùng total=pages.length cho UI nav, không cho nội dung trang. |

</details>

<details><summary><strong>Finding MỚI (5)</strong></summary>

- **CQ-11 · ⚪ LOW** — stat-card.tsx nhân bản nguyên map tone→bg-class (DOT_BG) đã có trong badge.tsx (DOT_TONES)
  - 📌 src/components/ui/stat-card.tsx:21-33 const DOT_BG: Record<BadgeTone,string> giống hệt src/components/ui/badge.tsx:54-65 DOT_TONES (neutral:'bg-ink-3'…rejected:'bg-status-rejected')
  - 💥 Trùng lặp mới phát sinh trong file vừa thêm; sửa palette dot phải nhớ đồng bộ 2 nơi, dễ lệch.
  - 🔧 Export DOT_TONES từ badge.tsx (hoặc tách ra một map dùng chung trong lib) và để stat-card import lại, hoặc render <Badge dot> thay vì tự vẽ span dot. _(effort S)_
- **CQ-12 · ⚪ LOW** — reviewReport không revalidate đúng path động + chỉ dùng được từ pdf-viewer, không có ở admin/reports
  - 📌 src/server/report-actions.ts:72-73 revalidatePath('/[locale]/reports/[slug]','page') dùng template literal chứ không phải path cụ thể; admin/reports/page.tsx không import/gọi reviewReport (grep chỉ thấy nhãn status, không có nút duyệt)
  - 💥 Approver chỉ duyệt được khi mở viewer từng báo cáo; danh sách admin/reports không có hành động lifecycle. revalidatePath với pattern '[locale]' có thể không khớp như mong đợi nên UI khác có thể vẫn cũ tới khi refresh.
  - 🔧 Thêm nút duyệt/từ chối ngay ở admin/reports (form gọi reviewReport), và xác nhận chữ ký revalidatePath cho route nhóm (locale) là đúng, hoặc revalidate theo tag. _(effort M)_
- **CQ-14 · ⚪ LOW** — STATUS_LABEL trong pdf-viewer trùng key với REPORT_STATUS — chỉ thiếu tone
  - 📌 src/app/[locale]/(client)/reports/[slug]/pdf-viewer.tsx:62-69 STATUS_LABEL map ReportStatus→ chính các key ('draft','review'…) mà lib/status.ts:9-16 REPORT_STATUS đã chứa (field key)
  - 💥 Hai bảng tra cùng dữ liệu key; tone lấy từ REPORT_STATUS nhưng label lại tự map — dễ lệch khi thêm status mới.
  - 🔧 Dùng REPORT_STATUS[report.status].key thay cho STATUS_LABEL[report.status] và xoá STATUS_LABEL; giữ DOC_STATUS_LABEL_VI riêng vì nó là nhãn in tài liệu cố định tiếng Việt. _(effort S)_
- **CQ-13 · 🔵 INFO** — handleReview tái dùng setDownloadErr để hiển thị lỗi DUYỆT — đặt tên sai ngữ cảnh
  - 📌 src/app/[locale]/(client)/reports/[slug]/pdf-viewer.tsx:692 else setDownloadErr(res.error); :695 setDownloadErr(t('reviewError')) — biến tên 'download' nhưng dùng cho lỗi review
  - 💥 Lỗi duyệt hiển thị qua state mang tên download gây nhầm lẫn khi đọc/sửa; hai luồng (tải/duyệt) chia chung một ô lỗi.
  - 🔧 Tách state riêng reviewErr, hoặc đổi tên thành một actionError dùng chung có chủ đích và đặt tên trung tính. _(effort S)_
- **CQ-15 · 🔵 INFO** — Type ReportStatus/AccessLevel khai báo thủ công lại trong pdf-viewer thay vì import từ @prisma/client
  - 📌 src/app/[locale]/(client)/reports/[slug]/pdf-viewer.tsx:27-35 tự định nghĩa union 'DRAFT'|'REVIEW'|… và 'PUBLIC'|'RESTRICTED' trong khi lib/status.ts:1 import từ @prisma/client
  - 💥 Union tay phải đồng bộ thủ công với enum Prisma; thêm status trong schema sẽ không tự lan tới component này, dễ sót.
  - 🔧 Import type ReportStatus/AccessLevel từ @prisma/client (client component vẫn dùng được type-only import), hoặc derive từ keyof typeof REPORT_STATUS. _(effort S)_

</details>

**Điểm mạnh:** Các UI primitive mới (data-table.tsx, stat-card.tsx, empty-state.tsx) chất lượng tốt: JSDoc rõ, type generic chặt (DataTable<T> với Column<T>), a11y (scope='col', caption sr-only, overflow scroll) · CQ-01 được sửa đúng bản chất: report-actions.ts là Server Action thật với requireRole + transaction update + logAudit immutable + lưu note, thay hẳn toast giả · TypeScript sạch toàn repo: 0 any, 0 @ts-ignore/@ts-nocheck/eslint-disable, pnpm typecheck pass; các as-cast còn lại đều chính đáng (DOM/stream interop) · lib/status.ts gom được nguồn trạng thái dùng chung và đã được nhiều màn admin/client áp dụng, giảm bớt một phần trùng lặp STATUS · Đặt tên domain rõ ràng và lib hạ tầng (rbac.ts requireAuth/requireRole/requireFreshUser, watermark.ts, download-token.ts) tổ chức mạch lạc, có comment trích blueprint giải thích quyết định

---

### 8.14 State Management — 68 → 72/100 (C+) 🟢 +4

**Delta:** CẢI THIỆN: STATE-01 (approval toast-only) đã fix thật — reviewReport persist DB + audit + revalidate, viewer chỉ toast khi res.ok rồi router.refresh; STATE-05 (revalidation) đã fix — revalidatePath cho viewer slug + admin reports nằm ngay trong action; thêm src/lib/status.ts làm single source cho derived state trạng thái (giảm duplication). CÒN LẠI: STATE-02 (zustand) vẫn dead — còn trong package.json:38, zero import/create() store; STATE-03 (React Query) vẫn treo — QueryClientProvider còn ở providers.tsx + get-query-client.ts + dep:26 nhưng zero useQuery/useMutation, comment mới "dùng cho admin tables/polling" là sai thực tế; STATE-04 (fake timeline) vẫn open và còn lệch logic — timeline hardcode tone "approved"/"published", dùng chung publishedAt cho cả mốc Duyệt lẫn Phát hành, không đọc report.status. PHÁT SINH MỚI: nhánh "publish" của reviewReport không có UI gọi tới; nút Upload ở admin/reports là nút chết; reuse downloadErr cho lỗi review; không guard trạng thái khi duyệt.

**Hiện trạng:** Vòng fix này có một bước tiến thật sự quan trọng về State ownership: phê duyệt/từ chối báo cáo giờ persist qua Server Action `reviewReport` (ghi DB + audit log + revalidatePath), thay cho toast-only trước đây — đây là sửa chữa đúng bản chất, không phải vá bề mặt. Kèm theo đó là việc gom derived state về trạng thái vào một nguồn duy nhất `src/lib/status.ts` (REPORT_STATUS/ACCOUNT_STATUS/ACCESS_LEVEL_KEY), giảm trùng lặp map tone/key rải rác. Tuy nhiên các khoản nợ kỹ thuật về store vẫn còn nguyên: zustand và React Query vẫn là dependency chết (không có store, không có một useQuery/useMutation nào trong toàn bộ src), và timeline phê duyệt trong SidePanel vẫn hardcode hoàn toàn, không phản ánh report.status thật. Server-first ownership tổng thể tốt; phần client state cục bộ trong pdf-viewer hợp lý nhưng còn vài chỗ duplication/thiếu guard.

<details><summary><strong>Trạng thái finding cũ (5)</strong></summary>

| ID | Trạng thái | Kiểm chứng fix | Ghi chú |
|---|---|---|---|
| STATE-01 | ✅ ĐÃ FIX | ✅ fix thật (verified) | Đã fix đúng bản chất. Phê duyệt/từ chối không còn là toast-only: Server Action ghi report.status xuống DB, viết audit row (REPORT_APPROVE/REPORT_REJECT), revalidatePath cho viewer + admin, và chỉ hiện toast sau khi res.ok rồi router.refresh() để RSC render lại badge trạng thái. State ownership chuyển về server đúng như khuyến nghị. |
| STATE-02 | 🔴 CÒN |  | Chưa xử lý. zustand vẫn nằm trong dependencies nhưng không có bất kỳ store hay import nào trong src. App vẫn server-first, không phát sinh nhu cầu global client store nào ở UI lifecycle mới (state phê duyệt nằm ở server). Vẫn là dead dependency cần gỡ. |
| STATE-03 | 🔴 CÒN |  | Vẫn treo. Hạ tầng React Query còn nguyên (Providers bọc ở layout.tsx:42) nhưng tuyệt đối không có query/mutation nào. Comment mới trong providers.tsx nói 'dùng cho interactive admin tables, polling' là không đúng thực tế — admin/reports & admin/audit đều là RSC thuần, DataTable là component không hook (server-renderable). Hoặc gỡ, hoặc thêm island thật sự dùng nó. |
| STATE-04 | 🔴 CÒN |  | Vẫn dữ liệu giả, thậm chí còn sai logic. Timeline luôn hiển thị đủ 4 mốc màu xanh 'đã duyệt/đã phát hành' bất kể report đang DRAFT/REVIEW/REJECTED, và dùng chung publishedAt cho cả mốc Duyệt và Phát hành nên không phân biệt được hai timestamp. Audit log đã có action REPORT_APPROVE/REPORT_PUBLISH nhưng SidePanel không query để dựng timeline thật. Chưa làm theo khuyến nghị (lấy mốc thật từ DB/audit qua RSC, suy tone từ trạng thái thực). |
| STATE-05 | ✅ ĐÃ FIX |  | Đã fix. Mutation lifecycle báo cáo nay có revalidation đúng khuôn mẫu accounts/entitlements: revalidate cả trang viewer theo slug lẫn danh sách admin reports. Lưu ý nhỏ: chưa revalidate '/[locale]/reports' (danh sách client) nhưng phạm vi STATE-05 (admin + viewer) coi như đã được giải quyết. |

</details>

<details><summary><strong>Finding MỚI (5)</strong></summary>

- **STATE-N1 · 🟡 MEDIUM** — Nhánh 'publish' của reviewReport không có UI nào gọi tới
  - 📌 src/server/report-actions.ts:10-12 schema cho phép decision 'approve'|'reject'|'publish' và xử lý publishedAt; nhưng pdf-viewer.tsx chỉ có dialog 'approve'|'reject' (state setDialog: 'approve'|'reject'|null, line 665) và handleReview chỉ nhận 'approve'|'reject' (line 677). Grep reviewReport: chỉ 1 callsite, không truyền 'publish'.
  - 💥 Lifecycle draft→duyệt→phát hành chưa khép kín ở UI: không có cách nào để chuyển báo cáo sang PUBLISHED/đặt publishedAt từ giao diện. publishedAt (dùng cho cả timeline lẫn cột ngày) sẽ không bao giờ được set qua luồng này, khiến trạng thái hiển thị lệch thực tế.
  - 🔧 Thêm bước/nút 'Phát hành' trong SidePanel (chỉ bật khi status === 'APPROVED') gọi handleReview('publish'), hoặc tách action publishReport riêng. Đảm bảo mọi nhánh của Server Action đều có entry point UI tương ứng. _(effort M)_
- **STATE-N4 · 🟡 MEDIUM** — Hành động duyệt/từ chối không guard theo trạng thái hiện tại của báo cáo
  - 📌 src/server/report-actions.ts:48-57 chỉ kiểm tra report tồn tại rồi update status thẳng, không kiểm tra transition hợp lệ (vd chỉ cho approve khi đang REVIEW); SidePanel render nút Duyệt/Từ chối bất kể report.status (pdf-viewer.tsx:1268-1291, không có điều kiện theo status).
  - 💥 Có thể 'duyệt' một báo cáo đang DRAFT/REJECTED/đã PUBLISHED, hoặc approve lại nhiều lần — state lifecycle không có ràng buộc chuyển trạng thái. Kết hợp với timeline hardcode, UI và state thực dễ phân kỳ.
  - 🔧 Thêm guard transition trong reviewReport (vd chỉ APPROVED/REJECTED từ REVIEW; PUBLISHED từ APPROVED) trả lỗi nếu không hợp lệ; ở UI ẩn/disable nút theo report.status (derive từ trạng thái thật). _(effort M)_
- **STATE-N2 · ⚪ LOW** — Nút 'Tải lên' (upload) ở admin/reports là nút chết, không gắn state/handler
  - 📌 src/app/[locale]/(admin)/admin/reports/page.tsx:67-69 <Button variant="primary" leadingIcon={upload}>{tActions('upload')}</Button> — không onClick, không Link, không form action; đây là RSC nên không thể có handler client.
  - 💥 Cửa ngõ đưa báo cáo vào lifecycle (upload→DRAFT) không tồn tại; người dùng bấm không có gì xảy ra. Phần đầu của vòng đời state báo cáo bị thiếu hoàn toàn ở UI.
  - 🔧 Bọc nút trong một client island mở dialog upload gọi Server Action tạo Report (status DRAFT) + audit REPORT_UPLOAD + revalidatePath, hoặc trỏ Link tới trang upload. Tối thiểu nên disable/ẩn nếu chưa triển khai để không lừa người dùng. _(effort L)_
- **STATE-N3 · ⚪ LOW** — downloadErr bị dùng chung cho cả lỗi tải xuống lẫn lỗi phê duyệt
  - 📌 src/app/[locale]/(client)/reports/[slug]/pdf-viewer.tsx:692 'setDownloadErr(res.error)' trong handleReview (lỗi review) tái dùng đúng state đặt cho luồng download tại line 710 'setDownloadErr(res.error)'.
  - 💥 Hai luồng nghiệp vụ khác nhau (download token vs review) chia sẻ một ô lỗi; thông báo lỗi review hiển thị ở vị trí/ngữ cảnh của lỗi download (line 1069), dễ gây hiểu nhầm và khó dọn state. Ví dụ lỗi 'không có quyền duyệt' lại hiện như lỗi tải tài liệu.
  - 🔧 Tách reviewErr riêng khỏi downloadErr; render thông báo review gần khu vực dialog/nút duyệt. Reset đúng state khi đóng dialog. _(effort S)_
- **STATE-N5 · ⚪ LOW** — Comment trong providers.tsx khẳng định React Query 'được dùng cho admin tables/polling' nhưng không đúng thực tế
  - 📌 src/app/providers.tsx:6-9 comment 'React Query is used ONLY for genuine client islands (interactive admin tables, polling)'; nhưng admin/reports & admin/audit đều RSC, DataTable không dùng hook, grep useQuery/useMutation = 0.
  - 💥 Comment sai dẫn dắt người đọc tin hạ tầng đang được dùng, che giấu nợ kỹ thuật STATE-03 và làm khó quyết định gỡ. Tài liệu hóa sai còn nguy hiểm hơn không có.
  - 🔧 Hoặc thực sự thêm một island dùng React Query (vd polling audit log) đúng như comment, hoặc gỡ provider + dependency và xóa comment. Không để comment mô tả thứ chưa tồn tại. _(effort S)_

</details>

**Điểm mạnh:** Server Action reviewReport (report-actions.ts) là một fix đúng bản chất cho STATE-01: validate bằng zod, requireRole, update DB, logAudit, revalidatePath — đưa ownership trạng thái phê duyệt về server thay vì toast giả. · src/lib/status.ts trở thành single source of truth cho derived state trạng thái (tone + i18n key), loại bỏ các map STATUS_TONE/STATUS_KEY trùng lặp rải rác trên nhiều màn hình. · get-query-client.ts xử lý đúng rủi ro bảo mật: tạo QueryClient mới mỗi request trên server (tránh leak dữ liệu gated giữa các user), chỉ singleton trên browser. · Kiến trúc server-first nhất quán: trang gated đặt force-dynamic, RSC truyền props serializable xuống island, luồng dữ liệu một chiều rõ ràng (RSC → island → action → revalidate/refresh). · Local state trong pdf-viewer được tổ chức gọn với guard chống double-submit (reviewing) và reset reviewNote sau khi gửi.

---

### 8.15 UX/UI & Design System — 68 → 74/100 (C) 🟢 +6

**Delta:** CẢI THIỆN: AppShell responsive hoàn chỉnh (app-shell.tsx:104,116-120,191-198 — md:grid + off-canvas drawer + hamburger + scrim + Escape); DataTable bọc overflow-x-auto + minWidth nên bảng cuộn ngang thay vì vỡ trên mobile (data-table.tsx:49-53); EmptyState/StatCard chuẩn hoá toàn bộ trang admin+portal; src/lib/status.ts gom REPORT_STATUS/ACCOUNT_STATUS/ACCESS_LEVEL về một nguồn; hardcode VN ở UI cấu trúc đã hết (grep diacritics trong JSX admin/client = rỗng); luồng duyệt đã thật (report-actions.ts:25-75 + pdf-viewer.tsx:677-699). VẪN CÒN: dark mode vẫn chết (không có data-theme writer trong toàn repo — globals.css:18, colors.css:88 chỉ định nghĩa scope nhưng không ai kích hoạt; layout.tsx:39 có suppressHydrationWarning nhưng KHÔNG có theme script); PDF viewer desktop-only tuyệt đối (pdf-viewer.tsx:845,1143,119 — không class md:/hidden nào); Dialog thiếu a11y focus-trap/aria-labelledby (dialog.tsx:60-84); không có reports/[slug]/loading.tsx mô phỏng viewer (UX-08); not-found.tsx:25 vẫn <a href="/">; greeting vẫn cố định "Chào buổi sáng" (vi.json:149) tuy đã i18n. PHÁT SINH MỚI: AppShellSkeleton vẫn grid cứng 240px (skeleton.tsx:20) — lệch với AppShell đã responsive, và bị dùng làm loading cho cả route viewer gây nháy layout sai; bảng "Tài liệu gần đây" ở portal vẫn grid-cols cố định không responsive (portal/page.tsx:146,164).

**Hiện trạng:** Vòng sửa này nâng đáng kể chất lượng hệ thống thiết kế ở khu vực admin/portal: AppShell nay đã responsive thật sự (drawer off-canvas + hamburger dưới md), ba component mới (DataTable / EmptyState / StatCard) cùng src/lib/status.ts đã loại bỏ phần lớn trùng lặp và chuẩn hoá empty/table/stat trên toàn bộ các trang danh sách. Hardcode tiếng Việt ở UI cấu trúc gần như được dọn sạch (mọi trang admin/client/portal/auth đi qua next-intl), và luồng duyệt/từ chối trong viewer đã được nối với Server Action thật (reviewReport: cập nhật ReportStatus + ghi audit + revalidate), không còn toast giả. Tuy nhiên ba điểm trọng yếu vẫn còn nguyên: (1) Dark mode vẫn là code chết — không có bất kỳ nơi nào ghi data-theme lên <html>, không toggle, không script chống FOUC, chỉ thêm comment; (2) PDF viewer — crown jewel — vẫn hoàn toàn desktop-only (rail 168px + panel 320px + trang cố định 794px, không một class responsive nào); (3) Dialog vẫn thiếu focus-trap/initial-focus/aria-labelledby và viewer vẫn không có loading.tsx riêng. not-found.tsx vẫn dùng <a> thuần. Tổng thể đã từ "C lệch" tiến tới "C vững", nhưng chưa đạt mức polished mà quality bar yêu cầu vì viewer và dark mode vẫn dở dang.

<details><summary><strong>Trạng thái finding cũ (8)</strong></summary>

| ID | Trạng thái | Kiểm chứng fix | Ghi chú |
|---|---|---|---|
| UX-01 | 🔴 CÒN |  | Vẫn là code chết. Developer chỉ thêm comment làm rõ ('Dark scope is driven by [data-theme="dark"]') chứ không thực thi khuyến nghị (a) thêm toggle + ghi data-theme + script chống FOUC, cũng không (b) xoá scope dark. suppressHydrationWarning trên <html> gợi ý đã có ý định nhưng chưa có script nào set theme → dark mode hoàn toàn không thể kích hoạt. Quyết định vẫn lửng lơ. |
| UX-02 | 🟡 VÁ MỘT PHẦN | 🟡 fix chưa trọn (verified) | Tiến bộ lớn ở khu vực admin/portal: sidebar off-canvas, bảng cuộn ngang, lưới card co giãn. NHƯNG crown-jewel PDF viewer vẫn 100% desktop-only — rail/panel/trang đều kích thước cứng, không ẩn/toggle dưới breakpoint nào (khuyến nghị cũ về viewer chưa thực hiện). Bảng 'Tài liệu gần đây' ở portal cũng vẫn dùng grid-cols cứng. Vì vậy chỉ partially_fixed. |
| UX-03 | ✅ ĐÃ FIX | 🟡 fix chưa trọn (verified) | Đã xử lý triệt để ở UI cấu trúc: toàn bộ nav/label/empty/stat/status đi qua next-intl với 3 catalog. Phần VN còn lại chỉ là nội dung thân tài liệu PDF giả lập (cố ý giữ VN). Coi như fixed. |
| UX-04 | ⚫ (đã bác bỏ trước) |  | Theo quy tắc: finding này đã bị refuted ở vòng trước nên đánh was_refuted_ignore. Đồng thời ghi nhận hiện đã được nối Server Action thật (cập nhật status + audit + revalidate), khớp đúng khuyến nghị — không còn là vấn đề. |
| UX-05 | 🔴 CÒN |  | Chưa sửa. error.tsx đã ổn (dùng reset() không có anchor), nhưng not-found.tsx vẫn <a href="/"> làm rớt locale + reload toàn trang. Khuyến nghị dùng Link/@i18n hoặc trỏ routing.defaultLocale có chủ đích vẫn chưa thực hiện. |
| UX-06 | 🟡 VÁ MỘT PHẦN |  | Đã i18n hoá (3 bản dịch) — tốt hơn trước. Nhưng vẫn luôn là 'Chào buổi sáng' bất kể thời điểm; khuyến nghị tính lời chào theo giờ HOẶC dùng lời chào trung tính ('Xin chào') chưa thực hiện. Nửa vời. |
| UX-07 | 🔴 CÒN |  | Hoàn toàn chưa sửa. Dialog vẫn thiếu focus-trap, initial focus, aria-labelledby/aria-describedby và return-focus. Vì dialog này là nơi APPROVER duyệt/từ chối (luồng nghiệp vụ chính) nên thiếu sót a11y ở đây đáng lưu ý. |
| UX-08 | 🔴 CÒN |  | Chưa thêm loading riêng cho viewer. Tệ hơn: skeleton dùng chung là AppShellSkeleton (layout app-shell), trong khi viewer là layout toàn màn hình khác hẳn → khi điều hướng vào viewer sẽ nháy sai khung. Khuyến nghị thêm reports/[slug]/loading.tsx mô phỏng toolbar+rail+vùng trang vẫn chưa làm. |

</details>

<details><summary><strong>Finding MỚI (5)</strong></summary>

- **UX-13 · 🟠 HIGH — ✅ xác nhận** — PDF viewer không có lối thoát/điều hướng trên mobile — rail & panel chiếm chỗ nhưng không thể thu gọn
  - 📌 pdf-viewer.tsx:843 body 'flex flex-1' đặt rail (:845 w-[168px]) + canvas + panel (:1143 w-[320px]) cạnh nhau cố định; chỉ có toggle panelOpen cho panel phải, KHÔNG có cơ chế ẩn rail hay xử lý khi viewport hẹp; trang cứng width:794 (:119) tràn ngang. Không một class md:/hidden nào trong toàn file.
  - 💥 Trên điện thoại/máy tính bảng dọc, rail 168px + panel 320px + trang 794px khiến nội dung tài liệu (mục đích chính) bị đẩy ra ngoài màn hình, người dùng phải cuộn ngang nhiều lần và gần như không đọc được báo cáo — hỏng đúng tính năng cốt lõi của sản phẩm.
  - 🔧 Dưới breakpoint (lg): ẩn rail thumbnail mặc định (toggle bằng nút), biến panel phải thành drawer/overlay thay vì chiếm cột, và cho trang co theo bề rộng (max-width/scale theo container thay vì width:794 cứng). Điều hướng trang dạng nổi đã có sẵn là điểm cộng để giữ usable trên mobile. _(effort L)_
- **UX-09 · 🟡 MEDIUM** — AppShellSkeleton vẫn desktop-only (grid cứng 240px) — lệch với AppShell đã responsive
  - 📌 src/components/skeleton.tsx:20 'grid h-screen grid-cols-[240px_1fr]' (không có md:) và :38-42 header/padding px-7 cố định; trong khi app-shell.tsx:104 đã chuyển sang 'md:grid md:grid-cols-[240px_1fr]' + drawer dưới md.
  - 💥 Trên mobile, khi điều hướng giữa các trang app, skeleton hiện sidebar 240px cố định rồi snap sang layout drawer khi nội dung load → giật/nháy layout, phá vỡ tính liên tục thị giác mà skeleton lẽ ra phải tạo ra.
  - 🔧 Cho AppShellSkeleton phản chiếu AppShell responsive: ẩn cột sidebar dưới md (md:grid grid-cols-1 md:grid-cols-[240px_1fr], aside hidden md:flex), header px-4 md:px-7, lưới stat grid-cols-2 lg:grid-cols-4 cho khớp. _(effort S)_
- **UX-10 · 🟡 MEDIUM** — AppShellSkeleton dùng làm loading cho route PDF viewer gây nháy khung sai (cộng hưởng UX-08)
  - 📌 reports/[slug]/ không có loading.tsx (ls: chỉ page.tsx + pdf-viewer.tsx); route nằm trong group (client) nên (client)/loading.tsx:1-6 render <AppShellSkeleton/>. Viewer thực tế là layout toàn màn hình (pdf-viewer.tsx:766-772 'height:100vh' + toolbar 56px + rail + panel), KHÔNG có sidebar/AppShell.
  - 💥 Khi mở một báo cáo, người dùng thấy skeleton sidebar+bảng (giống trang danh sách) rồi mới nhảy sang khung viewer hoàn toàn khác → trải nghiệm chuyển cảnh đứt gãy ngay tại crown-jewel.
  - 🔧 Thêm src/app/[locale]/(client)/reports/[slug]/loading.tsx mô phỏng đúng khung viewer (thanh toolbar 56px, rail thumbnail trái, vùng trang giữa, panel phải), tận dụng <Skeleton/> sẵn có. _(effort M)_
- **UX-11 · ⚪ LOW** — Bảng 'Tài liệu gần đây' ở Portal tự dựng grid cố định, không responsive và lệch chuẩn DataTable
  - 📌 portal/page.tsx:146 header và :164 hàng dùng 'grid grid-cols-[2fr_1.1fr_1fr_0.9fr_36px]' — không có overflow-x-auto, không có biến thể responsive; trong khi các bảng admin đã chuyển sang <DataTable> (overflow-x + minWidth).
  - 💥 Trên mobile các cột (type/status/ngày) bị bóp/đè lên nhau; đồng thời tạo bất nhất giữa cách hiển thị danh sách ở portal và ở admin (một nơi dùng DataTable, một nơi grid thủ công).
  - 🔧 Hoặc bọc khối này trong overflow-x-auto + min-width, hoặc tốt hơn là chuyển 'Recent documents' sang dùng <DataTable> để đồng nhất với khu admin (tận dụng cell render Link/Badge sẵn có). _(effort S)_
- **UX-12 · ⚪ LOW** — Bản đồ màu dot bị nhân đôi giữa Badge và StatCard (nguồn sự thật tách rời)
  - 📌 src/components/ui/badge.tsx:54-66 DOT_TONES và src/components/ui/stat-card.tsx:21-33 DOT_BG là hai map gần như trùng nhau (cùng tone→class), định nghĩa độc lập.
  - 💥 Khi thêm/đổi tone (vd thêm 'archived' hay đổi màu 'review'), phải sửa ở hai nơi; dễ lệch màu dot giữa Badge và StatCard theo thời gian — đúng loại trùng lặp mà lib/status.ts vừa cố gắng xoá.
  - 🔧 Trích DOT_TONES ra một nơi dùng chung (vd export từ badge.tsx hoặc một map trong lib/status/tokens) rồi để StatCard import lại, tránh hai bản sao. _(effort S)_

</details>

**Điểm mạnh:** AppShell đã responsive đúng nghĩa: 240px sidebar trên md+, drawer off-canvas + hamburger + scrim + đóng bằng Escape dưới md (app-shell.tsx:104,116-120,191-198) — giải quyết phần lớn UX-02. · Ba component mới DataTable/EmptyState/StatCard + src/lib/status.ts gom nguồn sự thật status, loại bỏ trùng lặp STATUS_TONE/empty-text rải rác và chuẩn hoá toàn bộ trang danh sách admin/portal. · DataTable cuộn ngang đúng cách trên mobile (overflow-x-auto + minWidth) thay vì bóp vỡ bảng (data-table.tsx:49-53), kèm <table> ngữ nghĩa + scope=col + caption sr-only (a11y). · Hardcode tiếng Việt ở UI cấu trúc đã được dọn sạch — mọi nhãn admin/client/portal/auth đi qua next-intl 3 ngôn ngữ; grep diacritics trong JSX khu app trả về rỗng. · Luồng duyệt/từ chối báo cáo nay là thật: reviewReport() cập nhật ReportStatus + logAudit + revalidatePath, viewer chỉ hiện toast sau khi res.ok và router.refresh() (report-actions.ts:25-75, pdf-viewer.tsx:677-699). · EmptyState áp dụng nhất quán trên mọi danh sách (kể cả trạng thái rỗng lồng nhau trong entitlements), tạo cảm giác hoàn thiện cho các màn hình trống. · Token hệ thống chặt chẽ: role-based qua @theme inline, hình học sắc nét nhất quán, và text tertiary/quaternary được tối lại để đạt WCAG AA trên nền sáng (colors.css:46-52).

---

### 8.16 Performance — 76 → 74/100 (B) 🔴 -2

**Delta:** ĐÃ CẢI THIỆN: thumbnail rail trong pdf-viewer.tsx:872 đã chuyển sang `transform: scale(0.1208)` (GPU compositor) thay vì zoom — đúng một nửa khuyến nghị PERF-04; các component mới (data-table.tsx, stat-card.tsx, empty-state.tsx) là server component thuần (không hook, không "use client") nên không tăng client bundle; bridge font (typography.css:11-13 `--font-regular: var(--font-inter), ...`) nối đúng next/font với token, không còn rủi ro rơi về system font. VẪN CÒN: PERF-01 (QueryClientProvider thừa + react-query trong bundle) still_open; PERF-02 (PDF no-store, không ETag/max-age, canViewReport không cache) still_open; PERF-03 (watermark thundering herd, không in-flight map / atomic rename) still_open; PERF-04 (double-render 5 trang A4 + canvas vẫn dùng property `zoom` reflow ở dòng 905) still_open; PERF-05 (template.tsx vẫn remount toàn subtree) still_open; PERF-06 (không có next/dynamic, dialog/side-panel hydrate eager) still_open. PERF-07 partially_fixed. Tóm lại: tiến độ perf rất nhỏ, điểm giảm nhẹ 76→74 do soi kỹ hơn (canvas zoom CPU, avatar img thô) trong khi không có fix thực chất nào cho 6 finding cũ.

**Hiện trạng:** Hiệu năng tổng thể vẫn vững nhờ kiến trúc RSC-default đúng đắn (hầu hết trang là server component, danh sách dữ liệu fetch qua RSC + Promise.all, font self-hosted qua next/font với subset vietnamese). Tuy nhiên đợt "fix" này gần như KHÔNG chạm tới các finding hiệu năng đã nêu: 6/7 finding vẫn còn nguyên (PERF-01..06 still_open), chỉ PERF-07 được cải thiện một phần (bridge biến font sạch hơn trong typography.css). Điểm cộng mới: các component mới (data-table, stat-card, empty-state) đều là server component thuần không "use client", không làm phình client bundle. Nhưng vấn đề cốt lõi vẫn nằm ở: (1) QueryClientProvider bọc toàn app dù không có một useQuery/useMutation nào, kéo theo react-query vào client bundle vô ích; (2) viewer vẫn dựng đủ 5 trang A4 hai lần (canvas + thumbnail) và canvas vẫn dùng property `zoom` reflow-CPU thay vì transform GPU; (3) PDF route vẫn no-store khiến pdf.js refetch mỗi thao tác Range; (4) watermark vẫn check-then-create không khóa chống đua; (5) vẫn không có next/dynamic cho island nặng. Điểm gần như đứng yên so với lần trước vì các fix chủ yếu là UI/i18n, không phải perf.

<details><summary><strong>Trạng thái finding cũ (7)</strong></summary>

| ID | Trạng thái | Kiểm chứng fix | Ghi chú |
|---|---|---|---|
| PERF-01 | 🔴 CÒN |  | Hoàn toàn chưa fix. QueryClientProvider vẫn được mount tại root [locale]/layout.tsx:42 cho MỌI route, kể cả landing public, trong khi không có một truy vấn React Query nào trong toàn bộ codebase (chỉ có providers.tsx + get-query-client.ts tham chiếu @tanstack). react-query vẫn nằm trong dependencies và vẫn vào client bundle vô ích. Khuyến nghị cũ (gỡ provider khỏi root, chỉ bọc cục bộ khi có usage, cân nhắc bỏ dependency) vẫn nguyên giá trị. |
| PERF-02 | 🔴 CÒN |  | Chưa fix. View route vẫn trả `private, no-store` cho cả 200 và 206, nên pdf.js sẽ refetch lại từng Range mỗi thao tác (cuộn/zoom) thay vì cache cục bộ. Khuyến nghị cũ — đổi sang `private, no-cache, must-revalidate` + ETag (hash watermarkKey) hoặc `private, max-age=60` do bản watermark cố định per-user — vẫn chưa áp dụng. canViewReport vẫn gọi DB mỗi request, không cache ngắn hạn trong request (không thấy `cache()` hay unstable_cache ở lib/ hoặc server/). |
| PERF-03 | 🔴 CÒN |  | Chưa fix. Mẫu check-then-create vẫn nguyên: nhiều request đầu tiên cùng watermarkKey (cache lạnh) sẽ cùng vượt qua stat().exists=false, cùng load base + stamp (pdf-lib, tốn CPU) và cùng put() đè lên nhau (thundering herd). Không có Map<key,Promise> dedupe trong process, không atomic write/rename, không pre-generate khi publish/cấp entitlement. Đây là rủi ro perf nặng nhất khi nhiều client mở cùng báo cáo lần đầu. |
| PERF-04 | 🔴 CÒN |  | Still_open, chỉ mitigate một phần. 5 trang A4 đầy đủ (cùng các JSX nặng: SVG, table, bar chart) vẫn được mount HAI lần — một lần ở thumbnail rail (dòng 846-893) và một lần ở canvas (907-917) — vì cùng dùng chung `pages[i].el`. Cải thiện duy nhất: thumbnail đã chuyển sang `transform: scale(0.1208)` (dòng 872, GPU). NHƯNG canvas chính vẫn dùng `style={{ zoom }}` (dòng 905) — property `zoom` gây reflow/repaint trên CPU, đúng thứ khuyến nghị cũ bảo phải bỏ. Vẫn chưa virtualize (render hết 5 trang, không chỉ trang đang/sắp hiển thị). Khuyến nghị cũ vẫn cần làm: thumbnail dùng snapshot tĩnh, canvas dùng transform: scale(). |
| PERF-05 | 🔴 CÒN |  | Chưa fix. template.tsx vẫn còn nguyên và theo cơ chế Next.js sẽ remount toàn bộ subtree trang trên mỗi lần điều hướng chỉ để chạy fade-in opacity 200ms. Khuyến nghị cũ (bỏ template.tsx, làm fade-in bằng CSS mức layout/key, hoặc giới hạn animation) chưa được áp dụng. Mức độ nhẹ như đánh giá cũ, nhưng vẫn là remount thừa. |
| PERF-06 | 🔴 CÒN |  | Chưa fix. Không có một lệnh next/dynamic nào trong toàn dự án. Viewer vẫn import + hydrate eager toàn bộ: 2 Dialog phê duyệt (chỉ dùng khi canApprove), SidePanel, Toast, Tooltip... đều nằm trong bundle island chính và hydrate ngay. Khuyến nghị cũ (lazy-load dialog phê duyệt theo canApprove, tách render trang khỏi toolbar) chưa thực hiện. |
| PERF-07 | 🟡 VÁ MỘT PHẦN |  | Cải thiện một phần. Mặt tốt: bridge biến font giờ nối chuẩn next/font (typography.css:11-13) nên không còn nguy cơ rơi thẳng về system font; next/font Google mặc định bật adjustFontFallback (size-adjust tự sinh) nên CLS khi swap đã được giảm sẵn dù không khai báo tay. Mặt còn lại: IBM Plex Mono vẫn nạp 3 weight 400/500/600 (khuyến nghị cũ là rút còn 400/600 cho đúng mức dùng — tải 500 có thể thừa); chưa có `preload: true` rõ ràng cho font tham gia LCP (dựa mặc định). Coi là partially_fixed vì hạ rủi ro CLS nhưng chưa tối ưu số weight. |

</details>

<details><summary><strong>Finding MỚI (4)</strong></summary>

- **PERF-N1 · 🟡 MEDIUM** — Canvas viewer vẫn dùng CSS property `zoom` (reflow CPU) thay vì transform: scale()
  - 📌 src/app/[locale]/(client)/reports/[slug]/pdf-viewer.tsx:903-905 `<div className="flex flex-col items-center gap-6" style={{ zoom }}>` — biến state zoom (0.5..2) gán thẳng vào property `zoom`
  - 💥 Mỗi lần đổi zoom (nút +/- ở toolbar) buộc trình duyệt re-layout toàn bộ cây 5 trang A4 trên main thread (reflow + repaint), không tận dụng GPU compositor như transform. Trên trang nhiều phần tử (table/SVG/bar) gây giật và tăng INP. Đây chính xác là điều khuyến nghị PERF-04 cũ bảo phải sửa nhưng phần canvas vẫn chưa đụng tới (chỉ thumbnail được sửa).
  - 🔧 Đổi `style={{ zoom }}` thành `style={{ transform: \`scale(${zoom})\`, transformOrigin: 'top center' }}` và bù chiều cao container bằng wrapper để scroll đúng. transform: scale() chạy trên compositor, không reflow. _(effort S)_
- **PERF-N2 · ⚪ LOW** — Avatar dùng <img> thô, không next/image, thiếu width/height intrinsic
  - 📌 src/components/ui/avatar.tsx:64-68 `<img src={src} alt={name} className="h-full w-full object-cover" />` — không dùng next/image, không có width/height attribute, không loading/decoding hint
  - 💥 Khi avatar có src ảnh thật (tương lai), ảnh không được Next tối ưu (không resize/format/AVIF, không lazy decode), và thiếu kích thước intrinsic có thể gây CLS nhỏ. Hiện tại hệ thống chủ yếu render initials nên tác động thấp, nhưng là điểm yếu sẵn sàng phát tác.
  - 🔧 Dùng next/image với width/height = size, hoặc tối thiểu thêm width={size} height={size} loading="lazy" decoding="async" vào <img>. Cấu hình images.remotePatterns trong next.config.ts nếu avatar đến từ storage ngoài. _(effort S)_
- **PERF-N3 · ⚪ LOW** — Landing public mount 11 Reveal client islands, mỗi cái giữ will-change-transform vĩnh viễn
  - 📌 src/app/[locale]/(public)/page.tsx có 11 lần <Reveal> (grep đếm 11); src/components/reveal.tsx:62 className luôn gồm `will-change-transform` (không gỡ sau khi shown), mỗi Reveal tạo 1 IntersectionObserver riêng
  - 💥 `will-change-transform` để vĩnh viễn buộc trình duyệt giữ layer compositor cho 11 phần tử lớn trên landing kể cả sau khi animation xong, tốn bộ nhớ GPU/compositor không cần thiết; 11 IntersectionObserver tách rời cũng nhiều hơn mức cần. Tác động nhỏ trên desktop nhưng đáng kể trên mobile yếu (đúng mục tiêu mobile của blueprint).
  - 🔧 Gỡ will-change sau khi `shown` (chỉ áp will-change-transform khi chưa shown), hoặc bỏ hẳn will-change và để CSS .bc-rise xử lý. Cân nhắc dùng một IntersectionObserver chung hoặc thay Reveal bằng animation CSS thuần khi không cần điều khiển JS. _(effort S)_
- **PERF-N4 · ⚪ LOW** — Hai DB query độc lập trong view-route không chạy song song / không cache
  - 📌 src/app/api/reports/[id]/view/route.ts:36 `prisma.report.findUnique(...)` rồi :42 `await canViewReport(...)` (mở thêm query entitlement) tuần tự; download/route.ts:38,46,52 ba truy vấn user→report→canViewReport tuần tự
  - 💥 Mỗi request stream PDF tạo nhiều round-trip DB tuần tự (report + entitlement; bản download còn thêm user) trước khi bắt đầu stream, tăng TTFB của tài nguyên LCP-critical (PDF). Không nghiêm trọng vì là route nhị phân, nhưng cộng dồn với no-store (PERF-02) khiến mỗi thao tác Range trả qua toàn bộ chuỗi check lại.
  - 🔧 Bọc canViewReport/report lookup bằng React cache() để dedupe trong cùng request; cân nhắc gộp report+entitlement vào một query/Prisma include; với download có thể nạp user và report song song bằng Promise.all. _(effort M)_

</details>

**Điểm mạnh:** Kiến trúc RSC-default đúng chuẩn: hầu hết trang ([locale]/(client)/reports/page.tsx, các admin page) là async server component, fetch dữ liệu trên server và chỉ đẩy island 'use client' khi thật cần (login-form, pdf-viewer, app-shell drawer). · Component design-system mới (data-table.tsx, stat-card.tsx, empty-state.tsx) đều là server component thuần — không 'use client', không hook — nên không tăng client bundle dù được dùng rộng; data-table.tsx ghi rõ 'Server-renderable (no hooks)'. · Font tối ưu nền tảng tốt: self-hosted next/font (Inter/Source Serif 4/IBM Plex Mono) với subset latin+vietnamese, display:swap, adjustFontFallback mặc định để giảm CLS; bridge token typography.css:11-13 nối đúng biến next/font. · Gộp truy vấn ở trang danh sách: reports/page.tsx:37 dùng Promise.all cho listVisibleReports + listCategories thay vì tuần tự, có take:24 giới hạn số bản ghi. · Tôn trọng prefers-reduced-motion ở mức toàn cục (globals.css:220-227) làm gần như tức thì mọi animation/transition — tốt cho cả a11y lẫn perf trên thiết bị yếu. · Thumbnail rail trong viewer đã chuyển sang transform: scale() (GPU compositor) ở pdf-viewer.tsx:872, đúng một phần khuyến nghị PERF-04. · Gần như không dùng ảnh raster: logo/icon là SVG inline, cover là SVG tile, nên payload ảnh ~0 và không có chi phí tối ưu hoá ảnh ở các trang chính.

---

### 8.17 Security — AuthZ, Entitlements, PDF, IDOR — 78 → 76/100 (B) 🔴 -2

**Delta:** CẢI THIỆN: (1) SEC-03 — lifecycle approve/reject/publish nay là server action thật, có requireRole(SUPER_ADMIN/APPROVER) + ghi audit REPORT_APPROVE/REJECT/PUBLISH (report-actions.ts), thay thế toast giả; (2) SEC-05 một phần — .env đã vào .gitignore; (3) SEC-07 một phần — logAudit/logReportAccess nay console.error thay vì nuốt im lặng; (4) SEC-08 một phần — nginx đã set X-Real-IP $remote_addr. VẪN CÒN/CHƯA SỬA: SEC-01 (tokenVersion vẫn không bao giờ được so sánh — force-relogin/demote vô hiệu), SEC-02 (download secret vẫn fallback 'insecure-dev-download-secret', không có env validation fail-closed), SEC-04 (watermark vẫn cache theo reportId+userHash, footer vẫn nhúng IP+timestamp đóng băng), SEC-06 (không có guard actor!=target trong setStatus). PHÁT SINH MỚI: lifecycle thiếu state-machine precondition (publish thẳng DRAFT), view route tin session.user.status từ JWT nên suspended user còn xem được tới hết maxAge 30 phút. Tổng thể đi ngang/giảm nhẹ: một điểm sáng lớn (SEC-03) nhưng đổi lại lộ thêm regression về state-machine và xác nhận các nền tảng vẫn yếu.

**Hiện trạng:** Lõi authz/entitlement vẫn rất chắc: canViewReport/visibleWhere dùng EXISTS tương quan, áp dụng nhất quán ở page (getReportBySlug) và CẢ HAI route stream (view + download), staff-bypass tường minh. Token tải xuống vẫn single-use atomic (updateMany count===1), download route re-validate user còn active + entitlement sau khi consume token (defense-in-depth tốt). Watermark vẫn server-side, không thể giả mạo từ client. Điểm sáng lớn của vòng này: lifecycle duyệt/phát hành báo cáo đã được hiện thực hóa thật (reviewReport trong report-actions.ts) với requireRole + logAudit, không còn là toast giả — không có đường escalation cho EDITOR/CLIENT qua submit/approve/publish vì requireRole chặn đúng. Tuy nhiên các lỗ hổng nền tảng từ vòng trước phần lớn VẪN CÒN: cơ chế tokenVersion vẫn hoàn toàn vô hiệu (không bao giờ so sánh), secret tải xuống vẫn có fallback hardcoded không fail-closed, không actor!=target guard, watermark vẫn cache đóng băng IP/timestamp. Phát sinh thêm: lifecycle mới thiếu kiểm tra precondition trạng thái (APPROVER publish thẳng DRAFT, bỏ qua REVIEW) và view route tin status từ JWT (suspended user còn xem PDF tới 30 phút).

<details><summary><strong>Trạng thái finding cũ (8)</strong></summary>

| ID | Trạng thái | Kiểm chứng fix | Ghi chú |
|---|---|---|---|
| SEC-01 | 🔴 CÒN |  | Hoàn toàn chưa sửa. tokenVersion được nhúng vào JWT và đọc ra từ DB nhưng KHÔNG BAO GIỜ được so sánh ở bất kỳ đâu (jwt callback không re-fetch, session callback không propagate, requireFreshUser không so sánh). Cơ chế force-relogin vẫn vô hiệu: việc giáng cấp role (vd SUPER_ADMIN→CLIENT mà không suspend) hoặc bump tokenVersion sẽ không có tác dụng cho tới khi JWT hết hạn (maxAge 30 phút). Suspend vẫn bị chặn nhưng nhờ kiểm status, không nhờ tokenVersion. |
| SEC-02 | 🔴 CÒN |  | Chưa sửa. Vẫn fallback về secret yếu hardcoded thay vì fail-closed. Nếu prod quên set DOWNLOAD_TOKEN_SECRET, token tải xuống sẽ ký bằng secret công khai → kẻ tấn công có thể tự forge token (dù vẫn cần jti tồn tại trong DB do consumeDownloadToken kiểm jti, nên tác động bị giảm; nhưng vẫn là anti-pattern không fail-closed). Khuyến nghị z.string().min(32).parse(process.env...) chưa được áp dụng. |
| SEC-03 | ⚫ (đã bác bỏ trước) |  | Đánh dấu was_refuted_ignore theo quy ước (vòng trước verdict='refuted'). Lưu ý tích cực: khuyến nghị vẫn được hiện thực hóa đầy đủ — lifecycle giờ là server action thật, bảo vệ bằng requireRole, ghi audit immutable. Không còn UI gợi ý hành động giả. Đây là cải thiện thực chất, không còn là vấn đề. |
| SEC-04 | 🔴 CÒN |  | Chưa sửa. Bản watermark vẫn cache theo (reportId, userHash) nhưng footer lại đóng dấu IP + thời điểm của LẦN ĐẦU truy cập — mọi lượt sau (kể cả tải xuống từ IP khác) vẫn hiển thị IP/thời gian cũ, làm giảm giá trị truy vết rò rỉ và có thể gây hiểu nhầm trong điều tra. Không tách luồng DOWNLOAD để đóng dấu tươi, cũng không bỏ IP/timestamp khỏi cache như khuyến nghị. |
| SEC-05 | 🟡 VÁ MỘT PHẦN |  | Sửa một phần. .env nay đã nằm trong .gitignore (tốt, vì repo CHƯA git nên chưa bị commit — orchestrator xác nhận no .git). Nhưng: (a) secret trong .env vẫn là giá trị thật chưa rotate; (b) seed vẫn dùng MỘT mật khẩu chung 'Blackcrest@2026' cho cả SUPER_ADMIN/EDITOR/APPROVER/CLIENT, không random, không gate bằng SEED_ALLOWED hay NODE_ENV — nếu seed chạy nhầm ở môi trường thật sẽ tạo admin mật khẩu đoán được. |
| SEC-06 | 🔴 CÒN |  | Chưa sửa. Vẫn thiếu guard actor!=target. Một APPROVER có thể tự suspend/reinstate/approve chính mình; nghiêm trọng hơn, APPROVER có thể suspend/reinstate các APPROVER/SUPER_ADMIN khác (các hành động nhạy cảm với staff chưa giới hạn riêng SUPER_ADMIN như khuyến nghị). Tác động thấp-trung vì cần đã là staff, nhưng vẫn là privilege-escalation chiều ngang giữa staff. |
| SEC-07 | 🟡 VÁ MỘT PHẦN |  | Sửa một phần. Không còn nuốt lỗi hoàn toàn im lặng — nay log ra console.error khi ghi audit/access thất bại. Tuy nhiên vẫn chỉ là console.error, chưa có metrics/alert thực sự và chưa cấp quyền chỉ-INSERT (append-only) ở tầng DB cho AuditLog/ReportAccessLog. Sự kiện bảo mật mất vẫn chỉ hiện trong log stdout, dễ bị bỏ sót. |
| SEC-08 | 🟡 VÁ MỘT PHẦN |  | Sửa một phần. nginx nay set X-Real-IP=$remote_addr (tốt). Nhưng $proxy_add_x_forwarded_for sẽ APPEND giá trị client gửi lên: nếu client tự gửi X-Forwarded-For: 1.2.3.4 thì header thành '1.2.3.4, <real_ip>' và app lại lấy phần TỬ ĐẦU (split(',')[0]) = giá trị client giả mạo. Để fix triệt để nên ưu tiên x-real-ip, hoặc nginx dùng `proxy_set_header X-Forwarded-For $remote_addr` (ghi đè) thay vì $proxy_add_x_forwarded_for. IP trong audit vẫn có thể bị giả. |

</details>

<details><summary><strong>Finding MỚI (4)</strong></summary>

- **SEC-09 · 🟡 MEDIUM** — reviewReport không kiểm tra trạng thái hiện tại — bỏ qua state-machine duyệt (publish thẳng DRAFT)
  - 📌 src/server/report-actions.ts:48-57 chỉ findUnique select{id} rồi update sang status mới, KHÔNG kiểm existing.status. Một APPROVER có thể publish (status='PUBLISHED', publishedAt=now) một báo cáo đang DRAFT, hoặc approve lại báo cáo đã PUBLISHED/ARCHIVED, hoặc reject báo cáo đã publish.
  - 💥 Vi phạm tính toàn vẹn của quy trình draft→REVIEW→APPROVED→PUBLISHED: một báo cáo nháp chưa qua duyệt nội bộ có thể bị phát hành thẳng cho client (canViewReport chỉ yêu cầu status='PUBLISHED'), bỏ qua kiểm soát review. Đồng thời publishedAt có thể bị ghi đè khi re-publish.
  - 🔧 Thêm bảng chuyển trạng thái hợp lệ và kiểm existing.status trước update: approve chỉ từ REVIEW; publish chỉ từ APPROVED; reject chỉ từ REVIEW/APPROVED. Trả lỗi nếu chuyển không hợp lệ. Cân nhắc dùng updateMany với where{status: <trạng thái nguồn hợp lệ>} để atomic. _(effort S)_
- **SEC-10 · 🟡 MEDIUM** — view route tin session.user.status từ JWT, không re-check DB — suspended user còn xem PDF tới 30 phút
  - 📌 src/app/api/reports/[id]/view/route.ts:31 `if (!session?.user?.id || session.user.status !== 'APPROVED')` — status lấy từ JWT (auth.config.ts:31-38 session callback đọc token.status), không gọi requireFreshUser/DB. Vì SEC-01 tokenVersion vô hiệu, bump tokenVersion khi suspend (accounts.ts:23) cũng không vô hiệu JWT.
  - 💥 Khi admin suspend một client, client đó vẫn có thể stream/xem (và in qua viewUrl) các PDF được phép cho tới khi JWT hết hạn (maxAge 30 phút). Download route thì AN TOÀN vì re-fetch user từ DB (download/route.ts:38-43), nhưng view route thì không — bất nhất.
  - 🔧 Trong view route, sau canViewReport hãy re-validate trạng thái user từ DB (giống download route) hoặc dùng requireFreshUser-style check, để suspend có hiệu lực tức thì cho cả luồng xem. _(effort S)_
- **SEC-11 · ⚪ LOW** — Không có submit-for-review action; timeline duyệt hiển thị các bước 'approved' bịa
  - 📌 Không tồn tại action EDITOR DRAFT→REVIEW (grep server/ chỉ có reviewReport approve/reject/publish). pdf-viewer.tsx:1125-1140 timeline hard-code cả 4 bước với tone 'approved'/'published' bất kể report.status thực tế (vd báo cáo DRAFT vẫn hiển thị 'Tạo nháp' + 'Gửi duyệt' + 'Duyệt' đều xanh).
  - 💥 UI duyệt phản ánh sai sự thật: staff thấy timeline báo cáo đã 'được duyệt' dù thực tế vẫn DRAFT/REVIEW → có thể ra quyết định sai. Không phải lỗ hổng escalation nhưng làm giảm độ tin cậy của audit/visual và che giấu trạng thái thật.
  - 🔧 Bổ sung action submitForReview (EDITOR/SUPER_ADMIN, DRAFT→REVIEW, có logAudit), và render timeline theo report.status thật (bước chưa đạt để tone neutral/pending) thay vì hard-code 'approved'. _(effort M)_
- **SEC-12 · ⚪ LOW** — reviewReport cho phép publish báo cáo không có fileKey (PDF trống) ra client
  - 📌 src/server/report-actions.ts:48-57 không kiểm report.fileKey trước khi publish. Sau publish, client thấy report trong listVisibleReports nhưng view/download trả 404 'Tài liệu chưa có tệp PDF.' (watermark.ts:86 fileKey null → null).
  - 💥 Thấp — không rò rỉ dữ liệu, nhưng cho phép phát hành báo cáo rỗng/chưa hoàn thiện ra client, tạo trải nghiệm lỗi và có thể lộ metadata (tiêu đề/tóm tắt) của báo cáo chưa sẵn sàng.
  - 🔧 Khi decision==='publish', yêu cầu report.fileKey != null (và lý tưởng status nguồn = APPROVED); trả lỗi nếu chưa có tệp. _(effort S)_

</details>

**Điểm mạnh:** Entitlement isolation rất chắc và nhất quán: visibleWhere/canViewReport dùng EXISTS tương quan, được áp dụng ở page (getReportBySlug), view route và download route — không có đường vòng nào bỏ qua · Download token single-use atomic đúng chuẩn: updateMany where{consumedAt:null, expiresAt>now} kiểm count===1, TTL 60s, jti lưu DB; download route còn re-validate user còn active + entitlement SAU khi consume (defense-in-depth) · Lifecycle duyệt/phát hành nay là server action thật (reviewReport) bảo vệ bằng requireRole(SUPER_ADMIN/APPROVER) + ghi audit immutable — đóng được lỗ 'toast giả' và chặn EDITOR/CLIENT escalate · PDF luôn stream qua endpoint đã auth, không bao giờ lộ fileKey/đường dẫn storage; storage.resolveKey chống path traversal (defense-in-depth dù key do server kiểm soát) · Watermark hoàn toàn server-side (pdf-lib + fontkit + font Unicode), không thể giả mạo/bỏ từ client; có cả dấu chéo + footer per-user · scripts/verify-entitlements.ts tái hiện đúng visibleWhere và assert cross-group isolation + non-published không rò rỉ — một bài test bảo mật chạy được dù chưa có test runner chính thức · nginx đã được cập nhật set X-Real-IP $remote_addr, tạo nền cho việc lấy IP đáng tin (cần app ưu tiên header này)

---

### 8.18 Data Management & Modeling — 84 → 82/100 (B) 🔴 -2

**Delta:** CẢI THIỆN: Action vòng đời báo cáo mới reviewReport (src/server/report-actions.ts:10-14,37-39) được zod-validate đầy đủ (reportId cuid, decision enum, note max 1000) — thay cho toast giả trước đây; requestDownloadUrl (download-actions.ts:16) validate reportId bằng z.string().cuid(); route download thêm cross-check claim.reportId !== id (route.ts) làm giảm tác động của DATA-03; status.ts mới gom status→tone về một nguồn với Record<EnumType> kiểu chặt. KHÔNG cần migration mới cho lifecycle vì chỉ cập nhật cột status/publishedAt sẵn có — đúng. CÒN TỒN: DATA-01 vẫn chết hoàn toàn (session callback auth.config.ts:35-41 không gắn tokenVersion; rbac.ts:39-47 select nhưng không so sánh) dù có comment khẳng định đã sửa — đây là fix bị hứa mà không làm; DATA-02 (getReportBySlug vẫn nhận slug thô, reports.ts:13); DATA-03 (download-token.ts:47 vẫn chỉ typeof, chưa .cuid()); DATA-04 (cast 'as never'/'as {role?:string}' còn ở auth.config.ts:25-27,38-39); DATA-05/06/07 còn nguyên.

**Hiện trạng:** Tầng dữ liệu vẫn là điểm mạnh nhất của dự án: schema Prisma sạch, chuẩn hoá tốt (RBAC tách khỏi Entitlement, ReportTranslation tách content khỏi access entity), có CHECK constraint XOR cho Entitlement, index keyset phân trang đúng, và các Server Action mới đều được zod-validate. Tuy nhiên, lỗi nghiêm trọng nhất của vòng trước — cơ chế tokenVersion chết — VẪN CHƯA được sửa dù developer thêm comment khẳng định đã "re-check tokenVersion". Trên thực tế session callback không truyền tokenVersion ra session và requireFreshUser không hề so sánh giá trị này, nên cảm giác an toàn giả vẫn còn nguyên. Phần lớn các finding low/info khác cũng còn nguyên. Điểm gần như giữ nguyên, hơi giảm vì các fix được hứa nhưng không thực hiện đúng.

<details><summary><strong>Trạng thái finding cũ (7)</strong></summary>

| ID | Trạng thái | Kiểm chứng fix | Ghi chú |
|---|---|---|---|
| DATA-01 | 🔴 CÒN |  | VẪN CHƯA SỬA — và đây là điểm đáng ngờ nhất. Developer thêm comment ở auth.config.ts:15 ('re-check status + tokenVersion against the DB') và ở rbac.ts:34, nhưng code thực tế không thực hiện so sánh. session callback không truyền tokenVersion ra ngoài nên không có giá trị JWT để đối chiếu; requireFreshUser select dbUser.tokenVersion rồi bỏ không dùng. Cột vẫn được bump khi suspend (accounts.ts:23) nhưng vì suspend cũng set status=SUSPENDED nên chính cơ chế tokenVersion vẫn vô dụng — không thể force re-login mà không suspend. Khuyến nghị cũ (so sánh hoặc bỏ cột) chưa được làm. Đây là fix bị hứa nhưng không thực hiện. |
| DATA-02 | 🔴 CÒN |  | VẪN CHƯA SỬA. Trong khi các action mới (report-actions, download-actions, entitlements, accounts) đều thêm z.string().cuid(), riêng getReportBySlug vẫn nhận slug thô không validate min/max/regex. Tác động thấp (findUnique tham số hoá, không SQLi) nhưng vẫn không đồng bộ với phần còn lại như khuyến nghị. |
| DATA-03 | 🔴 CÒN |  | VẪN CHƯA SỬA về mặt validate định dạng. Tuy nhiên tác động đã giảm nhờ route download (src/app/api/reports/[id]/download/route.ts) thêm kiểm tra 'claim.reportId !== id' và findUnique theo id, nên rid sai định dạng sẽ không khớp report. Định dạng cuid như khuyến nghị vẫn chưa thêm. |
| DATA-04 | 🔴 CÒN |  | VẪN CHƯA SỬA. File augmentation src/next-auth.d.ts (role: Role, status: UserStatus, tokenVersion: number) tồn tại và đúng, nhưng callback không tận dụng — vẫn cast thủ công ('as {role?:string}', 'as never'), làm yếu type safety end-to-end đúng như mô tả. Khuyến nghị gán trực tiếp token.role = user.role chưa được áp dụng. |
| DATA-05 | 🔴 CÒN |  | VẪN GIỮ NGUYÊN (chấp nhận được như đánh giá info trước). Date/Json vẫn vượt biên server→client dựa vào serialization ngầm của RSC; chưa định nghĩa output schema theo từng AuditAction. Không phải lỗi, chỉ là hợp đồng tuần tự hoá lỏng. |
| DATA-06 | 🔴 CÒN |  | VẪN CHƯA SỬA. Tính append-only vẫn chỉ là quy ước code, DB không cưỡng chế; logAudit thất bại vẫn chỉ console.error, chưa có cảnh báo/giám sát như khuyến nghị. |
| DATA-07 | 🔴 CÒN |  | VẪN CHƯA SỬA. Seed vẫn dùng object literal 'as const' gán vào cột enum (dựa structural typing), chưa import Role/UserStatus/CategoryKind/ReportStatus enum từ @prisma/client như khuyến nghị tuỳ chọn. |

</details>

<details><summary><strong>Finding MỚI (3)</strong></summary>

- **DATA-08 · ⚪ LOW** — reviewReport thay đổi trạng thái vòng đời nhưng không cưỡng chế hợp lệ chuyển trạng thái (state-machine)
  - 📌 src/server/report-actions.ts:41-57 — map decision→status (approve→APPROVED, reject→REJECTED, publish→PUBLISHED) rồi update vô điều kiện, chỉ check 'existing' tồn tại (dòng 48-52). Không kiểm tra trạng thái hiện tại; ví dụ có thể PUBLISH một report đang DRAFT, hoặc APPROVE một report đã ARCHIVED.
  - 💥 Vòng đời draft→review→approved→published có thể bị nhảy bước hoặc đảo ngược, tạo dữ liệu trạng thái không nhất quán (vd publishedAt set cho report chưa từng được duyệt). Không có ràng buộc DB hay code chặn transition sai.
  - 🔧 Định nghĩa bảng transition hợp lệ (vd DRAFT→REVIEW, REVIEW→APPROVED/REJECTED, APPROVED→PUBLISHED) và kiểm tra report.status hiện tại trước khi update; trả lỗi nếu transition không hợp lệ. Cân nhắc lấy status hiện tại trong cùng query 'existing'. _(effort M)_
- **DATA-09 · ⚪ LOW** — Xử lý lỗi validation không nhất quán: entitlements dùng .parse() (throw) còn các action khác dùng safeParse
  - 📌 src/server/entitlements.ts:25 'grantSchema.parse(...)' và :60 '.parse(...)' ném ZodError chưa bắt; src/server/accounts.ts:38 'idSchema.parse(...)'. Ngược lại report-actions.ts:37 và download-actions.ts:16 dùng safeParse trả lỗi thân thiện.
  - 💥 Khi input không hợp lệ, các action dùng .parse() sẽ ném exception thô (digest 500) thay vì trả thông báo tiếng Việt như reviewReport/requestDownloadUrl — trải nghiệm và xử lý lỗi không đồng nhất giữa các Server Action.
  - 🔧 Thống nhất dùng safeParse + trả {ok:false,error} (hoặc field errors) cho mọi action, hoặc bọc try/catch ZodError ở entitlements/accounts để map sang thông báo người dùng. _(effort S)_
- **DATA-10 · 🔵 INFO** — Report.fileSize kiểu Int (32-bit) có thể tràn với PDF lớn hơn ~2GB
  - 📌 prisma/schema.prisma:195 'fileSize Int?'; migration init 'fileSize INTEGER'. Int Postgres = signed 32-bit (tối đa ~2.147GB).
  - 💥 Báo cáo PDF kích thước lớn (hiếm với báo cáo, nhưng có thể với bản scan/đồ hoạ nặng) sẽ tràn cột fileSize, lưu sai/âm. Hiện chưa gặp vì seed dùng ~240KB, nhưng là rủi ro mô hình hoá.
  - 🔧 Đổi fileSize sang BigInt (Prisma BigInt → Postgres int8) nếu muốn an toàn tuyệt đối cho file lớn; tối thiểu ghi chú giới hạn 2GB ở chỗ upload. _(effort S)_

</details>

**Điểm mạnh:** Schema Prisma chuẩn hoá mạnh: hai trục độc lập RBAC (User.role) và Entitlement (group→report XOR group→category) tách bạch rõ ràng, ReportTranslation tách content đa ngữ khỏi access entity (schema.prisma:8, 213-223) · CHECK constraint XOR cho Entitlement được thêm đúng cách bằng raw SQL trong migration vì Prisma không biểu diễn được (migrations/.../entitlement_xor_check/migration.sql) · DownloadToken one-time đúng nguyên tắc: jti làm PK, consumedAt nullable, consumeDownloadToken dùng updateMany where consumedAt:null + expiresAt>now và check count===1 để đảm bảo atomic single-use (download-token.ts:50-54) · Data layer không over-fetch cột nhạy cảm: reports.ts:37 chỉ trả hasFile (!!fileKey), không lộ fileKey/fileSha256 ra client; download route select đúng field tối thiểu · Index hợp lý cho mẫu truy vấn thực tế: Report(status, publishedAt, id) cho keyset pagination, các unique (reportId,locale)/(userId,groupId)/entitlement uniques chống trùng · Server Action mới reviewReport được zod-validate đầy đủ (reportId cuid, decision enum, note max 1000) và ghi audit log bất biến — thay cho toast giả ở vòng trước · status.ts gom mapping status→tone/key về một nguồn dùng Record<ReportStatus|UserStatus|AccessLevel>, đảm bảo exhaustiveness theo enum khi thêm trạng thái mới

---

### 8.19 Routing — 82 → 84/100 (B) 🟢 +2

**Delta:** Cải thiện: ROUTE-01 (deep linking) đã FIX hoàn chỉnh — login/page.tsx:25 đọc callbackUrl từ searchParams, truyền xuống LoginForm (line 38), login-form.tsx:37-39 gắn hidden field, auth-actions.ts:99-103 validate qua safeInternalPath (chặn `//` và URL không bắt đầu bằng `/`), line 127 dùng làm redirectTo với fallback `/${locale}/portal`. API streaming route (/api/reports/[id]/view) cũng kiểm tra `status === "APPROVED"` đúng. Còn tồn đọng: ROUTE-02 (không layout/page nào re-check status APPROVED — cửa sổ rò metadata cho user vừa SUSPENDED vẫn còn, chỉ giảm nhẹ bằng JWT maxAge 30 phút), ROUTE-03 (listAdminReports vẫn thiếu requireRole nội tại — reports.ts:63), ROUTE-04 (matcher vẫn loại mọi path có dấu chấm, slug vẫn không có ràng buộc regex). ROUTE-05 giữ nguyên (pattern đúng, chưa tập trung hoá danh sách route).

**Hiện trạng:** Kiến trúc routing vẫn vững: tách middleware (chỉ là tiện ích redirect, không phải biên bảo mật theo CVE-2025-29927) khỏi các guard ở layer dữ liệu (layout group + RSC re-check). Lần fix này giải quyết dứt điểm lỗi deep-linking ROUTE-01 (callbackUrl giờ được đọc, truyền, validate chống open-redirect và dùng làm redirectTo). Tuy nhiên ba vấn đề còn lại của lần audit trước (ROUTE-02 status re-check, ROUTE-03 listAdminReports thiếu requireRole, ROUTE-04 matcher loại trừ mọi dấu chấm) VẪN CHƯA được xử lý — developer fix đúng một finding và bỏ qua phần còn lại. Route structure / nested routing / protected-route (auth) vẫn tốt; điểm yếu nằm ở phần "fresh status" và defense-in-depth nhất quán.

<details><summary><strong>Trạng thái finding cũ (5)</strong></summary>

| ID | Trạng thái | Kiểm chứng fix | Ghi chú |
|---|---|---|---|
| ROUTE-01 | ✅ ĐÃ FIX |  | Đã fix đầy đủ luồng deep-linking. callbackUrl được đặt trong middleware (line 35), đọc ở login page, truyền xuống form dưới dạng hidden field, validate bằng safeInternalPath() để chặn open-redirect (từ chối `//` và URL không bắt đầu bằng `/`), rồi dùng làm redirectTo của signIn với fallback /portal. Lưu ý nhỏ (không phải lỗ hổng): khuyến nghị cũ đề xuất chỉ chấp nhận path bắt đầu bằng `/${locale}/`, nhưng implementation chỉ kiểm tra bắt đầu bằng `/` và không phải `//` — vẫn chặn được open-redirect nên mối lo cốt lõi đã hết; chỉ cho phép redirect tới path nội bộ bất kỳ (vd `/en/...` hay path không hợp lệ sẽ fallback qua 404). Coi là FIXED. |
| ROUTE-02 | 🔴 CÒN |  | VẪN MỞ. Không một layout-group hay page HTML nào re-check `session.user.status === "APPROVED"` ở layer dữ liệu. (client) layout chỉ kiểm tra tồn tại session.user; (admin) layout chỉ kiểm tra role. Một user vừa bị SUSPENDED nhưng còn JWT hợp lệ vẫn load được /portal, /reports, /admin và thấy metadata cho tới khi JWT hết hạn. Giảm nhẹ duy nhất là maxAge 30 phút (không đổi từ lần trước). Điểm tích cực: route streaming PDF (/api/reports/[id]/view) CÓ kiểm tra status APPROVED, nên file thực sự không rò; nhưng cửa sổ rò metadata HTML vẫn đúng như mô tả finding. Khuyến nghị requireFreshUser-tương-đương ở layout chưa được áp dụng. |
| ROUTE-03 | 🔴 CÒN |  | VẪN MỞ. listAdminReports vẫn thiếu requireRole nội tại, phá vỡ defense-in-depth nhất quán — chỉ dựa vào (admin) layout guard. Developer đã thêm guard cho hàm MỚI report-actions.ts:32 (`requireRole("SUPER_ADMIN","APPROVER")`) nhưng KHÔNG đụng tới listAdminReports. Tất cả hàm trong admin-data.ts đều có requireRole, càng làm nổi bật sự thiếu nhất quán này. |
| ROUTE-04 | 🔴 CÒN |  | VẪN MỞ. Matcher vẫn dùng `.*\..*` loại trừ TẤT CẢ path có dấu chấm (không chỉ file tĩnh thật). slug vẫn không có ràng buộc regex cấm dấu '.'. Một slug chứa dấu chấm (vd /vi/reports/q4.2024) sẽ bỏ qua middleware (mất locale negotiation + redirect tiện ích). Tác động thực tế vẫn LOW vì guard ở layout/page và canViewReport vẫn chạy bất kể middleware, và slug do staff tạo; nhưng đúng khuyến nghị (whitelist đuôi file tĩnh HOẶC cấm dấu '.' trong slug) chưa được làm. |
| ROUTE-05 | 🔴 CÒN |  | Đây là finding info/'pattern đúng' từ lần trước, không phải lỗi — giữ ở trạng thái còn tồn tại như một ghi chú vận hành. Cách wrap auth() trực tiếp vẫn đúng (tránh authorized callback). Khuyến nghị tập trung hoá danh sách route /portal,/admin vào một module dùng chung cho cả middleware lẫn layout VẪN chưa được làm — logic 'cần auth/staff' đang bị lặp ở middleware (line 30-31) và ở các layout group, tiềm ẩn lệch theo thời gian. Không có tác động bảo mật. |

</details>

<details><summary><strong>Finding MỚI (3)</strong></summary>

- **ROUTE-06 · ⚪ LOW** — not-found.tsx dùng <a href="/"> thô — mất locale prefix và full page reload
  - 📌 src/app/[locale]/not-found.tsx: `<a href="/" className="inline-flex">` cho nút "backHome" (không dùng Link locale-aware của @/i18n/navigation)
  - 💥 Người dùng đang ở /en/... hoặc /zh/... khi gặp 404 (vd report không có quyền xem → notFound()) sẽ bị đưa về `/` gốc, mất ngữ cảnh locale và buộc next-intl negotiate lại từ cookie; cũng gây full reload thay vì client navigation. Vì đây cũng là boundary cho report bị từ chối truy cập, đây là đường thoát chính của người dùng hợp lệ.
  - 🔧 Thay `<a href="/">` bằng `<Link href="/" locale={locale}>` từ @/i18n/navigation; lấy locale qua useLocale()/params. error.tsx tương tự chỉ có nút reset() nên ổn, nhưng nếu thêm link về trang chủ cũng dùng Link locale-aware. _(effort S)_
- **ROUTE-07 · ⚪ LOW** — Logic 'route cần auth/staff' bị lặp giữa middleware và layout — không một nguồn sự thật
  - 📌 src/middleware.ts:30-31 `const needsAuth = rest.startsWith("/portal")||rest.startsWith("/admin"); const needsStaff = rest.startsWith("/admin")`; cùng lúc (client)/layout.tsx và (admin)/layout.tsx cũng tự định nghĩa guard riêng theo route-group
  - 💥 Khi thêm surface gated mới (vd /settings), dễ quên cập nhật một trong hai chỗ → middleware không redirect tiện ích HOẶC layout không guard. Đây chính là rủi ro 'lệch theo thời gian' mà ROUTE-05 cảnh báo, nay cụ thể hoá thành mã trùng lặp.
  - 🔧 Tập trung danh sách prefix cần auth/staff vào một module dùng chung (vd src/lib/route-guards.ts export `requiresAuth(path)`, `requiresStaff(path)`) để cả middleware và (nếu cần) layout tham chiếu cùng nguồn. _(effort S)_
- **ROUTE-08 · 🔵 INFO** — safeInternalPath không chuẩn hoá callbackUrl về locale hiện tại — có thể redirect chéo locale hoặc tới path không tồn tại
  - 📌 src/server/auth-actions.ts:99-103 `safeInternalPath` chỉ kiểm tra `url.startsWith("/") && !url.startsWith("//")`; redirectTo có thể là bất kỳ path nội bộ nào (vd `/en/admin` dù người dùng chọn vi, hoặc `/khong-ton-tai`)
  - 💥 Không phải lỗ hổng bảo mật (open-redirect đã chặn), nhưng UX: sau khi đăng nhập người dùng có thể bị đưa tới locale khác với lựa chọn ở form, hoặc tới path lạ rồi rơi vào 404. Khuyến nghị gốc của ROUTE-01 đề xuất ràng buộc prefix `/${locale}/` chính để tránh điều này.
  - 🔧 Trong safeInternalPath, thêm kiểm tra path bắt đầu bằng `/${locale}/` (hoặc rewrite locale segment về locale đang chọn) trước khi chấp nhận; nếu không khớp, fallback `/${locale}/portal`. _(effort S)_

</details>

**Điểm mạnh:** Middleware được tài liệu hoá rõ là tiện ích, KHÔNG phải biên bảo mật (tránh CVE-2025-29927); mọi RSC/Server Action/Route Handler re-check auth+entitlement ở layer dữ liệu (rbac.ts, authz.ts). · ROUTE-01 (deep linking/open-redirect) đã fix sạch và đúng pattern: validate callbackUrl phía server bằng safeInternalPath, chặn `//` và absolute URL. · Defense-in-depth thực: (client) và (admin) layout guard + page reports/[slug]/page.tsx:28 vẫn tự re-check session 'never trust the middleware'. · API streaming PDF (/api/reports/[id]/view) kiểm tra cả `session.user.id` lẫn `status === "APPROVED"` trên mọi request — phần nhạy cảm nhất (file thật) được bảo vệ status tươi. · i18n routing nhất quán: localePrefix:"always", generateStaticParams mọi locale, navigation helpers locale-aware, robots noindex toàn surface gated với override index cho landing.

---

### 8.20 Frontend Architecture — 82 → 85/100 (B+) 🟢 +3

**Delta:** CẢI THIỆN: (1) FA-03 giải quyết triệt để — DataTable (table semantic, scope=col, overflow-x, empty slot) + StatCard + EmptyState dùng chung ở admin/reports, admin/accounts, admin/audit, admin/entitlements và portal/reports; (2) FA-02 gom 5 bản sao về lib/status.ts (REPORT_STATUS/ACCOUNT_STATUS/ACCESS_LEVEL_KEY), import dùng chung ở RSC lẫn island; (3) FA-06 DOT_BG nay chỉ ở module-level trong stat-card.tsx, không còn tạo lại trong thân RSC; (4) FA-08 prop chết downloadUrl đã bị bỏ khỏi PdfViewerProps và page.tsx; (5) bonus: viewer giờ gọi Server Action thật reviewReport thay cho toast giả. CÒN LẠI: FA-01 chỉ partially — pdf-viewer.tsx vẫn 1 file 1294 dòng (chưa tách thư mục, dữ liệu mẫu kpis/months/alloc vẫn inline trong component); FA-04 clientIp vẫn copy-paste nguyên văn ở 2 route; FA-05 categoryName ở server/reports.ts và resolveTranslation ở lib/authz.ts vẫn sai chỗ, coupling còn lan rộng hơn (5 call-site); FA-07 AppShell vẫn import trực tiếp signOutAction. Mới: STATUS_LABEL trong pdf-viewer là bản sao thừa của REPORT_STATUS[..].key; listVisibleReports (data-access) lại nằm trong lib/authz.

**Hiện trạng:** Kiến trúc frontend hiện ở mức tốt và đã cải thiện rõ ở tầng shared/RSC: bộ ba primitive mới (DataTable semantic + a11y, StatCard, EmptyState) được dùng nhất quán trên toàn bộ admin + portal, lib/status.ts trở thành single source cho ánh xạ trạng thái, và report-actions.ts là một Server Action phân tầng sạch (zod → rbac → prisma → audit → revalidatePath). Tuy nhiên trọng tâm lớn nhất của vòng trước — god component pdf-viewer.tsx — KHÔNG được tách: file vẫn nằm trong MỘT module và còn phình thêm (1243 → 1294 dòng) dù bên trong đã được chẻ thành các sub-component có tên (CoverPage/SummaryPage/PerformancePage/AllocationPage/NotesPage/SidePanel/PageFrame). Các smell phân tầng nhỏ (clientIp trùng lặp, categoryName/resolveTranslation đặt sai chỗ, AppShell coupling signOutAction) vẫn còn nguyên. Tổng thể cohesion tốt hơn, modularization tầng UI rất tốt, nhưng refactor crown-jewel chỉ mới ở mức "đẹp bên trong một file".

<details><summary><strong>Trạng thái finding cũ (8)</strong></summary>

| ID | Trạng thái | Kiểm chứng fix | Ghi chú |
|---|---|---|---|
| FA-01 | 🟡 VÁ MỘT PHẦN | 🟡 fix chưa trọn (verified) | Bên trong ĐÃ tách thành các sub-component có tên: Watermark/PageFrame/H/P/Eyebrow (88-191), CoverPage (194), SummaryPage (293), PerformancePage (353), AllocationPage (493), NotesPage (559), MetaRow (1089), SidePanel (1106) và orchestrator PdfViewer (655). Nhưng TẤT CẢ vẫn nằm trong MỘT file — không tách ra pages/, viewer/PdfToolbar, viewer/SidePanel như khuyến nghị; file thậm chí phình thêm 51 dòng. Dữ liệu mẫu vẫn inline trong thân component: kpis (300-304), months/rows (354-363), alloc (494-500) — chưa đưa ra constant riêng. Đã sửa hành vi (reviewReport thật ở 681) nhưng KHÔNG đạt mục tiêu kiến trúc 'tách god component'. |
| FA-02 | ✅ ĐÃ FIX |  | Bảng ánh xạ trạng thái đã gom về src/lib/status.ts (REPORT_STATUS {tone,key}, ACCOUNT_STATUS, ACCESS_LEVEL_KEY) — object thuần serialize được, dùng chung cả RSC (admin/reports, admin/accounts, portal, reports list) lẫn client island (pdf-viewer import ở dòng 10 cho .tone). 5 bản sao trước đây không còn. Lưu ý nhỏ: pdf-viewer còn giữ STATUS_LABEL local (62-69) trùng key với REPORT_STATUS[..].key — ghi nhận thành FA-NEW-01, nhưng phần lớn FA-02 đã giải quyết. |
| FA-03 | ✅ ĐÃ FIX |  | Đã trừu tượng đủ bộ: DataTable (table/thead/tbody semantic, th scope=col, srHeader cho cột icon, caption sr-only, overflow-x + minWidth responsive), StatCard và EmptyState — export qua barrel ui/index.ts (16-18). Tất cả trang admin và portal đều dùng chung, không còn markup bảng/stat-card lặp inline. Đạt đúng khuyến nghị, kể cả yêu cầu accessibility (table semantic thật). |
| FA-04 | 🔴 CÒN |  | Hàm clientIp vẫn được copy-paste nguyên văn ở cả hai route handler PDF, chưa đưa vào lib/request.ts hay lib/audit.ts. Đáng chú ý cả hai route đều đã import từ @/lib/audit (logReportAccess) nên việc gom là tầm thường nhưng vẫn chưa làm. |
| FA-05 | 🔴 CÒN |  | categoryName (pure transform) vẫn nằm trong server/reports.ts (server-only data-access) và resolveTranslation vẫn ở lib/authz.ts (module authz) — chưa tách sang module thuần như lib/i18n-content.ts. Coupling còn LAN RỘNG hơn vòng trước: categoryName nay được import từ 5 nơi (server/reports, server/admin-data, portal, reports list, entitlements), gây phụ thuộc RSC→server không cần thiết. Tách 'pure transform' khỏi 'data access' vẫn chưa thực hiện. |
| FA-06 | ✅ ĐÃ FIX |  | DOT_BG nay là hằng số module-level duy nhất trong stat-card.tsx, không còn được tạo lại trong thân RSC mỗi lần render. Quy ước 'hằng ánh xạ luôn ở module scope' đã được tuân thủ. Giải quyết đúng khuyến nghị. |
| FA-07 | 🔴 CÒN |  | AppShell (chrome dùng-chung) vẫn import trực tiếp server action signOutAction và nhúng cố định trong footer, chưa nhận qua prop/slot từ layout. Coupling chrome→auth vẫn còn (mức info, ưu tiên thấp như đánh giá cũ). Không có thay đổi. |
| FA-08 | ✅ ĐÃ FIX |  | Prop chết downloadUrl đã bị loại khỏi PdfViewerProps và khỏi lời gọi trong page.tsx. Contract island nay tối giản, đúng với luồng tải token-based (handleDownload gọi requestDownloadUrl ở 703-716). Đã sửa đúng. |

</details>

<details><summary><strong>Finding MỚI (3)</strong></summary>

- **FA-NEW-03 · 🟡 MEDIUM** — pdf-viewer.tsx phình thêm 51 dòng dù mục tiêu là tách nhỏ
  - 📌 wc -l pdf-viewer.tsx = 1294 (audit trước: 1243). Toàn bộ Watermark/PageFrame/CoverPage/.../SidePanel + dữ liệu mẫu vẫn trong cùng file
  - 💥 Crown-jewel vẫn là điểm nóng maintainability: review/diff khó, tái dùng template không được, ranh giới client/island lớn. Việc thêm logic (reviewReport) làm file to thêm thay vì tách.
  - 🔧 Tách theo khuyến nghị cũ: thư mục viewer/ với pages/{CoverPage,SummaryPage,...} (hoặc DocumentPages.tsx), viewer/SidePanel.tsx, viewer/Toolbar.tsx; đưa kpis/months/rows/alloc ra viewer/sample-data.ts; giữ PdfViewer là orchestrator state thuần. _(effort L)_
- **FA-NEW-01 · ⚪ LOW** — STATUS_LABEL trong pdf-viewer là bản sao thừa của REPORT_STATUS[..].key
  - 📌 pdf-viewer.tsx:62-69 const STATUS_LABEL {DRAFT:"draft",...} trùng key-for-key với lib/status.ts:10-15 REPORT_STATUS[..].key; pdf-viewer đã import REPORT_STATUS (dòng 10) và dùng .tone tại 787 & 1164 nhưng lại dùng STATUS_LABEL[report.status] tại 788 & 1165
  - 💥 Sót một bản sao của bảng status sau khi gom FA-02; nếu thêm/đổi status phải sửa hai nơi, dễ lệch giữa tone và key.
  - 🔧 Bỏ STATUS_LABEL, thay tStatus(STATUS_LABEL[report.status]) bằng tStatus(REPORT_STATUS[report.status].key) ở cả hai chỗ. Giữ riêng DOC_STATUS_LABEL_VI vì đó là nhãn VN cố định cho thân tài liệu in. _(effort S)_
- **FA-NEW-02 · ⚪ LOW** — listVisibleReports (data-access) đặt trong lib/authz thay vì server/reports
  - 📌 src/lib/authz.ts:51 export async function listVisibleReports(...) và :42 VisibleReport; được import bởi portal/page.tsx:8 và reports/page.tsx:8 từ "@/lib/authz"
  - 💥 lib/authz lẽ ra chỉ chứa logic phân quyền (canViewReport/visibleWhere) lại ôm cả hàm truy vấn danh sách + resolveTranslation, làm nhòe ranh giới authz vs data-access và khiến server/reports.ts phải import ngược resolveTranslation từ authz.
  - 🔧 Chuyển listVisibleReports + resolveTranslation sang server/reports.ts (hoặc server/report-queries.ts), giữ lib/authz.ts thuần guard + visibleWhere. Gộp cùng FA-05 thành một đợt dọn tầng. _(effort M)_

</details>

**Điểm mạnh:** Bộ primitive mới DataTable/StatCard/EmptyState chất lượng cao: DataTable dùng table semantic thật với th scope=col, caption sr-only, srHeader cho cột hành động, overflow-x + minWidth responsive — vừa tái dùng vừa nâng accessibility, áp dụng đồng bộ toàn admin + portal · lib/status.ts là single source of truth gọn (REPORT_STATUS/ACCOUNT_STATUS/ACCESS_LEVEL_KEY) dạng Record thuần, serialize được nên dùng chung cả RSC lẫn client island — đã xóa được 5 bản sao status map · report-actions.ts phân tầng mẫu mực: validate bằng zod → requireRole → prisma update → logAudit (append-only) → revalidatePath; thay thế toast xác nhận giả bằng Server Action thật, giữ contract ReviewResult rõ ràng · Các module server/lib nhỏ và đơn nhiệm (đa số <110 dòng), props giữa RSC→island đều plain/serializable và được khai báo tường minh (PdfViewerProps), giúp ranh giới client/server sạch · Pattern data-access entitlement-aware tập trung ở canViewReport/visibleWhere (correlated EXISTS, keyset pagination) — kiến trúc bảo mật-cohesive, được gọi nhất quán từ route, RSC và server action

---
