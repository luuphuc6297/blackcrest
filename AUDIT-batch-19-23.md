# Blackcrest — Re-audit batch #19–#23

> Adversarial re-audit trên code hiện tại · 6 cluster verifier + 3 skeptic độc lập (SEC-12, prod-migrate, self-publish) · `pnpm test` chạy thật.

## Kết luận batch: 86/100

**Batch #19-#23 vá thật, không phải fix giả: 3 blocker P0 lớn nhất (SEC-12, self-publish CRITICAL, prod-migrate fail-fast) đã đóng, nhưng lifecycle publish action vẫn hở re-check phiên.**

Đây là một batch chất lượng cao và TRUNG THỰC. Các claim được hiện thực trong production code thật, không phải comment-thay-code hay stub trong test: mock pdf.js ~580 dòng đã bị xóa sạch, format.ts locale-aware bằng Intl thật, SEC-12 compare+propagate+bump tokenVersion thật, self-publish bị chặn ngay ở tầng schema (reportMetaSchema bỏ hẳn field status), migrator stage có Prisma CLI + engine linux-musl thật và gate fail-closed web qua service_completed_successfully. Cả 3 skeptic độc lập đều xác nhận truly_fixed (high confidence) cho 3 claim cao rủi ро nhất. Tính trung thực đáng khen: các cluster TỰ giác hạ verdict xuống confirmed_with_caveat và tự nêu newIssue HIGH (lifecycle action còn dùng requireRole) thay vì giấu — đúng tinh thần chống fix giả. Trừ điểm vì vài khoảng hở thật còn lại (lifecycle re-check, role-change bump, sha256 unique, account-lockout DoS, robots/sitemap mâu thuẫn).

### Ship readiness

GẦN SẴN SÀNG go-live nhưng CHƯA — còn 1 blocker HIGH thật phải đóng trước. Tin tốt: 3 lỗ nguy hiểm nhất (self-publish CRITICAL, SEC-12 revocation, prod-migrate fail-fast) đã vá thật và được 3 skeptic độc lập + test xác nhận; infra/i18n/pdf.js/CI đều là code thật chất lượng cao. NHƯNG đường lifecycle publish/approve/reject vẫn dùng requireRole (JWT) → một APPROVER bị suspend vẫn publish được trong tối đa 30 phút — đây là lỗ separation-of-duties còn sống, phải đổi sang requireFreshRole TRƯỚC khi lên prod (fix ~1 dòng). Sau khi vá blocker HIGH này + xử lý INFRA-02 cold-start TLS để deploy đầu không sập, có thể go-live; các P2/P3 (sha256 unique, lockout IP, robots/sitemap, x-default, worker-src) làm follow-up ngay sau.

### 🔎 3 skeptic độc lập (override mọi lạc quan của cluster)

| Topic | Verdict | Confidence |
|---|---|---|
| SEC-12 session revocation truly effective end-to-end | **truly_fixed** | high |
| Prod migrate runs fail-fast with Prisma actually available | **truly_fixed** | high |
| CRITICAL self-publish (EDITOR bypasses APPROVER) — current status | **truly_fixed** | high |

---

## Trạng thái theo cluster

| Cluster | Điểm | Item verdicts |
|---|:---:|---|
| undefined | 88 | ✅4 |
| undefined | 84 | ✅2 🟢~2 |
| undefined | 88 | ✅5 🟢~1 |
| undefined | 90 | ✅2 🟢~1 |
| undefined | 95 | ✅4 🟢~1 |
| undefined | 82 | ❌2 ✅3 🟢~2 |

---

## ✅ Đã xác nhận làm thật (13)

- **[Regression sweep / #23 / SEC-12 skeptic]** SEC-12 session revocation đóng thật ở các route nhạy cảm: requireFreshUser SELECT + so sánh tokenVersion (rbac.ts:49), propagate qua jwt/session callback (auth.config.ts), bump khi SUSPEND (accounts.ts:23); upload/view/download-mint đều gọi fresh-check. 3 skeptic + test thật (6/6 pass) xác nhận.
- **[Regression sweep / self-publish skeptic]** CRITICAL self-publish đã đóng ở tầng schema: reportMetaSchema KHÔNG còn field status, createReportFromPdf hard-code status=DRAFT + publishedAt=null; cả init và finalize re-parse cùng schema; publish tách riêng chỉ APPROVER/SUPER_ADMIN và chỉ từ APPROVED. report-create.ts là call-site DUY NHẤT tạo Report. Skeptic truly_fixed high.
- **[#19 Infra / migrate skeptic]** Prod migrate fail-fast với Prisma THẬT available: migrator stage copy toàn bộ node_modules từ deps (Prisma CLI + .bin/prisma + engine linux-musl), CMD pnpm exec prisma migrate deploy; compose migrate restart:no + web depends_on service_completed_successfully (không còn || true). Skeptic truly_fixed high.
- **[#20 pdf.js]** pdf.js render THẬT: mock ~580 dòng xóa sạch (grep rỗng), pdfjs-dist@4.10.38 worker SELF-HOSTED /pdf.worker.min.mjs (không CDN, version khớp lib), getDocument trên /api/reports/[id]/view đã xác thực (auth + re-validate status/tokenVersion + Range/206), lazy-render IntersectionObserver + devicePixelRatio×zoom.
- **[#22 i18n]** format.ts locale-aware bằng Intl thật (vi-VN/en-US/zh-CN, giữ ₫, scale word tỷ/tr·B/M·亿/万); MỌI numeric call-site truyền locale trong scope; 14/14 format test pass assert hành vi thật.
- **[#22 i18n]** registerAction localize zod errors qua getTranslations trong server-action path thật; 6 key mới + parity tuyệt đối 321 key/locale ở vi/en/zh, 0 thiếu 0 rỗng.
- **[#23 Tests]** State machine tách thành module thuần report-transitions.ts với MỘT map REVIEW_TRANSITIONS duy nhất (không bản sao song song); action thật import đúng map đó; 34/34 vitest pass (verify bằng pnpm test).
- **[#23 CI]** CI là gate THẬT: postgres service + prisma migrate deploy (có CLI qua pnpm exec) + typecheck + test + build, các bước nối tiếp, không || true / continue-on-error.
- **[#23 / Regression sweep]** env.ts fail-closed: throw MissingSecretError ở prod, đã gỡ hardcode fallback cũ; assertRequiredSecrets gọi tại boot qua instrumentation.ts; env test import module thật và assert throw trong prod.
- **[Regression sweep]** Upload routes chuyển sang requireFreshRole (re-check DB status+tokenVersion) trên mọi thao tác — đóng issue HIGH liên quan upload.
- **[#21 Skeleton]** AppShellSkeleton responsive khớp đúng breakpoint md của AppShell thật (cùng grid md:grid-cols-[240px_1fr], sidebar hidden md:flex, header h-16 + hamburger md:hidden) — không layout shift cột chính; dùng token semantic, không dark: (đúng quyết định bỏ dark mode).
- **[#19 Infra]** backup.sh/restore.sh mã hoá age đầy đủ vòng đời (encrypt + offsite chỉ *.age + retention), restore self-verify; age key giữ ngoài repo (/opt/blackcrest/.age), .gitignore loại certbot/*.pem; nginx HSTS + client_max_body_size 30m đặt đúng block :443.
- **[Regression sweep]** Login lockout DB-backed thật (per-account user.id, MAX 5/15 phút), check trước khi verify password để không lộ probe; survive restart, không phụ thuộc dịch vụ ngoài; instrumentation.ts không gắn Sentry/PII.

## 🟡 Vá một phần

- **[#23 / SEC-12 skeptic]** SEC-12 session revocation — phạm vi coverage
  - _Thiếu:_ Đóng thật cho suspend/revoke ở upload/view/download-mint, NHƯNG (a) lifecycle publish/approve/reject action vẫn dùng requireRole (JWT) — xem stillOpenBlocker; (b) tokenVersion chỉ bump khi SUSPEND, không bump khi đổi/giáng role (hiện chưa có action đổi role nên là latent); (c) download GET route (download/route.ts:38-44) chỉ check status không so sánh tokenVersion (được mitigate bằng one-time token ~60s).
- **[#23 Tests]** State machine single-source-of-truth
  - _Thiếu:_ Single source ở mức DỮ LIỆU (map) là thật, nhưng action KHÔNG gọi hàm resolveReportTransition() được test — action inline rule.from.includes()/rule.to. Test và runtime là hai code path tách biệt dùng chung map → rủi ro drift thấp nhưng còn. Nên cho action gọi thẳng resolveReportTransition().
- **[#22 i18n/SEO]** generateMetadata hreflang/canonical
  - _Thiếu:_ Layout + landing có x-default; login & register THIẾU x-default trong languages; sitemap alternates cũng thiếu x-default. Cần thêm x-default (trỏ /vi) cho nhất quán tín hiệu ngôn ngữ.
- **[#22 i18n/SEO]** sitemap.ts /sitemap.xml
  - _Thiếu:_ Sinh /sitemap.xml thật nhưng đưa /login,/register vào sitemap trong khi 2 trang này kế thừa robots index:false từ layout → tín hiệu SEO tự mâu thuẫn (comment còn khẳng định sai 'indexable routes only'). Xem newIssues.
- **[#21 Skeleton]** Content area skeleton vs app pages
  - _Thiếu:_ Skeleton tự định nghĩa nội dung mẫu (stats+table) vì AppShell chỉ render {children}; không khớp 1:1 từng page cụ thể. Chấp nhận được cho skeleton dùng chung, chỉ là phỏng đoán nội dung.

## 🔴 Blocker còn lại

- **[HIGH]** Lifecycle publish/approve/reject action vẫn dùng requireRole (JWT) thay vì requireFreshRole
  - report-actions.ts:33 `await requireRole("SUPER_ADMIN","APPROVER")` chỉ đọc role từ JWT, KHÔNG re-check DB status/tokenVersion. Một APPROVER bị suspend/demote vẫn duyệt/publish được báo cáo trong cửa sổ JWT tối đa 30 phút (maxAge 1800s). SEC-12 skeptic xác nhận truly_fixed CHỈ cho upload/view/download-mint, không cover đường action này. Đây là blocker HIGH còn hở thật — fix 1 dòng: đổi sang requireFreshRole.
- **[MEDIUM]** tokenVersion KHÔNG bump khi đổi/giáng role (chỉ bump khi SUSPEND)
  - accounts.ts:23 chỉ increment khi status===SUSPENDED. SEC-12 yêu cầu bump cả trên role-change. Hiện chưa có action đổi role nào trong codebase (latent, chưa khai thác được), nhưng nếu thêm tính năng đổi role mà quên bump thì demote không có hiệu lực tới hết maxAge. Kết hợp với blocker HIGH ở trên (lifecycle còn requireRole) khiến demote càng kém hiệu lực.

## ⚠️ Issue mới do batch giới thiệu / phát hiện thêm

- **[MEDIUM]** Mâu thuẫn robots vs sitemap: /login & /register nằm trong sitemap nhưng kế thừa robots index:false
  - sitemap.ts:12 đưa /login,/register vào sitemap (priority 0.6) nhưng 2 trang kế thừa robots{index:false,follow:false} từ layout; comment còn khẳng định sai 'indexable routes only'. Gửi tín hiệu trái ngược cho crawler. Sửa: bỏ /login,/register khỏi sitemap (chỉ giữ landing) HOẶC thêm robots index:true cho 2 trang nếu thực muốn index.
- **[LOW]** Report.fileSha256 dedup race TOCTOU còn mở (do @@index thay vì @@unique)
  - report-create.ts dedup bằng findFirst (check-then-create) không có DB constraint chặn; 2 upload đồng thời cùng nội dung có thể tạo 2 Report trùng. Sửa: @@unique([fileSha256]) (Postgres cho nhiều NULL nên an toàn cột optional) + bắt P2002.
- **[LOW]** Login lockout per-account không có thành phần IP → account-lockout DoS
  - rate-limit.ts khóa theo user.id; kẻ biết email có thể cố ý nhập sai 5 lần để KHÓA tài khoản nạn nhân. Tradeoff phổ biến nhưng nên thêm throttle IP+email hoặc CAPTCHA sau vài lần sai.
- **[MEDIUM]** INFRA-02 cold-start TLS còn bẫy con-gà-quả-trứng
  - nginx/blackcrest.conf:34-35 ssl_certificate trong block listen 443; lần deploy đầu chưa có cert → nginx fail load CẢ config, sập luôn server :80 phục vụ ACME webroot, nên certbot --webroot không bootstrap được. Sửa: dùng certbot certonly --standalone lần đầu, hoặc ship self-signed tạm, và ghi rõ thủ tục vào comment.
- **[LOW]** Thiếu hreflang x-default trên login/register và trong sitemap alternates
  - login/register page languages chỉ {vi,en,zh}, sitemap alternates cũng không x-default, trong khi layout/landing đều có x-default:/vi. Thêm x-default cho nhất quán.
- **[LOW]** CSP thiếu worker-src tường minh cho pdf.js worker
  - next.config.ts CSP không có worker-src; worker same-origin chạy được nhờ fallback script-src 'self' nhưng kém tường minh, dễ vỡ nếu sau tinh chỉnh script-src. Hardening: thêm worker-src 'self'.

## ❌ Claim không đúng (refuted)

- **[Regression sweep / self-publish skeptic]** (Baseline cảnh báo) CRITICAL self-publish: reportMetaSchema VẪN cho status=PUBLISHED và EDITOR tự publish qua upload
  - REFUTED — đây là claim cảnh báo cũ đã được vá: schema không còn field status (zod strip key lạ), status hard-code DRAFT. Cả cluster lẫn skeptic độc lập đều xác nhận đóng thật. KHÔNG còn fake.
- **[Regression sweep]** (Baseline cảnh báo) Upload routes vẫn dùng requireRole (JWT) thay vì requireFreshRole
  - REFUTED — upload routes đã chuyển sang requireFreshRole (route.ts:14, [id]/route.ts:15), verify production code. Lưu ý: gap requireRole CHỈ còn ở report-actions.ts (lifecycle), KHÔNG ở upload.
- **[Regression sweep]** Report.fileSha256 is @@unique now (dedup hardening)
  - REFUTED — đây là claim KHÔNG đúng: schema.prisma:221 thực tế là @@index([fileSha256]), KHÔNG phải @@unique; không migration nào tạo UNIQUE constraint. Dedup chỉ qua findFirst → race TOCTOU vẫn mở (mức thấp). Xem stillOpenBlocker.

---

## Lộ trình cập nhật

### P0 — Đóng trước go-live
- **(S)** Đổi report-actions.ts:33 từ requireRole sang requireFreshRole("SUPER_ADMIN","APPROVER") để lifecycle publish/approve/reject re-check DB status+tokenVersion — đóng blocker HIGH separation-of-duties.
- **(S)** Sửa bootstrap TLS INFRA-02: dùng certbot certonly --standalone lần đầu (hoặc ship self-signed tạm) và ghi rõ thủ tục vào comment compose/nginx để deploy đầu nginx không sập cả :80.

### P1
- **(M)** Khi/để chuẩn bị tính năng đổi role: bắt buộc bump tokenVersion cùng update role; gói logic bump vào helper dùng chung để không quên. Cho action lifecycle inline gọi thẳng resolveReportTransition() để test và runtime cùng code path.
- **(M)** Đổi Report.fileSha256 sang @@unique([fileSha256]) + migration ALTER ADD CONSTRAINT, bắt P2002 trong createReportFromPdf trả về report đã tồn tại — chặn race dedup TOCTOU ở tầng DB.

### P2
- **(M)** Bổ sung throttle IP+email (hoặc CAPTCHA sau vài lần sai) song song account-lockout để tránh account-lockout DoS.
- **(S)** Sửa mâu thuẫn robots/sitemap: bỏ /login,/register khỏi sitemap (chỉ giữ landing) hoặc set robots index:true nếu thực muốn index; cập nhật comment sai 'indexable routes only'.

### P3
- **(S)** Thêm hreflang x-default (/vi) cho login/register và sitemap alternates; thêm worker-src 'self' vào CSP; cân nhắc checksum/SRI cho pdf.worker tự host trong CI; nối hoặc ẩn nút Search/Share placeholder trong pdf-viewer.

---

## Phụ lục — chi tiết từng cluster (item + evidence + new issues)

### undefined — 88/100

Cluster Infra này được làm THẬT, không phải "fix giả". Migrator stage tránh đúng cái bẫy pnpm-symlink lịch sử bằng cách copy TOÀN BỘ node_modules từ stage `deps` (có Prisma CLI + engine linux-musl + .bin/prisma + .pnpm/prisma@*), nên `pnpm exec prisma migrate deploy` chạy được thật trong container. Compose có job migrate one-shot fail-fast (KHÔNG có `|| true`, restart:"no") và `web` thực sự bị chặn qua `depends_on: migrate: condition: service_completed_successfully` — web không thể start trước khi migrate exit 0. HEALTHCHECK có ở cả Dockerfile và compose. nginx có `client_max_body_size 30m` + HSTS đặt đúng trên server block TLS (:443). backup.sh mã hoá bằng age, restore.sh giải mã + verify; age key không bị commit (nằm ngoài repo ở /opt/blackcrest/.age, .gitignore loại /nginx/certbot/). Một caveat thật về INFRA-02: cold-start TLS vẫn còn vấn đề con-gà-quả-trứng (nginx sẽ fail load cả config nếu thiếu cert :443, làm sập luôn server :80 phục vụ ACME webroot) — bootstrap chỉ work nếu làm đúng thủ tục thủ công ghi trong comment.

<details><summary><strong>✅ confirmed</strong> — (1) Dockerfile có migrator stage thật chạy `prisma migrate deploy` với Prisma CLI THỰC SỰ available (tránh bẫy pnpm-symlink chỉ copy @prisma+client) + có HEALTHCHECK</summary>

- 📌 Dockerfile:25-31 `FROM base AS migrator` + `COPY --from=deps /app/node_modules ./node_modules` (line 28, copy TOÀN BỘ node_modules từ deps, không phải chỉ @prisma+client) + `CMD ["pnpm","exec","prisma","migrate","deploy"]` (line 31). Đối chiếu runner line 47 chỉ copy `@prisma+client*` — migrator KHÁC hẳn. Xác nhận trên đĩa: node_modules/.pnpm/prisma@6.19.3_* tồn tại (CLI), .bin/prisma tồn tại, libquery_engine-linux-musl-openssl-3.0.x.so.node có trong gói prisma; base có `corepack enable` (line 4) nên pnpm sẵn sàng. prisma/migrations/ có 5 migration thật để deploy. HEALTHCHECK: Dockerfile:54-55 gọi /api/health (route src/app/api/health/route.ts tồn tại).
- 📝 Bẫy lịch sử được né đúng cách: copy nguyên cây node_modules từ `deps` giữ nguyên symlink pnpm + CLI + engine. `pnpm exec` không cần pnpm-lock.yaml vì node_modules đã cài sẵn. Engine linux-musl có trong lockfile sẽ được cài khi build trên alpine.

</details>

<details><summary><strong>✅ confirmed</strong> — (2) docker-compose.prod.yml: job migrate one-shot FAIL-FAST (không `|| true`) và GATE web (web depends_on migrate completed-successfully) + certbot service + healthchecks + proxy_params mount</summary>

- 📌 compose: `migrate` service `target: migrator`, `restart: "no"` (line 39), depends_on db service_healthy (40-42). `web` depends_on `migrate: condition: service_completed_successfully` (57-58) → web KHÔNG start trước khi migrate exit 0. `|| true` chỉ xuất hiện ở COMMENT line 34 nói rõ là KHÔNG dùng (grep xác nhận không có `|| true` thực trong lệnh nào). certbot service line 84-91 (renew daemon webroot). healthchecks: db (27-31), web (72-81), nginx (106-111). proxy_params mount line 103 `/etc/nginx/proxy_params_blackcrest.conf` khớp chính xác với 3 chỗ `include` trong nginx/blackcrest.conf (54,60,66).
- 📝 Gate fail-closed là THẬT, không phải comment suông. service_completed_successfully nghĩa là nếu migrate exit khác 0 thì web sẽ không khởi động.

</details>

<details><summary><strong>✅ confirmed</strong> — (3) nginx client_max_body_size 12m->30m + HSTS header thêm trên block TLS</summary>

- 📌 nginx/blackcrest.conf:40 `client_max_body_size 30m;` nằm TRONG block `server { listen 443 ssl; ...}` (bắt đầu line 28). HSTS: line 44 `add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;` cũng trong block 443. App limit thật là 25MB (src/lib/upload-session.ts:27 `MAX_BYTES = 25 * 1024 * 1024`) nên 30m có headroom cho multipart overhead — đúng với comment line 39.
- 📝 HSTS đặt đúng trên server TLS (không phải block :80 redirect, đúng chuẩn). Giá trị 30m hiện tại đúng bất kể giá trị cũ. Có thêm X-Content-Type-Options, X-Frame-Options, Referrer-Policy.

</details>

<details><summary><strong>✅ confirmed</strong> — (4) backup.sh age-encrypt dump; restore.sh decrypt/restore; age key không commit</summary>

- 📌 backup.sh:34-35 pg_dump -Fc | age -r "$RECIPIENT" -o db-$STAMP.dump.age; line 39-41 tar storage | age -r ... -o storage-$STAMP.tar.gz.age; check `command -v age` (23) + key tồn tại (24); RECIPIENT derive từ private key (27, không sinh key mới); offsite sync chỉ `--include='*.age'` (45). restore.sh:36 `age -d -i "$AGE_KEY_FILE" -o "$PLAIN"` rồi pg_restore --clean --if-exists (41) hoặc tar -xzf (49) + verify count bảng/file. Key nằm ở /opt/blackcrest/.age/key.txt (ngoài repo); find không thấy *.age hay key.txt trong repo; git ls-files không track certbot/age; .gitignore loại /nginx/certbot/ và *.pem.
- 📝 Mã hoá đối xứng-hoá-công-khai bằng age recipient, key offsite vô dụng nếu thiếu private key. restore có self-verify (đếm bảng/file) — thực hành tốt.

</details>

**New issues:**
- [medium] INFRA-02 cold-start TLS vẫn còn bẫy con-gà-quả-trứng: nginx fail load cả config nếu thiếu cert :443 — Bootstrap an toàn: hoặc (a) dùng `certbot certonly --standalone` lần đầu (không cần nginx) rồi mới `up nginx`, hoặc (b) tách 1 nginx config tối thiểu chỉ :80 cho lần đầu, hoặc (c) ship self-signed cert tạm để nginx load được rồi renew. Nên ghi rõ bước này vào comment thay vì chỉ `certonly --webroot`.
- [info] migrate service không có healthcheck riêng và web start_period 15s có thể che lỗi migrate chậm (minor) — Cân nhắc thêm timeout/giám sát cho job migrate ở tầng CI/CD; không phải lỗi code path.
- [low] migrator CMD dùng `pnpm exec` nhưng không copy pnpm-lock.yaml (chỉ package.json + workspace) — hoạt động nhưng mong manh — Tuỳ chọn: copy thêm pnpm-lock.yaml để nhất quán, hoặc gọi thẳng `node node_modules/prisma/build/index.js migrate deploy` để khỏi phụ thuộc corepack/pnpm. Hiện tại vẫn đúng nên chỉ là gợi ý độ bền.

---

### undefined — 84/100

Cluster #22 phần lớn được hiện thực THẬT, không phải "fix giả". format.ts giờ locale-aware thật sự (dùng Intl với BCP-47 tag theo từng locale vi-VN/en-US/zh-CN, giữ ₫, scale word tỷ/tr · B/M · 亿/万) và TẤT CẢ call-site đều truyền locale đang có trong scope. registerAction đã localize zod errors qua getTranslations + 6 key mới đầy đủ ở cả 3 locale (parity tuyệt đối: 321 key mỗi file, không thiếu, không rỗng). generateMetadata thêm title template + hreflang + canonical ở layout/landing/login/register; sitemap.ts sinh /sitemap.xml cho route công khai có alternates. Hai khiếm khuyết SEO thật cần ghi nhận: (a) login/register và bản thân sitemap KHÔNG có x-default hreflang (layout & landing thì có); (b) MÂU THUẪN robots/sitemap — sitemap quảng bá /login và /register là URL index được nhưng hai trang này kế thừa robots index:false từ layout (không override). Ngoài ra còn 1 vi-VN hardcode sót trong watermark.ts (footer PDF cố tình tiếng Việt — chấp nhận được).

<details><summary><strong>✅ confirmed</strong> — format.ts is now locale-aware (Intl for vi/en/zh; ₫ kept; scale word tỷ/tr localized) and EVERY numeric call-site passes locale</summary>

- 📌 src/lib/format.ts:9-17 INTL_LOCALE map {vi:'vi-VN',en:'en-US',zh:'zh-CN'} + intl(locale); :20 formatVND uses `new Intl.NumberFormat(intl(locale))`; :28-37 zh→亿/万, en→B/M, vi→tỷ/tr; :50-55 formatNumber uses intl(locale). Call-sites all pass locale in scope: portal/page.tsx:54-72 (locale from params:29), admin/reports/page.tsx:80,96,158,163 (locale:27), admin/audit/page.tsx:99 (locale:51), admin/accounts/page.tsx:114 (locale:34), reports/page.tsx:153 (locale:24), pdf-viewer.tsx:749,755,789 (locale prop:55). No hardcoded vi-VN format string remains in format.ts.
- 📝 Đúng thật, không phải fix giả. format.ts dùng Intl động theo locale; 14/14 test trong format.test.ts pass và assert đúng hành vi thật (vi '1.234,56', en '1,234.56'). Mọi call-site đều truyền `locale` đang có trong scope (từ params hoặc prop). Mặc định fallback là 'vi'→vi-VN nhưng là default-arg, không phải hardcode chuỗi format.

</details>

<details><summary><strong>✅ confirmed</strong> — registerAction zod errors localized + 6 message keys across all 3 locales (parity, no missing/empty)</summary>

- 📌 src/server/auth-actions.ts:31-48 resolve locale từ formData hidden field rồi `getTranslations({locale, namespace:'Auth'})`; zod messages dùng t('nameMinLength'), t('emailInvalid'), t('passwordMinLength'), t('confirmPasswordMismatch'); :77 t('emailDuplicate'); :95 t('registrationPending'). Parity check: cả 6 key tồn tại & đã dịch ở vi/en/zh; tổng 321 key/locale, 0 thiếu, 0 rỗng.
- 📝 Localize thật trong production path (server action), không chỉ trong test. 6 key đều có giá trị thực ở cả 3 locale (vd zh: '请输入您的全名。'). Parity hoàn hảo 321=321=321.

</details>

<details><summary><strong>🟢~ confirmed_with_caveat (low)</strong> — generateMetadata adds title template + hreflang + canonical on layout, landing, login, register</summary>

- 📌 layout.tsx:31-42 title.template '%s · Blackcrest' + metadataBase + canonical `/${locale}` + languages{vi,en,zh,x-default:/vi}. landing page.tsx:35-38 canonical+languages có x-default, robots index:true override. login/page.tsx:16-19 canonical `/${locale}/login` + languages{vi,en,zh} KHÔNG có x-default. register/page.tsx:20-23 tương tự KHÔNG có x-default.
- 📝 Title template, canonical, hreflang đều có thật ở cả 4 surface. Caveat: login & register THIẾU x-default trong languages (layout & landing thì có). metadataBase chỉ set ở layout nhưng được kế thừa nên canonical tương đối vẫn resolve đúng. Template áp dụng đúng cho title chuỗi của trang con.

</details>

<details><summary><strong>🟢~ confirmed_with_caveat (medium)</strong> — sitemap.ts generates /sitemap.xml</summary>

- 📌 src/app/sitemap.ts:11-27 export default sitemap() trả routes ['', '/login', '/register'] × 3 locale với alternates.languages per route. Không có public/sitemap.xml hay next-sitemap nên đây là route App Router chuẩn → phục vụ /sitemap.xml. NHƯNG :12 đưa /login,/register vào sitemap dù login/page.tsx & register/page.tsx không override robots → kế thừa robots{index:false,follow:false} từ layout.tsx:38.
- 📝 Sitemap sinh ra /sitemap.xml thật. Caveat lớn: comment ở sitemap.ts:7 tự nhận 'PUBLIC, indexable routes only (landing/login/register)' nhưng login/register thực tế là noindex (kế thừa từ layout). Tức sitemap quảng bá URL được đánh dấu noindex — tín hiệu SEO tự mâu thuẫn. Ngoài ra alternates trong sitemap không có x-default.

</details>

**New issues:**
- [medium] Mâu thuẫn robots vs sitemap: /login và /register nằm trong sitemap nhưng kế thừa robots index:false — Hoặc bỏ /login & /register khỏi sitemap (chỉ giữ landing '' đúng như landing là trang public duy nhất index:true), hoặc nếu thực sự muốn index login/register thì thêm robots:{index:true} vào generateMetadata của 2 trang đó. Hiện tại đang gửi tín hiệu trái ngược cho crawler.
- [low] Thiếu hreflang x-default trên login/register và trong sitemap alternates — Thêm 'x-default' (trỏ về bản vi) vào languages của login/register và vào alternates của sitemap để nhất quán tín hiệu ngôn ngữ mặc định, giống layout/landing.
- [info] Hardcoded vi-VN còn sót trong watermark PDF — Chấp nhận được vì đây là watermark bảo mật/pháp lý cố ý bằng tiếng Việt, không phải UI hiển thị theo locale. Chỉ ghi nhận để biết format.ts không phải nơi duy nhất chạm Intl; không cần sửa trong cluster i18n hiển thị.

---

### undefined — 88/100

Cụm #23 về cơ bản là THẬT, không phải "fix giả". State machine đã được tách ra file thuần (report-transitions.ts) với một map REVIEW_TRANSITIONS DUY NHẤT, và server action thật (report-actions.ts) tiêu thụ chính map đó (không có bản sao song song). 34/34 test PASS thật khi chạy pnpm test. Quan trọng nhất: test SEC-12 và env assert vào CODE THẬT (mock chỉ auth + prisma, gọi requireFreshUser thật; import ../env thật), không phải stub tái hiện. CI workflow chạy postgres -> prisma migrate deploy -> typecheck -> test -> build như các bước bắt buộc nối tiếp, không có "|| true"/continue-on-error. Caveat nhỏ: action KHÔNG gọi hàm resolveReportTransition() được test (nó inline rule.from.includes()/rule.to trên cùng map) — hai code path tách biệt nhưng dùng chung dữ liệu nên rủi ro drift thấp. Ghi nhận ngoài cụm: report-actions.ts vẫn dùng requireRole (JWT) chứ không phải requireFreshRole, nên blocker HIGH (lifecycle action không re-check tokenVersion) VẪN HỞ ở đường action này.

<details><summary><strong>✅ confirmed</strong> — (1a) State machine extracted to a PURE report-transitions.ts (dependency-free, unit-testable)</summary>

- 📌 src/lib/report-transitions.ts:1 chỉ import type ReportStatus; REVIEW_TRANSITIONS (l.13-20) + resolveReportTransition (l.23-29) thuần, không side-effect/DB. Map: approve {from:[REVIEW],to:APPROVED}, reject {from:[REVIEW,APPROVED],to:REJECTED}, publish {from:[APPROVED],to:PUBLISHED}.
- 📝 File thuần thật, không phụ thuộc runtime/DB, dễ unit test.

</details>

<details><summary><strong>🟢~ confirmed_with_caveat (low)</strong> — (1b) The real action (report-actions.ts) USES the shared map, not a parallel copy</summary>

- 📌 src/server/report-actions.ts:9 `import { REVIEW_TRANSITIONS } from "@/lib/report-transitions"`; l.45 `const rule = REVIEW_TRANSITIONS[decision]`; l.54 `if (!rule.from.includes(existing.status))`; l.46 `const status = rule.to`. grep toàn src chỉ tìm thấy MỘT định nghĩa map (không có bản sao). Caveat: action KHÔNG gọi resolveReportTransition() — nó tự inline guard trên cùng map, nên hàm được test và hàm chạy runtime là hai code path tách biệt (dùng chung dữ liệu).
- 📝 Single source of truth ở mức DỮ LIỆU (map) là thật, không có bản sao song song. Nhưng test chạy resolveReportTransition() còn action inline rule.from.includes()/rule.to — nếu sau này ai sửa logic guard trong action mà không qua hàm thuần, test vẫn xanh mà runtime sai. Rủi ro drift thấp vì cùng map, nên chỉ low.

</details>

<details><summary><strong>✅ confirmed</strong> — (2) vitest + 34 tests pass covering state-machine, SEC-12, env fail-closed, slugify, formatters</summary>

- 📌 Chạy thật `pnpm test`: 'Test Files 5 passed (5) / Tests 34 passed (34)'. Phân bổ verbose: report-transitions(4) + rbac/SEC-12(6) + env(5) + format(14) + report-create/slugify(5) = 34. vitest.config.ts:8 include src/**/*.test.ts.
- 📝 Số liệu 34/34 đúng nguyên văn, chạy xanh thật chứ không chỉ tuyên bố.

</details>

<details><summary><strong>✅ confirmed</strong> — (2-critical) SEC-12 test asserts against REAL requireFreshUser/auth behavior, not a reimplemented stub</summary>

- 📌 src/lib/__tests__/rbac.test.ts:8-15 import hàm THẬT từ '../rbac'; chỉ mock @/auth và @/lib/prisma (l.3-6). Test l.48-56 ép DB tokenVersion=6 vs JWT=5 -> kỳ vọng throw /revoked/. Hàm thật rbac.ts:49 `if (dbUser.tokenVersion !== sessionUser.tokenVersion) throw new AuthError("Session revoked")` — đây CHÍNH là so sánh mà SEC-12 báo thiếu, nay đã có. auth.config.ts:27 propagate token.tokenVersion vào JWT, l.38 vào session. Bump tồn tại: accounts.ts:23 `tokenVersion: { increment: 1 }` khi SUSPENDED.
- 📝 Test gọi hàm production thật, không stub. So sánh tokenVersion có thật trong rbac.ts; propagate qua jwt+session callback có thật; bump khi suspend có thật. SEC-12 đóng đúng ở tầng requireFreshUser.

</details>

<details><summary><strong>✅ confirmed</strong> — (2-critical) env test asserts the REAL secret-loading throws</summary>

- 📌 src/lib/__tests__/env.test.ts:30 `await import("../env")` import module THẬT; l.27-32 NODE_ENV=production + secret rỗng -> kỳ vọng getDownloadTokenSecret() throw. Hàm thật env.ts:35-42 gọi readSecret('DOWNLOAD_TOKEN_SECRET'); readSecret l.19-24 `if (IS_PROD) throw new MissingSecretError(...)`. Không còn fallback 'insecure-dev-download-secret' (dev fallback giờ là `dev-insecure-${name}` l.30, chỉ ngoài prod).
- 📝 Test import env thật và assert throw thật trong production. Fallback hardcode cũ đã bị gỡ; fail-closed ở prod là code thật.

</details>

<details><summary><strong>✅ confirmed</strong> — (3) GitHub Actions CI runs postgres -> prisma migrate deploy -> typecheck + test + build as required gates</summary>

- 📌 .github/workflows/ci.yml: services.postgres (l.15-28) postgres:17-alpine với healthcheck; step l.54-55 `pnpm exec prisma migrate deploy` (validate migrations, có prisma CLI qua pnpm exec); l.57-58 typecheck; l.60-61 test; l.63-64 build. Các bước nối tiếp không có `|| true`/continue-on-error (grep = no match), nên bất kỳ bước nào fail là job đỏ. Thư mục prisma/migrations có 5 migration thật để migrate deploy validate.
- 📝 CI là gate thật: migrate deploy chạy được (có CLI), tất cả bước bắt buộc, không nuốt lỗi. Đúng như tuyên bố.

</details>

**New issues:**
- [high] Lifecycle action reviewReport vẫn dùng requireRole (JWT) thay vì requireFreshRole — blocker HIGH vẫn hở ở đường action — Đổi report-actions.ts:33 sang `await requireFreshRole("SUPER_ADMIN", "APPROVER")` để tận dụng so sánh tokenVersion/status đã có, đóng kín blocker HIGH cho cả lifecycle action.
- [medium] tokenVersion KHÔNG được bump khi đổi role (demote) — SEC-12 chỉ đóng nửa: suspend có, role-change không — Khi đổi Role, cũng bump tokenVersion (increment) trong cùng update, hoặc tối thiểu chuyển các action nhạy cảm sang requireFreshRole (đọc role tươi từ DB) để demote có hiệu lực tức thì.

---

### undefined — 90/100

Cluster #20 thực sự đã được làm thật, không phải "fix giả". Mock ~580 dòng đã bị xóa sạch (không còn dấu vết "VISUAL recreation"/CoverPage/PerformancePage), viewer giờ dùng pdfjs-dist@4.10.38 với worker SELF-HOSTED tại /pdf.worker.min.mjs (không CDN), render PDF thật bằng getDocument trên URL view đã xác thực (/api/reports/[id]/view, withCredentials), có lazy-render qua IntersectionObserver và scale theo devicePixelRatio×zoom thay cho CSS zoom. Đủ trạng thái loading/error/empty. Chỉ có vài lưu ý nhỏ: "dynamic import" thực chất là runtime import() của thư viện pdfjs (không phải next/dynamic của component), và CSP thiếu worker-src tường minh (dựa vào fallback sang script-src 'self' — hoạt động đúng nhưng kém tường minh). Không phát hiện lỗ hổng nghiêm trọng trong cluster này.

<details><summary><strong>✅ confirmed</strong> — pdfjs-dist@4 với worker SELF-HOSTED (không CDN) — workerSrc trỏ tới /pdf.worker*.mjs local trong public/, không phải cdnjs/unpkg</summary>

- 📌 pdf-viewer.tsx:265 `pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";`; package.json:7 `"pdf:worker": "cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.mjs"` + predev/prebuild hooks; public/pdf.worker.min.mjs tồn tại (1.375.838 bytes, header license @licstart Copyright 2024); node_modules/pdfjs-dist version 4.10.38 (worker chứa chuỗi "4.10.38" → khớp lib, không lệch API/worker). grep cdnjs|unpkg|jsdelivr|mozilla.github trên src/+public/ KHÔNG có kết quả.
- 📝 Đúng thật: worker tự host, cùng version với lib nên không có mismatch. File worker bị .gitignore (.gitignore:38 `/public/pdf.worker.min.mjs`) nhưng được tái tạo bởi predev/prebuild nên build CI vẫn có — chấp nhận được.

</details>

<details><summary><strong>🟢~ confirmed_with_caveat (info)</strong> — Mock ~580 dòng đã được XÓA và thay bằng PdfPageCanvas lazy (dynamic import, IntersectionObserver lazy-render, devicePixelRatio×zoom thay cho CSS zoom)</summary>

- 📌 grep 'VISUAL recreation|CoverPage|PerformancePage|mock page|fake.*pdf' trên src/ → KHÔNG có kết quả (mock đã biến mất). PdfPageCanvas thật tại pdf-viewer.tsx:80-165: IntersectionObserver với rootMargin '400px 0px' set visible (101-107), chỉ render khi visible (112); devicePixelRatio×scale tại :121-122 `const dpr = window.devicePixelRatio || 1; const viewport = page.getViewport({ scale: scale * dpr })`, canvas style width/height chia lại dpr (:125-128) → crisp, KHÔNG dùng CSS zoom. RenderTask.cancel() được gọi khi unmount/đổi zoom (:138-143).
- 📝 Caveat về câu chữ: 'dynamic import' thực ra là runtime `await import("pdfjs-dist")` trong useEffect (:264) để loại pdf.js khỏi SSR/bundle ban đầu — KHÔNG phải `next/dynamic` của component PdfPageCanvas (component này là plain in-file). Phần quan trọng (tách pdf.js khỏi SSR, lazy-render từng trang) là thật. Chỉ là mô tả cơ chế hơi không chính xác, không phải fix giả.

</details>

<details><summary><strong>✅ confirmed</strong> — Render PDF thật stream từ /api/reports/[id]/view bằng pdfjs getDocument trên URL đã xác thực; có loading/error/empty states</summary>

- 📌 pdf-viewer.tsx:266 `loaded = await pdfjs.getDocument({ url: viewUrl, withCredentials: true }).promise` với viewUrl = `/api/reports/${report.id}/view` (page.tsx:60). Route view/route.ts xác thực mỗi request: auth() + status APPROVED (:31), re-validate DB status & tokenVersion (:37-47), canViewReport (:56), trả Content-Type application/pdf, hỗ trợ Range/206 cho pdf.js (:86-106), Cache-Control private no-store (:74). UI states: pdfError (:460-464), !report.hasFile → emptyDocument (:465-469), pdfLoading||!doc → loadingDocument spinner (:470-474), catch set renderError (:275-279). page.render thật tại :130.
- 📝 Render thật từ endpoint authed, hỗ trợ Range giúp pdf.js fetch theo chunk. Đủ 3 trạng thái loading/error/empty. withCredentials đảm bảo cookie session đi kèm khi pdf.js fetch.

</details>

**New issues:**
- [low] CSP thiếu worker-src tường minh (dựa vào fallback sang script-src 'self') — Thêm `worker-src 'self'` tường minh để rõ ý định và phòng trường hợp tinh chỉnh script-src sau này vô tình chặn worker. Nếu sau này pdf.js rơi vào chế độ fake-worker/blob (không xảy ra khi workerSrc same-origin hợp lệ), sẽ cần `worker-src 'self' blob:`. Hiện tại không phải lỗi chặn render — chỉ là hardening.
- [info] Không có Subresource Integrity / kiểm tra toàn vẹn cho worker tự host — Same-origin nên rủi ro thấp (CSP default-src 'self' giới hạn nguồn). Có thể thêm bước verify checksum của pdf.worker.min.mjs trong CI (so với hash của version pdfjs-dist đã pin) để tránh artifact bị thay đổi ngoài ý muốn. Không bắt buộc.
- [info] Nút Print/Search/Share một phần là placeholder — Ngoài phạm vi cluster #20 (real rendering) nhưng nên flag: Search/Share hiện chỉ là nút trang trí, dễ gây hiểu nhầm cho người dùng. Cân nhắc ẩn hoặc nối chức năng thật.

---

### undefined — 95/100

CLAIM ĐƯỢC XÁC NHẬN. AppShellSkeleton (src/components/skeleton.tsx) thực sự đã responsive và phản chiếu đúng breakpoint `md` của AppShell thật: cùng grid `md:grid md:grid-cols-[240px_1fr]`, sidebar ẩn dưới md, header có cùng class và có placeholder hamburger `md:hidden`, main dùng cùng layout. Không có nguy cơ layout shift đáng kể ở mức cấu trúc grid. Đây là code thật (Tailwind class trên DOM), không phải comment giả. Dark mode đã được bỏ theo quyết định của user nên không tính là lỗi. Chỉ có vài khác biệt nhỏ vô hại (min-h-screen vs h-screen; skeleton ẩn sidebar thay vì render drawer — hợp lý cho loading state).

<details><summary><strong>✅ confirmed</strong> — AppShellSkeleton root mirrors AppShell's md grid breakpoint (240px sidebar + 1fr content at md+, stacked below md).</summary>

- 📌 skeleton.tsx:21 `<div className="flex min-h-screen flex-col bg-surface md:grid md:grid-cols-[240px_1fr]">` khớp với app-shell.tsx:104 `<div className="h-screen bg-surface font-sans text-ink md:grid md:grid-cols-[240px_1fr]">`. Cùng `md:grid md:grid-cols-[240px_1fr]`, dưới md đều là flex-col/stack.
- 📝 Cấu trúc grid trùng khớp tuyệt đối. Khác biệt duy nhất là `min-h-screen` (skeleton) vs `h-screen` (AppShell) — vô hại, thậm chí an toàn hơn cho trạng thái streaming.

</details>

<details><summary><strong>✅ confirmed</strong> — Sidebar is hidden below md and appears only at md+ (mirrors AppShell where mobile uses off-canvas drawer + hamburger).</summary>

- 📌 skeleton.tsx:23 `<aside className="hidden flex-col gap-2 border-r border-line bg-surface-1 px-3 py-[14px] md:flex">` — ẩn dưới md, hiện ở md+. AppShell.tsx:117-120 dùng drawer off-canvas (`fixed ... -translate-x-full` ... `md:static md:translate-x-0`). Skeleton chọn ẩn hẳn thay vì render drawer — đúng cho loading state vì chưa có tương tác hamburger.
- 📝 Hành vi đúng: ở md+ cả hai đều chiếm cột 240px nên không gây layout shift khi page load xong. Dưới md skeleton không vẽ sidebar (drawer của AppShell mặc định đóng / off-canvas) nên cũng không lệch.

</details>

<details><summary><strong>✅ confirmed</strong> — Header silhouette mirrors AppShell header including the mobile-only hamburger placeholder.</summary>

- 📌 skeleton.tsx:39 `<header className="flex h-16 flex-none items-center gap-3 border-b border-line px-4 md:px-7">` trùng y hệt app-shell.tsx:190. Hamburger placeholder skeleton.tsx:41 `<Skeleton className="h-9 w-9 rounded-control md:hidden" />` phản chiếu nút hamburger app-shell.tsx:191-198 `... className="flex h-9 w-9 ... md:hidden"` (cùng kích thước h-9 w-9 và cùng `md:hidden`).
- 📝 Header và hamburger placeholder khớp pixel/breakpoint với bản thật. Main wrapper skeleton.tsx:38 `flex min-w-0 flex-col overflow-hidden` cũng trùng app-shell.tsx:189.

</details>

<details><summary><strong>🟢~ confirmed_with_caveat (info)</strong> — Content area uses responsive padding/grid consistent with the app (no layout shift).</summary>

- 📌 skeleton.tsx:45 `px-4 py-5 md:px-7 md:py-7` và grid stats skeleton.tsx:46 `grid-cols-2 ... lg:grid-cols-4`, cột bảng thu gọn dưới sm (skeleton.tsx:61-62 `hidden ... sm:block`). Đây là cấu trúc nội dung minh hoạ, không phải copy 1:1 từ một page cụ thể (AppShell chỉ render `{children}` ở app-shell.tsx:204).
- 📝 Skeleton tự định nghĩa nội dung mẫu (stats + table) vì AppShell không quy định layout children. Padding responsive `md:px-7` khớp phong cách app. Caveat nhỏ: đây là phỏng đoán nội dung chung, không buộc khớp từng trang — chấp nhận được cho một skeleton dùng chung.

</details>

<details><summary><strong>✅ confirmed</strong> — Dark mode intentionally dropped — should NOT be flagged as a defect.</summary>

- 📌 Cả skeleton.tsx và app-shell.tsx đều chỉ dùng token màu semantic (`bg-surface`, `bg-surface-1`, `border-line`, `bg-surface-2` ở skeleton.tsx:8) không có biến thể `dark:`. Không tìm thấy class `dark:` nào.
- 📝 Theo chỉ thị, không tính thiếu dark mode là lỗi. Việc dùng token semantic là nhất quán giữa skeleton và AppShell thật.

</details>

---

### undefined — 82/100

Đa số blocker P0 trước đây đã được đóng THẬT trong code production, không phải fix giả. Lỗ self-publish CRITICAL đã đóng thực sự (reportMetaSchema không còn trường status, createReportFromPdf hard-code DRAFT, publish bị chặn về APPROVER/SUPER_ADMIN và chỉ từ trạng thái APPROVED). Upload routes đã chuyển sang requireFreshRole. SEC-12 đã so sánh + propagate + bump tokenVersion khi SUSPEND. env.ts fail-closed đúng, instrumentation.ts không gắn Sentry/PII. Hai vấn đề CÒN MỞ: (1) Report.fileSha256 vẫn là @@index chứ KHÔNG phải @@unique (race dedup hiếm vẫn còn) — đúng như baseline cảnh báo; (2) tokenVersion chỉ bump khi SUSPEND, không bump khi demote/đổi role — nhưng hiện không có action đổi role nào tồn tại, nên là caveat tiềm ẩn chứ chưa phải lỗ đang khai thác được. Lockout là per-account theo user.id, không có thành phần IP (có thể bị account-lockout-DoS), nhưng cơ chế core đúng.

<details><summary><strong>❌ refuted</strong> — CRITICAL self-publish: reportMetaSchema STILL allows status=PUBLISHED and sets it directly; EDITOR can self-publish via upload</summary>

- 📌 src/lib/report-create.ts:20-32 reportMetaSchema = z.object({...}) KHÔNG có trường `status` (comment dòng 23-26: 'no `status` here on purpose. An upload ALWAYS creates a DRAFT'). Dòng 100-101 hard-code `status: "DRAFT"` + `publishedAt: null`. Đường tạo report duy nhất khác là upload-session.ts:280 cũng re-parse qua cùng reportMetaSchema. Publish chỉ qua reviewReport: src/server/report-actions.ts:33 `requireRole("SUPER_ADMIN", "APPROVER")` và report-transitions.ts:19 `publish: { from: ["APPROVED"], to: "PUBLISHED" }`. EDITOR không thể publish.
- 📝 Lỗ self-publish đã được đóng THẬT, không phải fix giả. EDITOR upload luôn ra DRAFT; quyền phát hành tách bạch cho APPROVER/SUPER_ADMIN và chỉ hợp lệ từ trạng thái APPROVED. Đây là separation-of-duties đúng.

</details>

<details><summary><strong>✅ confirmed</strong> — Upload routes use requireRole (JWT) not requireFreshUser/requireFreshRole</summary>

- 📌 src/app/api/admin/uploads/route.ts:14 `requireFreshRole("SUPER_ADMIN", "EDITOR", "APPROVER")`; src/app/api/admin/uploads/[id]/route.ts:15 `requireFreshRole(...)`. requireFreshRole→requireFreshUser re-check DB status + tokenVersion (rbac.ts:61-65, 37-53). grep toàn bộ src/app/api/ không còn requireRole nào trong upload routes.
- 📝 Đã chuyển sang requireFreshRole đúng yêu cầu — user bị suspend/revoke không thể tiếp tục upload trong cửa sổ JWT. Verified production code, không chỉ comment.

</details>

<details><summary><strong>❌ refuted (low)</strong> — Report.fileSha256 is @@unique now (dedup hardening)</summary>

- 📌 prisma/schema.prisma:221 `@@index([fileSha256])` (KHÔNG phải @@unique). Migration prisma/migrations/20260617155618_upload_chunked/migration.sql:40 `CREATE INDEX "Report_fileSha256_idx"` — không có UNIQUE constraint trong bất kỳ migration nào.
- 📝 VẪN CÒN MỞ đúng như baseline cảnh báo. Dedup hiện chỉ qua findFirst({where:{fileSha256}}) ở report-create.ts:70 — race hai upload đồng thời cùng nội dung vẫn có thể tạo 2 report trùng (TOCTOU). Cần đổi thành @@unique để DB chặn ở tầng constraint. Mức độ thấp vì hiếm và không phải lỗ bảo mật.

</details>

<details><summary><strong>🟢~ confirmed_with_caveat (low)</strong> — SEC-12 session revocation: requireFreshUser compares tokenVersion AND it is bumped on suspend/role-change; jwt/session callback propagates tokenVersion</summary>

- 📌 So sánh: src/lib/rbac.ts:49 `if (dbUser.tokenVersion !== sessionUser.tokenVersion) throw new AuthError("Session revoked")`. Propagate: src/auth.config.ts:38 `session.user.tokenVersion = (token.tokenVersion as number) ?? 0`, jwt callback dòng 27, và auth.ts:68 đưa tokenVersion vào user object lúc sign-in. Bump: src/server/accounts.ts:23 `...(status === "SUSPENDED" ? { tokenVersion: { increment: 1 } } : {})`. View route cũng re-check: src/app/api/reports/[id]/view/route.ts:44.
- 📝 SEC-12 đã đóng THẬT (compare + propagate + bump). Caveat: tokenVersion CHỈ bump khi status=SUSPENDED. KHÔNG có bump khi demote/đổi role — nhưng hiện không tồn tại action đổi role nào trong codebase (grep không tìm thấy data:{role:...}), nên đây là khoảng trống tiềm ẩn cho tương lai, chưa khai thác được. reject account dùng status=SUSPENDED nên cũng bump.

</details>

<details><summary><strong>✅ confirmed</strong> — env.ts fail-closed: no hardcoded fallback secret; missing secret throws at boot</summary>

- 📌 src/lib/env.ts:19-24 trong prod throw MissingSecretError nếu secret thiếu/yếu (<16 ký tự). download-token.ts:5,31 dùng getDownloadTokenSecret() từ env — không còn 'insecure-dev-download-secret'. assertRequiredSecrets() (env.ts:49-63) kiểm DOWNLOAD_TOKEN_SECRET, AUTH_SECRET, DATABASE_URL; gọi tại boot qua src/instrumentation.ts:6-10 (chỉ NEXT_RUNTIME===nodejs).
- 📝 Fail-closed đúng. Fallback hard-code đã biến mất. Dev mode vẫn cảnh báo to và dùng giá trị dev rõ ràng (env.ts:26-30), chỉ prod mới throw — hợp lý để next build xanh.

</details>

<details><summary><strong>🟢~ confirmed_with_caveat (low)</strong> — NEW rate-limit.ts + login_lockout migration is sound (keying, reset, bypass)</summary>

- 📌 src/lib/rate-limit.ts: lockout keyed theo user.id (per-account), MAX=5, 15 phút (dòng 11-12). isLocked check trước khi verify password — src/auth.ts:47 `if (isLocked(user)) throw new AccountLocked()`; registerFailedLogin khi sai (auth.ts:51); clearFailedLogins khi đúng (auth.ts:60). Migration 20260617161851_login_lockout/migration.sql thêm failedLoginCount + lockedUntil + enum ACCOUNT_LOCKED.
- 📝 Cơ chế lockout đúng và là production path thật (không phải chỉ test). Caveat: keyed thuần theo account, KHÔNG có thành phần IP → kẻ tấn công biết email có thể cố ý nhập sai 5 lần để KHÓA tài khoản nạn nhân (account-lockout DoS). Đây là tradeoff phổ biến nhưng nên bổ sung IP-based throttle hoặc CAPTCHA. Lưu ý nhỏ: clearFailedLogins gọi SAU check PENDING/SUSPENDED (auth.ts:56-60) nên user SUSPENDED đăng nhập đúng mật khẩu sẽ không reset counter — vô hại.

</details>

<details><summary><strong>✅ confirmed</strong> — instrumentation.ts observability (Sentry? PII?)</summary>

- 📌 src/instrumentation.ts chỉ có register() gọi assertRequiredSecrets() khi NEXT_RUNTIME===nodejs (dòng 6-10). grep 'Sentry|sentry|posthog|datadog' trong src/ và package.json: KHÔNG có kết quả.
- 📝 Không có Sentry/observability nào được gắn → không có nguy cơ rò rỉ PII qua telemetry. instrumentation.ts thuần là hook fail-fast validate secret lúc boot — đúng mục đích, an toàn.

</details>

**New issues:**
- [low] Report.fileSha256 vẫn @@index thay vì @@unique — race dedup TOCTOU còn mở — Đổi thành `@@unique([fileSha256])` (cần xử lý null vì cột optional — Postgres cho phép nhiều NULL nên an toàn) và bắt lỗi P2002 trong createReportFromPdf để trả về report đã tồn tại. Tạo migration ALTER TABLE ADD CONSTRAINT UNIQUE.
- [low] tokenVersion không bump khi đổi/giáng role (chỉ bump khi SUSPEND) — Khi triển khai action đổi role, BẮT BUỘC `tokenVersion: { increment: 1 }` cùng lúc. Cân nhắc gói logic bump vào một helper dùng chung để không bị quên.
- [low] Login lockout per-account không có thành phần IP → account-lockout DoS — Bổ sung throttle theo IP (hoặc IP+email) song song với account lockout, hoặc CAPTCHA sau vài lần sai, để tránh dùng cơ chế lockout làm vũ khí DoS chiếm tài khoản hợp lệ.

---
