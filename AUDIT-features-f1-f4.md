# Blackcrest — Deep-dive audit F1–F4 (search / watchlist / attachments / indicators)

> 5 auditor sâu + verify đối kháng mọi finding critical/high (10 confirmed · 4 adjusted · 0 refuted) + synthesis.

## Kết luận: NO-GO: F1/F2/F3 sẵn sàng về thiết kế nhưng bị chặn bởi 2 blocker dùng chung — migration drift (prod thiếu toàn bộ bảng) và lỗ hổng audience=INTERNAL rò rỉ tài liệu nội bộ cho client qua search/viewer/email.

Bốn feature có kiến trúc bảo mật tốt và phần lớn nguyên tắc cốt lõi được tôn trọng: search là PRE-FILTER thật (searchReportIds chỉ rank, caller AND-intersect với visibleWhere/{status:PUBLISHED}, facet chỉ thu hẹp), notify đi qua đúng entitlement gate với idempotency ledger @@unique, attachments re-check auth+freshness+canViewReport+audience trên MỖI request download và rollback blob mồ côi. TUY NHIÊN cả gói bị chặn release bởi HAI blocker dùng chung đã được xác minh trực tiếp trên source. (1) MIGRATION DRIFT (xác nhận): prisma/migrations/ chỉ có 6 migration cũ, kết thúc ở 20260618092813_report_sha256_unique; KHÔNG migration nào tạo Symbol/ReportSymbol/WatchlistItem/ReportNotification/ReportAttachment, các cột mới của Report/User, hay contentTsv+GIN. Schema dev chỉ tồn tại qua `prisma db push` thủ công + `psql -f report-fts.sql`. Trên prod `migrate deploy` sẽ tạo DB thiếu bảng → mọi truy vấn F1-F3 ném lỗi relation/column does not exist → 500. CI XANH GIẢ (58/58) vì test mock toàn bộ Prisma và không có integration test chạm DB thật. (2) AUDIENCE LEAK (xác nhận): visibleWhere() tại authz.ts:41-51 chỉ lọc status + accessLevel/entitlements, KHÔNG có điều kiện audience nào — đúng cái filter mà chính comment dòng 39 dự liệu là 'phải mirror'. Hệ quả: report audience=INTERNAL + accessLevel=PUBLIC + PUBLISHED lọt vào search (authz.ts:249), viewer/PDF/list, VÀ email watchlist (listWatchersToNotify cũng không lọc audience) cho client. F3 lọc audience đúng ở từng attachment nhưng gate report phía trên thủng nên PDF nội bộ + attachment CLIENT trên report đó vẫn lộ. Ngoài blocker: F1 không trích contentText ở đường upload prod (FTS chỉ chạy trên 5.7k report ingest); KHÔNG có UI/admin tag ticker nên report upload-tay mồ côi khỏi Symbol axis → F1 facet-by-ticker và toàn bộ F2 inert; notify await đồng bộ chặn publish; F4 chưa build (đúng spec). Fix cho cả hai blocker đều khả thi nhanh: một migration bao trùm + nhúng report-fts.sql, và thêm `audience:'CLIENT'` vào một chỗ duy nhất visibleWhere() (tự lan sang search/viewer/download) cộng mirror vào listWatchersToNotify.

### Trạng thái từng feature

| Feature | Điểm | Trạng thái | Nhận định |
|---|:--:|:--:|---|
| F1 — Full-text search & facets | 52 | partial | Intersect-gate thiết kế đúng và không SQL-injection, nhưng audience=INTERNAL lọt vào kết quả, đường upload prod không điền contentText (FTS rỗng với report admin tải lên), và không migration nào tạo contentTsv/GIN. |
| F2 — Watchlist + email-on-publish | 62 | mostly-done | CRUD idempotent + notifier seam + unsubscribe token tốt, nhưng notify fan-out không lọc audience (email report INTERNAL cho client), bảng F2 không có migration, và notify await đồng bộ chặn publish. |
| F3 — Excel/Word attachments | 72 | mostly-done | Feature an toàn nhất: per-attachment gate + audience re-check khi download + rollback blob; chặn bởi migration drift bảng ReportAttachment và gate report phía trên thiếu lọc audience làm lộ PDF/attachment INTERNAL. |
| F4 — Prop indicators | 0 | not-started | Chưa build đúng như spec (BLOCKED chờ external API); khi unblock bắt buộc proxy server-side do CSP connect-src 'self', khóa secret + rate-limit + data-localization giá. |
| Foundation — Symbol/tagging + migrations + flags | 52 | partial | Schema spine (unique/cascade/index) tốt nhưng migration drift + audience không lọc trong read/search/notify là 2 blocker; thiếu UI tag ticker khiến F1/F2 inert; WATERMARK mặc định OFF. |

### 🔐 Security verdict

> LEAK — KHÔNG bảo toàn INTERNAL-audience separation. Entitlement isolation theo accessLevel/group được giữ đúng và lockstep ở phần đó (search là pre-filter thật, facet chỉ thu hẹp, notify không vượt entitlement accessLevel, attachment re-check mỗi download), KHÔNG có SQL injection, và rò rỉ-toàn-tập khi FTS rỗng được chặn đúng. NHƯNG trục audience bị thủng xuyên suốt: visibleWhere() (authz.ts:41-51, đã xác minh) không lọc audience nên report INTERNAL+PUBLIC+PUBLISHED lộ qua search + viewer + PDF + list cho client, và listWatchersToNotify (authz.ts:76-104) cũng không lọc audience nên email gửi report nội bộ ra ngoài. F3 chặn được attachment INTERNAL ở tầng attachment nhưng không cứu được tài liệu report tổng thể vì gate report phía trên thủng. Đây là leak confirmed (single-point fix), không phải lý thuyết. Phải bịt audience trước khi release; lockstep hand-mirrored visibleWhere↔listWatchersToNotify cũng cần một integration test bất biến (mọi recipient phải pass canViewReport) để chống drift tương lai.

---

## 🚧 Ship-blockers (đã verify)

**1. [CRITICAL] Migration drift: không Prisma migration nào tạo bảng/cột của 4 feature → prod thiếu bảng, CI false-green** _(Foundation (F1/F2/F3))_
> Đã xác minh: prisma/migrations/ chỉ có 6 migration cũ kết thúc ở 20260618092813_report_sha256_unique; không có DDL cho Symbol/ReportSymbol/WatchlistItem/ReportNotification/ReportAttachment, các cột mới Report/User, hay contentTsv/GIN. Prod `migrate deploy` tạo DB thiếu bảng → mọi truy vấn search/watchlist/attachment/notify ném relation/column does not exist → 500. CI xanh giả vì test mock toàn bộ Prisma, không có integration test DB thật. Chặn release cả F1, F2, F3.

**2. [CRITICAL] audience=INTERNAL không được lọc trong visibleWhere/search/notify → report nội bộ rò rỉ cho client** _(Foundation (F1/F2/F3))_
> Đã xác minh tại authz.ts:41-51: visibleWhere() chỉ lọc status + accessLevel/entitlements, không có điều kiện audience (comment dòng 39 còn dự liệu filter này nhưng chưa thêm). Report audience=INTERNAL + accessLevel=PUBLIC + PUBLISHED lọt vào search (authz.ts:249), viewer/PDF/list và email watchlist (listWatchersToNotify:76-104 cũng không lọc audience). Vi phạm trực tiếp invariant 'INTERNAL = staff-only forever'; rò rỉ research nội bộ + PII ra ngoài territory qua email. F3 per-attachment gate đúng nhưng gate report phía trên thủng nên PDF + attachment CLIENT trên report nội bộ vẫn lộ.

**3. [HIGH] Đường upload production không trích contentText → FTS không khớp gì với report admin tải lên** _(F1)_
> createReportFromPdf không trích PDF text; chỉ scripts/ingest.ts điền contentText cho 5.7k report ingest. Mọi report nghiệp vụ tải lên qua admin sẽ KHÔNG bao giờ xuất hiện trong full-text search — người dùng gõ nội dung trong PDF mới thấy 0 kết quả. F1 'cỗ máy' chỉ hoạt động trên corpus ingest cục bộ.

**4. [HIGH] Không có UI/admin tag ticker cho report → F1 facet-by-ticker và toàn bộ F2 inert với report upload-tay** _(Foundation (F1/F2))_
> Chỉ scripts/ingest.ts gắn symbol (hard-code 1 primary/report). Report tạo qua luồng upload thường không có symbol nào → không xuất hiện trong search theo ticker, không bao giờ trigger watchlist email (notifier return sớm khi symbolIds rỗng). Enum audit REPORT_TAG_ADD/REMOVE đã có nhưng chưa bao giờ được phát. F1/F2 chỉ thực sự sống với report ingest.

---

## Lộ trình vá

### P0
- **(M)** Tạo MỘT Prisma migration bao trùm toàn bộ schema 4-feature (enum Audience; cột Report.audience/reportType/recommendation/tier/contentText + cột User.watchlistEmails/unsubscribeToken; bảng Symbol/ReportSymbol/WatchlistItem/ReportNotification/ReportAttachment) rồi APPEND nội dung prisma/sql/report-fts.sql (CREATE EXTENSION/f_unaccent/contentTsv GENERATED/GIN, IF NOT EXISTS) vào cuối migration.sql để migrate deploy tạo đầy đủ trên prod. _(Foundation)_
- **(S)** Thêm `audience: 'CLIENT'` (hoặc `{ not: 'INTERNAL' }`) vào nhánh non-staff của visibleWhere() tại authz.ts — một chỗ tự lan sang search/viewer/PDF/download/countVisibleReports; đồng thời mirror điều kiện loại INTERNAL vào listWatchersToNotify() và short-circuit notifier khi report.audience==='INTERNAL'. _(Foundation)_

### P1
- **(M)** Thêm integration test chạm Postgres thật trong CI: (a) khẳng định contentTsv+GIN tồn tại sau migrate deploy và search hoạt động; (b) bất biến audience/entitlement — client không thấy INTERNAL/RESTRICTED ngoài quyền trong searchReports, mọi recipient của listWatchersToNotify pass canViewReport. Bịt false-green do mock DB. _(Foundation)_
- **(M)** Trích PDF text trong createReportFromPdf (tái dùng logic pdfjs của scripts/ingest.ts, cắt ~40k ký tự) ghi vào Report.contentText khi tạo/finalize; thêm job backfill cho report đã tạo để FTS khớp report admin tải lên. _(F1)_
- **(M)** Thêm admin server action tagReportSymbol/untagReportSymbol (RBAC EDITOR+) + UI chọn ticker trong trang sửa report (cho nhiều symbol + isPrimary), phát logAudit REPORT_TAG_ADD/REMOVE; wire vào upload finalize để gợi ý ticker — kích hoạt F1 facet và F2 cho report upload-tay. _(Foundation)_

### P2
- **(M)** Chuyển notify publish sang non-blocking: bọc trong next/after (unstable_after) hoặc đẩy queue để publish trả về ngay sau commit; giữ try/catch + idempotency ledger. Tối thiểu Promise.allSettled theo batch song song. _(F2)_
- **(M)** Đảo WATERMARK_ENABLED sang fail-safe ON ở production (default true trừ khi env==='false'); thêm deploy-checklist bắt buộc. Xác nhận data-localization với phía host: trên Vercel attachment (STORAGE_ROOT filesystem) là ephemeral + ngoài VN — cần driver S3/in-VN trước khi dùng thật; rà PDPD Decree 13 cho email egress + default watchlistEmails opt-out ON. _(Foundation/F3/F2)_
- **(M)** Đọc body upload qua stream đếm byte và abort khi vượt MAX_BODY_BYTES thay vì tin content-length (guard hiện bypass được bằng chunked transfer-encoding → buffer toàn bộ vào RAM, không còn nginx trên Vercel để chặn). _(F3)_

### P3
- **(M)** Phân trang cho nhánh FTS (slice rankOrder theo cursor/offset trước findMany, fetch ~24 id thay vì hydrate tới 400 rồi vứt 376); làm sâu phòng thủ macro (giải nén OOXML + parse OLE storage, nối AV/ClamAV); mask email trên trang unsubscribe public. _(F1/F3/F2)_

---

## Chi tiết theo feature

### F1 — Full-text search & facets — 52/100 (partial)

Kiến trúc tìm kiếm được thiết kế đúng và an toàn về mặt lý thuyết: searchReportIds() (src/lib/search.ts) chỉ trả về ID đã rank, KHÔNG áp entitlement; caller searchReports() (src/lib/authz.ts:227-263) AND-intersect các ID đó với visibleWhere(userId) cho client / {status:PUBLISHED} cho staff, và mọi facet (reportType/recommendation/tier/symbol) đều được push vào mảng `and` nên CHỈ có thể thu hẹp, không thể nới rộng visibility. Truy vấn FTS dùng tham số hoá Prisma ($queryRaw tagged-template + Prisma ticker filter) nên không có SQL injection. NHƯNG có 3 lỗ hổng nghiêm trọng làm tính năng vừa KHÔNG an toàn vừa KHÔNG hoạt động trên dữ liệu thật: (1) visibleWhere() KHÔNG lọc audience=INTERNAL — một báo cáo INTERNAL+PUBLIC+PUBLISHED bị lộ cho client qua cả search lẫn viewer; (2) đường upload thật (createReportFromPdf) KHÔNG trích xuất contentText nên FTS không khớp gì với báo cáo do admin tải lên — chỉ script ingest CLI mới điền contentText; (3) migration drift: không có migration nào tạo các cột/bảng F1 và CI không chạy report-fts.sql nên contentTsv/GIN không tồn tại ở CI/prod.

**Điểm tốt:** searchReportIds() (src/lib/search.ts:15-26) tách bạch đúng: chỉ rank, không gate; comment ghi rõ caller phải intersect — đúng nguyên tắc 'pre-filter, never a second visibility path' · searchReports() (src/lib/authz.ts:248-263) đặt visibleWhere(userId)/{status:PUBLISHED} làm phần tử ĐẦU TIÊN của mảng `and`; mọi facet và FTS-id-list đều AND vào sau → entitlement luôn được áp, facet không thể nới rộng · FTS rỗng được xử lý đúng: khi rankOrder rỗng, push {id:{in:['__no_match__']}} (authz.ts:261) nên không rò rỉ toàn bộ tập · Facet được đếm groupBy TRÊN CÙNG `where` đã gate (authz.ts:266-270) nên số đếm facet cũng tôn trọng entitlement, không lộ tồn tại báo cáo ngoài quyền · Truy vấn FTS tham số hoá an toàn: $queryRaw tagged-template với ${term}/${limit} (search.ts:18-24) và ticker filter qua Prisma (authz.ts:254) → không SQL injection · Hiệu năng FTS đúng thiết kế: stored generated column contentTsv + GIN (prisma/sql/report-fts.sql:24-30), f_unaccent IMMUTABLE để diacritic-insensitive; ts_rank đọc vector đã lưu, không recompute · Đường empty-q + facets-only chạy nhánh keyset pagination chuẩn (publishedAt, id) với cursor + take+1 (authz.ts:273-279, 287-291), vẫn qua gate · UI (library-grid.tsx): debounce 350ms (dòng 70-76), reset cursor khi đổi filter (dòng 54), empty/loading state, ticker chips toggle symbol facet, capped badge ('400+') · scripts/ingest.ts:189-225 thực sự trích xuất PDF text (pdfjs, cắt 40k ký tự) và ghi contentText cho 5.7k báo cáo đã ingest — nên FTS hoạt động trên corpus đã ingest

<details><summary><strong>F1-SEC-01 · 🔴 CRITICAL — ✅ confirmed</strong> · security — audience=INTERNAL KHÔNG bị loại khỏi search/library/viewer cho client — báo cáo nội bộ bị lộ</summary>

- 📌 visibleWhere() (src/lib/authz.ts:41-51) chỉ lọc status=PUBLISHED + (PUBLIC ∪ entitlement); KHÔNG có điều kiện `audience`. searchReports() (authz.ts:249) và listVisibleReports() (authz.ts:155-157) dùng đúng gate đó. getReportBySlug→canViewReport (src/server/reports.ts:31, authz.ts:30-34) cũng vậy. audience chỉ được enforce cho ATTACHMENT (src/server/attachments.ts:22; api/reports/[id]/attachments/[attachmentId]/route.ts:59), KHÔNG cho thân báo cáo. Schema (prisma/schema.prisma:269) ghi 'INTERNAL = staff-only forever' nhưng không gì enforce.
- 💥 Một báo cáo audience=INTERNAL + accessLevel=PUBLIC + status=PUBLISHED hiển thị trong thư viện client, trả về trong kết quả FTS, và mở được trực tiếp qua /reports/[slug] bởi mọi client. Đây chính xác là kịch bản nguy hiểm mà invariant #2 cảnh báo (INTERNAL + PUBLIC-accessLevel). Rò rỉ tài liệu nghiên cứu nội bộ cho khách — vi phạm bảo mật cốt lõi của portal.
- 🔧 Thêm `audience: { not: 'INTERNAL' }` (hoặc `audience: 'CLIENT'`) vào nhánh non-staff của visibleWhere() — một chỗ duy nhất sẽ tự lan tới searchReports, listVisibleReports và canViewReport. Đồng thời mirror vào listWatchersToNotify() để giữ LOCKSTEP (F2). Thêm test khẳng định client không thấy INTERNAL. _(effort S)_
- 🔎 Claim đúng hoàn toàn, đã trace từng path. visibleWhere() (src/lib/authz.ts:41-51) CHỈ lọc status=PUBLISHED + OR[accessLevel=PUBLIC, group→report, group→category] — KHÔNG có điều kiện audience. Đây là cổng duy nhất cho thân báo cáo và được dùng bởi: searchReports() (authz.ts:249), listVisibleReports() (authz.ts:155-157), countVisibleReportsBySymbols (authz.ts:124), và canViewReport (authz.ts:30-34) — mà getReportBySlug (src/server/reports.ts:31) → page viewer (page.tsx:37-41) gọi. Grep toàn repo xác nhận: ngoài file attachment và comment văn xuôi, Report.audience CHỈ xuất hiện ở schema.prisma:269 (định nghĩa field, comment 'INTERNAL = staff-only forever') và authz.ts:39 (chỉ là comment giả định trong docstring, KHÔNG phải code). audience CHỈ được enforce cho attachment: src/server/attachments.ts:22 (client → where audience=CLIENT) và download route. Thân báo cáo KHÔNG có lọc INTERNAL ở bất kỳ đâu — page.tsx:61-62 tự thừa nhận audience gate chỉ áp cho từng file đính kèm. Enum xác nhận Audience.INTERNAL (schema:96-99) và AccessLevel.PUBLIC (schema:51-54) đều tồn tại, nên báo cáo audience=INTERNAL + accessLevel=PUBLIC + status=PUBLISHED qua được nhánh {accessLevel:PUBLIC} (authz.ts:46). Không có write-path nào ràng buộc audience với accessLevel/status: report-actions.ts (publish) không hề tham chiếu audience; scripts/ingest.ts là nơi duy nhất set audience — nên tổ hợp nguy hiểm này hoàn toàn dựng được. Hệ quả: báo cáo nội bộ lộ qua thư viện client (listVisibleReports), kết quả FTS (searchReports — searchReportIds tại src/lib/search.ts cố ý không gate, intersect bằng visibleWhere vốn thiếu audience nên không vá được), VÀ mở trực tiếp /reports/[slug]. Đúng kịch bản invariant #2. Severity critical phù hợp: với portal security-first mà giá trị cốt lõi là nghiên cứu nội bộ KHÔNG BAO GIỜ tới khách, đây là rò rỉ bảo mật cốt lõi, không phụ thuộc flag nào và không cần auth bypass — chỉ cần dữ liệu ở trạng thái hợp lệ.

</details>

<details><summary><strong>F1-COR-01 · 🟠 HIGH — ✅ confirmed</strong> · correctness — Đường upload production KHÔNG điền contentText → FTS không khớp gì với báo cáo do admin tải lên</summary>

- 📌 createReportFromPdf() (src/lib/report-create.ts:96-110) tạo Report KHÔNG có trường contentText và KHÔNG có bước trích xuất PDF text; chỉ ghi pageCount. finalize (src/lib/upload-session.ts:286-306) gọi createReportFromPdf nhưng cũng không trích text. grep 'contentText' chỉ trúng scripts/ingest.ts:225 (CLI cục bộ). Vậy mọi báo cáo qua UI admin có contentText=null → contentTsv rỗng (report-fts.sql:26 coalesce '') → @@ query không bao giờ khớp.
- 💥 Toàn bộ 'cỗ máy' FTS chỉ hoạt động trên 5.7k báo cáo ingest cục bộ; mọi báo cáo nghiệp vụ tải lên qua admin sẽ KHÔNG bao giờ xuất hiện trong tìm kiếm full-text (chỉ tìm được qua title/summary ở listVisibleReports, vốn không phải đường F1). Người dùng gõ nội dung trong PDF mới tải sẽ thấy 0 kết quả.
- 🔧 Trong createReportFromPdf (hoặc finalize), trích PDF text (tái dùng logic extract của scripts/ingest.ts với pdfjs/pdf.mjs) và ghi vào contentText khi tạo Report; hoặc thêm job backfill. Cân nhắc trích cả khi publish nếu draft chưa có. _(effort M)_
- 🔎 Claim ĐÚNG hoàn toàn, đã trace từng mắt xích.

1) createReportFromPdf() (src/lib/report-create.ts:58-110): object data: của tx.report.create CHỈ có slug, categoryId, status, accessLevel, publishedAt, fileKey, fileSize, fileSha256, pageCount, uploadedById — KHÔNG có contentText và KHÔNG có bước trích PDF text. contentText là String? @db.Text (schema.prisma:273), không default → mặc định null.

2) finalizeUpload() (src/lib/upload-session.ts:195-306) là đường upload production duy nhất (wired từ api/admin/uploads/[id]/route.ts:67). Nó load PDF bằng pdf-lib CHỈ để đếm pageCount (line 274), rồi gọi createReportFromPdf (line 288) — không hề trích text. Không có worker/queue backfill (grep contentText/extract/to_tsvector trên src/server + src/app/api ra rỗng).

3) contentText được GHI đúng 1 chỗ: scripts/ingest.ts:225 (CLI cục bộ). Thư viện PDF text duy nhất trong src/ là pdfjs-dist tại pdf-viewer.tsx (render phía client, không phải extract-to-DB).

4) Hệ quả FTS: contentTsv = GENERATED ALWAYS AS to_tsvector('simple', f_unaccent(coalesce(contentText,''))) STORED (report-fts.sql:26). contentText=null → coalesce '' → tsvector rỗng. searchReportIds() (search.ts:21-22) chạy WHERE r."contentTsv" @@ query; tsvector rỗng không khớp query nào. searchReports() (authz.ts:259-261) lấy rankOrder từ searchReportIds rồi intersect id IN — nên mọi báo cáo upload qua admin có contentText=null sẽ KHÔNG bao giờ xuất hiện trong kết quả FTS. Cỗ máy FTS chỉ chạy trên ~5.7k báo cáo ingest CLI.

Ghi chú phụ: comment schema (line 271-272) nói contentText 'Populated at ingest/finalize' nhưng finalize KHÔNG điền — comment sai/gây hiểu nhầm, càng khẳng định gap.

Severity: giữ HIGH. Đây là defect tính-năng/đúng-đắn nghiêm trọng (cơ chế lõi của F1 vô dụng với toàn bộ dữ liệu nghiệp vụ tải qua admin), KHÔNG phải lỗ hổng bảo mật/rò rỉ entitlement — gate intersect vẫn nguyên vẹn nên không phải critical.

</details>

<details><summary><strong>F1-DEP-01 · 🟠 HIGH — ✅ confirmed</strong> · deploy/migration — Migration drift: không có migration tạo các cột/bảng F1; CI/prod migrate deploy tạo schema THIẾU contentTsv + FTS</summary>

- 📌 prisma/migrations/ kết thúc ở 20260618092813_report_sha256_unique (ls migrations) — không migration nào thêm reportType/recommendation/tier/audience/contentText hay Symbol/ReportSymbol. contentTsv + GIN chỉ nằm trong prisma/sql/report-fts.sql (áp bằng psql -f thủ công). CI (.github/workflows/ci.yml:57-58) chạy `prisma migrate deploy` trên Postgres ephemeral nhưng KHÔNG có bước psql -f report-fts.sql → cột contentTsv và index report_contenttsv_gin không tồn tại ở CI. Comment trong report-fts.sql:10 nói 'prod dùng migration bọc SQL này' nhưng migration đó KHÔNG tồn tại.
- 💥 Trên DB prod sạch, `migrate deploy` tạo schema thiếu contentTsv/GIN (và nếu schema được build từ migrations thì thiếu cả các cột mới) → searchReportIds() query @@ r.contentTsv sẽ lỗi 'column does not exist' → crash trang tìm kiếm/thư viện. CI không phát hiện vì test unit mock prisma (xem F1-TEST-01), nên drift bị che.
- 🔧 Tạo một Prisma migration thật cho toàn bộ thay đổi schema F1 + nhúng nội dung report-fts.sql (CREATE EXTENSION/f_unaccent/ALTER ADD contentTsv/GIN) vào migration đó, để migrate deploy tạo đầy đủ. Thêm bước áp FTS SQL trong CI để CI khớp prod. _(effort M)_
- 🔎 Claim xác nhận đầy đủ qua đọc code thực tế. (1) prisma/migrations/ kết thúc ở 20260618092813_report_sha256_unique — migration cuối CHỈ swap unique index trên fileSha256; không migration nào tạo Symbol/ReportSymbol/WatchlistItem/ReportNotification/ReportAttachment hay thêm cột reportType/recommendation/tier/audience/contentText/contentTsv (grep CREATE TABLE/ADD COLUMN/CREATE TYPE qua TẤT CẢ migrations = ZERO; init migration's "Report" không có các cột này). (2) contentTsv + GIN + f_unaccent CHỈ tồn tại trong prisma/sql/report-fts.sql, áp bằng psql -f thủ công; comment report-fts.sql:10 nói "prod dùng migration bọc SQL này" nhưng grep tsvector/GENERATED ALWAYS/GIN/f_unaccent/report-fts qua mọi migration = KHÔNG có — migration bọc đó KHÔNG tồn tại (lời nói dối tài liệu). (3) .github/workflows/ci.yml chạy `prisma migrate deploy` trên Postgres ephemeral nhưng KHÔNG có bước psql -f report-fts.sql → DB CI thiếu contentTsv + report_contenttsv_gin VÀ thiếu mọi bảng/cột 4-feature. (4) src/lib/search.ts:18-24 query `r."contentTsv" @@ query` + ts_rank + f_unaccent → trên DB build thuần từ migrations sẽ ném 'column/function does not exist' → crash trang search/library. (5) CI vẫn GREEN vì typecheck/test/build không bao giờ chạy SQL thật: watchers.test.ts:6 & notifier.test.ts:23 mock @/lib/prisma và @/lib/search → drift bị che đúng như claim mô tả. NUANCE về severity (không hạ verdict): prod chạy trên Vercel, build script chỉ là `next build` (không vercel.json, không postinstall migrate), và memory note xác nhận schema thực tế được áp bằng `prisma db push --accept-data-loss` (drop contentTsv mỗi lần) — nên cơ chế "prod migrate deploy crash" theo nghĩa đen CHƯA nằm trong Vercel build path hiện tại; tuy nhiên migration history đã thực sự mồ côi (drift thật, không phải đọc nhầm), nên BẤT KỲ môi trường mới / DR rebuild / CI nào dùng migrate deploy đều tạo schema thiếu toàn bộ 4-feature → crash. Finding giữ nguyên HIGH: confirmed.

</details>

<details><summary><strong>F1-COR-02 · 🟡 MEDIUM</strong> · deploy/migration — contentTsv là generated column NGOÀI schema.prisma — `prisma db push` sẽ DROP cột → mất index FTS</summary>

- 📌 prisma/sql/report-fts.sql:8-10 tự cảnh báo: contentTsv cố tình không nằm trong schema.prisma, và 'prisma db push drops columns it doesn't know about, so re-run this file after any push'. Đường dev/local dùng db push (memory: local-dev) → mỗi lần push xong phải nhớ chạy lại psql -f, nếu quên thì FTS lặng lẽ chết.
- 💥 Quy trình mong manh: bất kỳ db push nào (dev hoặc thao tác vận hành) âm thầm xoá contentTsv + GIN, khiến searchReportIds lỗi cột-không-tồn-tại cho tới khi ai đó chạy lại SQL. Không có cơ chế tự phát hiện.
- 🔧 Đưa contentTsv vào quy trình migration (xem F1-DEP-01) thay vì SQL rời; nếu buộc giữ ngoài schema, thêm health-check/test khẳng định cột + index tồn tại lúc khởi động. _(effort S)_

</details>

<details><summary><strong>F1-UX-01 · 🟡 MEDIUM</strong> · completeness — Tìm full-text (q) bị giới hạn 400 kết quả và KHÔNG có phân trang — kết quả thứ 401+ không bao giờ truy cập được</summary>

- 📌 FTS_LIMIT=400 (authz.ts:246); searchReportIds(term, 400) (authz.ts:259); nhánh có term gọi findMany không cursor (authz.ts:272) rồi sort theo rank và slice(0, take=24) (authz.ts:286). nextCursor chỉ được set ở nhánh KHÔNG-term (authz.ts:290). UI ẩn nút loadMore khi có q: `{nextCursor && !params.q}` (library-grid.tsx:198).
- 💥 Khi tìm full-text, người dùng chỉ xem được 24 kết quả top-rank đầu; không có cách tải thêm. Với term phổ biến (capped='400+'), 376 báo cáo khớp còn lại không thể tiếp cận qua UI. Khác hẳn đường duyệt (không q) vốn có 'Tải thêm'. Hạn chế trải nghiệm tìm kiếm cốt lõi.
- 🔧 Phân trang cho nhánh FTS: hoặc giữ rankOrder đầy đủ và slice theo offset/cursor trên mảng id đã rank, hoặc chuyển sang trả thêm trang ID từ search index. Tối thiểu hiển thị thông báo 'tinh chỉnh từ khoá' khi capped. _(effort M)_

</details>

<details><summary><strong>F1-TEST-01 · 🟡 MEDIUM</strong> · quality — Không có test nào cho searchReports/intersect/audience — các invariant bảo mật F1 hoàn toàn không được kiểm thử</summary>

- 📌 src/lib/__tests__/ không có search/searchReports test (chỉ watchers.test.ts test listWatchersToNotify, và mock prisma hoàn toàn: vi.mock('@/lib/prisma') watchers.test.ts:6). Không có test khẳng định FTS-id list được AND với visibleWhere, rằng facet không nới rộng, hay rằng INTERNAL bị loại. CI test là unit thuần (ci.yml comment 'ready for FUTURE DB-integration tests').
- 💥 Các bất biến bảo mật quan trọng nhất của F1 (intersect áp đúng, audience loại trừ, contentTsv tồn tại) không có lưới an toàn hồi quy. F1-SEC-01 và F1-DEP-01 lẽ ra đã bị bắt nếu có test tích hợp DB.
- 🔧 Thêm test tích hợp (Postgres ephemeral đã có sẵn trong CI) cho searchReports: client không thấy RESTRICTED ngoài quyền, không thấy INTERNAL, facet chỉ thu hẹp, và contentTsv/GIN tồn tại sau khi áp report-fts.sql. _(effort M)_

</details>

<details><summary><strong>F1-PERF-01 · ⚪ LOW</strong> · performance — Nhánh FTS nạp toàn bộ tới 400 hàng kèm include nặng rồi mới slice 24 trong app</summary>

- 📌 Khi có term, findMany chạy không take (authz.ts:272) với include {translations, symbols:{include:{symbol}}} cho TẤT CẢ id khớp (tối đa 400), rồi sort theo rank + slice(0,24) trong JS (authz.ts:286). 3 groupBy facet + count cũng chạy trên cùng tập (authz.ts:266-270).
- 💥 Mỗi truy vấn full-text có thể hydrate 400 báo cáo + translations + symbols rồi vứt 376. Lãng phí I/O/bộ nhớ; chấp nhận được ở quy mô hiện tại nhưng xấu khi corpus/đồng thời tăng.
- 🔧 Slice rankOrder xuống trang hiện tại TRƯỚC khi findMany (chỉ fetch ~24 id theo thứ tự rank đã cần), tách count/facet ra truy vấn riêng. Gắn với việc phân trang FTS (F1-UX-01). _(effort M)_

</details>

**Gap vs spec:**
- Spec yêu cầu FTS 'MUST intersect với entitlement gate, never bypass': intersect ĐÚNG cho cả client (visibleWhere) lẫn staff ({status:PUBLISHED}) — đạt; nhưng gate THIẾU lọc audience=INTERNAL nên một lớp tài liệu nội bộ vẫn lọt (F1-SEC-01)
- Spec: FTS over Report.contentText (extracted PDF text): chỉ script ingest CLI điền contentText; đường upload production không trích text → FTS rỗng cho báo cáo nghiệp vụ (F1-COR-02 thực chất là F1-COR-01)
- Facets ticker/reportType/recommendation/date: có reportType/recommendation/tier/symbol; KHÔNG có facet 'date'/khoảng ngày như spec nêu (chỉ sort theo publishedAt). Symbol là filter chip, không phải facet-có-đếm.
- Facet/symbol filter cho báo cáo upload sẽ luôn rỗng vì createReportFromPdf không set reportType/recommendation/tier/symbols (report-create.ts) — chỉ báo cáo ingest CLI mới có taxonomy.
- Migration cho toàn bộ model F1 (Symbol, ReportSymbol, các cột mới, contentTsv) chưa tồn tại → migrate deploy ở prod tạo schema thiếu (F1-DEP-01); spec/comment giả định có migration bọc report-fts.sql nhưng không có.
- Phân trang cho kết quả full-text chưa có (cap cứng 400, không loadMore khi có q) — F1-UX-01.

---

### F2 — Watchlist + email-on-publish — 62/100 (mostly-done)

F2 đã được hiện thực gần đủ và kiến trúc tốt: watchlist CRUD (setWatch idempotent + requireFreshUser), Notifier seam tách bạch, listWatchersToNotify là pre-filter entitlement, ReportNotification @@unique làm idempotency, unsubscribe token ngẫu nhiên 32-byte + POST-only. Tuy nhiên CÓ MỘT LỖ HỔNG BẢO MẬT NGHIÊM TRỌNG xuyên suốt invariant #2: audience=INTERNAL KHÔNG được lọc ở BẤT KỲ ĐÂU trong đường visibility/notify của client — một report INTERNAL + accessLevel=PUBLIC sẽ vừa hiển thị cho client (getReportBySlug/search) vừa gửi email cho mọi watcher, vi phạm "INTERNAL = staff-only forever". Hai blocker khác: (1) migration drift — KHÔNG có migration nào tạo các bảng F2 nên prisma migrate deploy ở prod tạo DB thiếu bảng → mọi truy vấn F2 crash, trong khi CI vẫn xanh vì test mock Prisma; (2) notify đồng bộ (await trong server action) — chặn response publish theo N watcher, không phải non-blocking thật. Ngoài ra opt-out mặc định ON (watchlistEmails=true) đặt ra câu hỏi PDPD Decree 13 về consent.

**Điểm tốt:** Watchlist CRUD: setWatch (watchlist-actions.ts:22) idempotent (upsert/deleteMany), validate Zod cuid, dùng requireFreshUser (chống tài khoản bị treo mutate trong cửa sổ JWT), revalidate đúng path · UI add-picker client-filtered tức thời trên catalogue symbol đã preload (watchlist-manager.tsx:64), có ARIA combobox/listbox, outside-click/Escape, per-row remove — UX gọn · Recipient selection đi qua listWatchersToNotify (authz.ts:69) — pre-filter entitlement, KHÔNG phải con đường visibility thứ hai; nhánh staff-bypass dùng STAFF_ROLES khớp đúng isStaff (cả hai từ permissions.STAFF = [SUPER_ADMIN,EDITOR,APPROVER]) nên lockstep ở phần accessLevel/entitlement/staff là chính xác · Idempotency/dedup: ReportNotification @@unique([reportId,userId,channel]) (schema:510) + notifications:{none:...} pre-filter + catch P2002 (notifier.ts:82) — hợp đồng AT-LEAST-ONCE ghi rõ, ghi row SAU khi gửi thành công nên send fail sẽ retry ở republish, không double-record · Notify failure KHÔNG abort publish: bọc try/catch tại report-actions.ts:94-100, và publish đã commit qua updateMany trước đó (dòng 66-69) nên email lỗi không rollback trạng thái · Flag watchlistEmailsEnabled DEFAULT OFF (flags.ts:24) — chặn gửi mail bất ngờ trên staging/preview dù có SMTP thật; watchlist rows vẫn ghi · Unsubscribe token = randomBytes(32).base64url (unsubscribe.ts:21) không đoán được, @unique, mint lazy atomic (updateMany where unsubscribeToken:null chống race), stable để link luôn dùng được; opt-out là POST (form confirm) không phải GET nên link-scanner prefetch không tự hủy đăng ký (page.tsx:7 + unsubscribe-actions.ts:11) · countVisibleReportsBySymbols (authz.ts:116) đếm report qua đúng visibleWhere gate nên số liệu watchlist không lộ report client không được xem · Test coverage tốt cho orchestration notifier + shape WHERE của listWatchersToNotify (notifier.test.ts, watchers.test.ts)

<details><summary><strong>F2-1 · 🔴 CRITICAL — 🔧 adjusted → **HIGH**</strong> · security — audience=INTERNAL KHÔNG được lọc — report INTERNAL+PUBLIC email cho client và lộ trong viewer/search</summary>

- 📌 visibleWhere() (authz.ts:41-51) chỉ lọc status=PUBLISHED + (PUBLIC ∪ entitlement) — KHÔNG hề có điều kiện audience. listWatchersToNotify() (authz.ts:69-108) cũng KHÔNG lọc audience: với report accessLevel=PUBLIC, nhánh entitled={} (dòng 78) → MỌI user APPROVED + watchlistEmails + watching được gửi mail. notifier.ts:29-40 select report KHÔNG đọc audience và không kiểm tra. Schema ghi rõ audience INTERNAL = 'staff-only forever' (schema.prisma:269) nhưng grep toàn src cho thấy audience chỉ xuất hiện ở pdf-viewer.tsx:82 (prop hiển thị) — KHÔNG ở visibleWhere/searchReports/listWatchersToNotify/getReportBySlug. Vậy một report được tag INTERNAL nhưng accessLevel=PUBLIC khi PUBLISHED sẽ: (a) mở được trong getReportBySlug→canViewReport cho client, (b) hiện trong searchReports, (c) gửi email watchlist cho mọi watcher — đây chính xác là 'INTERNAL + PUBLIC-accessLevel report là mối nguy' nêu trong invariant #2.
- 💥 Rò rỉ báo cáo nội bộ (staff-only) tới client qua cả viewer, full-text search và email egress. PII + nội dung mật phát tán ra ngoài territory qua email. Vi phạm trực tiếp invariant bảo mật cốt lõi của F2/F3.
- 🔧 Thêm audience:'CLIENT' vào visibleWhere() cho nhánh non-staff (single gate, sẽ tự lan sang search + viewer + countVisibleReports). Đồng thời thêm điều kiện loại INTERNAL vào listWatchersToNotify (khi report.audience==='INTERNAL' → chỉ staff, mà staff không có watchlist nên thực tế = [] cho client). Lý tưởng: notifier.notifyReportPublished nên short-circuit khi report.audience==='INTERNAL'. Bổ sung test cho cả hai đường. _(effort S)_
- 🔎 Lỗ hổng cấu trúc CÓ THẬT và đã xác minh đầy đủ: Report.audience KHÔNG được lọc ở BẤT KỲ cổng entitlement nào. visibleWhere() (authz.ts:41-51) chỉ lọc status=PUBLISHED + (PUBLIC ∪ entitlement); canViewReport/getReportBySlug (reports.ts:31), searchReports (authz.ts:227-331) và listWatchersToNotify (authz.ts:69-108) đều mirror đúng predicate đó — không cái nào đọc audience. listWatchersToNotify dòng 77-78: với accessLevel=PUBLIC thì entitled={} → mọi user APPROVED+watchlistEmails+watching được gửi mail, đúng như evidence. notifier.ts:29-41 select report KHÔNG đọc audience, chỉ chặn theo status. State-machine publish (report-transitions.ts + reviewReport report-actions.ts:94) KHÔNG có guard audience → một report INTERNAL có thể lên PUBLISHED. Schema ghi rõ INTERNAL = 'staff-only forever — never published to clients' (schema.prisma:98,269). Nếu tồn tại row audience=INTERNAL + accessLevel=PUBLIC + PUBLISHED thì rò rỉ qua cả viewer, search VÀ email — đúng invariant #2.

NHƯNG claim PHÓNG ĐẠI mức độ khai thác hiện tại nên hạ từ critical→high: KHÔNG có code path nào set Report.audience=INTERNAL. reportMetaSchema (report-create.ts:20-32) bỏ field này (default CLIENT); hai update action duy nhất chỉ ghi status/publishedAt (reviewReport) và accessLevel (setReportAccess) — không ghi audience; KHÔNG có taxonomy-edit action; scripts/ingest.ts:214 hardcode 'CLIENT'. Vậy row nguy hiểm hiện KHÔNG tạo được qua ứng dụng — cần UI tagging tương lai hoặc ghi DB thủ công. Đây là lỗ hổng tiềm ẩn (missing-defense/incomplete-mediation ở cổng cốt lõi) chứ chưa phải leak client-facing đang sống. Lưu ý: audience của ReportAttachment (F3) là field RIÊNG và ĐƯỢC gate đúng (attachments.ts:22, route.ts:59) — không được nhầm lẫn; claim đã đúng khi không dựa vào nó. Khuyến nghị: thêm audience: 'CLIENT' vào visibleWhere() + nhánh entitled của listWatchersToNotify (defense-in-depth) và/hoặc chặn publish report INTERNAL.

</details>

<details><summary><strong>F2-2 · 🔴 CRITICAL — ✅ confirmed</strong> · deploy/migration — Migration drift: không migration nào tạo bảng F2 → prisma migrate deploy ở prod crash mọi truy vấn watchlist/notify</summary>

- 📌 prisma/migrations/ kết thúc ở 20260618092813_report_sha256_unique; grep migrations cho WatchlistItem/ReportNotification/Symbol/ReportSymbol/unsubscribeToken/watchlistEmails/audience → NONE FOUND. CI (.github/workflows/ci.yml:57-64) chạy `prisma migrate deploy` trên Postgres ephemeral (tạo DB ở migration cuối, THIẾU mọi bảng F2) rồi `pnpm test` — test xanh vì notifier.test.ts:23-28 và watchers.test.ts:6-8 MOCK toàn bộ prisma, không truy vấn DB thật. Cùng `migrate deploy` này là đường deploy prod.
- 💥 Prod/preview deploy bằng migrate deploy sẽ có schema thiếu Symbol/WatchlistItem/ReportNotification và cột User.watchlistEmails/unsubscribeToken. Mọi đường F2 (trang /watchlist, setWatch, publish→notifyReportPublished→findUnique{symbols}, listWatchersToNotify→user.findMany, unsubscribe) ném lỗi Prisma runtime. CI GREEN che giấu hoàn toàn vì test mock DB.
- 🔧 Tạo một Prisma migration thật bao trùm toàn bộ schema 4-feature (Symbol, ReportSymbol, WatchlistItem, ReportNotification, ReportAttachment, các cột mới trên Report + User) và wrap report-fts.sql như comment đã hứa. Thêm một test integration tối thiểu chạy trên DB thật của CI để drift kiểu này không lọt. _(effort M)_
- 🔎 Migration drift là THẬT và đúng như claim. prisma/migrations/ kết thúc ở 20260618092813_report_sha256_unique (migration cuối chỉ DROP/CREATE index trên Report.fileSha256); grep toàn bộ migrations cho Symbol/ReportSymbol/WatchlistItem/ReportNotification/unsubscribeToken/watchlistEmails/audience/contentTsv → NONE FOUND. schema.prisma CÓ định nghĩa đủ các model F2 (schema.prisma:423 Symbol, :439 ReportSymbol, :484 WatchlistItem, :500 ReportNotification, :153 User.watchlistEmails, :154 unsubscribeToken) nên prisma generate/typecheck/build PASS — nhưng migrate deploy chỉ replay 6 migration cũ → tạo DB THIẾU mọi bảng/cột F2. report-fts.sql:8-10 thú nhận "prod uses a migration that wraps this SQL" nhưng migration đó KHÔNG tồn tại (grep contentTsv/GENERATED ALWAYS trong migrations/ → NONE).

CI green che giấu hoàn toàn, đúng như evidence: .github/workflows/ci.yml chạy `prisma migrate deploy` (validates migrate deploy) trên Postgres ephemeral rồi `pnpm test`; notifier.test.ts:23-28 và watchers.test.ts:6-8 vi.mock("@/lib/prisma") toàn bộ, và KHÔNG test nào dùng PrismaClient/DATABASE_URL thật (grep → none). Nên test xanh dù DB migrated thiếu bảng.

Runtime crash đã trace thật: listWatchersToNotify (authz.ts:99 prisma.user.findMany với watchlistEmails/watchlistItems/notifications/unsubscribeToken), notifier.ts:29-38 findUnique{symbols}, watchlist.ts:21/30 prisma.symbol/prisma.watchlistItem, unsubscribe.ts:15-31 User.unsubscribeToken — tất cả tham chiếu bảng/cột không tồn tại → Prisma P2021/P2022 runtime.

Giữ severity critical, KHÔNG hạ, vì ngoài /watchlist + setWatch + unsubscribe, reports/[slug]/page.tsx gọi getWatchedSymbolIds() (→ prisma.watchlistItem) trên MỌI lượt xem report — path lõi, lưu lượng cao, KHÔNG flag-gated → sẽ ném lỗi cho client thường.

Hai điểm overstate nhỏ trong claim (không đủ để hạ verdict): (1) đường publish→notify cụ thể KHÔNG crash — notifier.ts:27 return sớm vì watchlistEmailsEnabled() DEFAULT OFF, và report-actions.ts:94-100 bọc try/catch ("notify failure must NEVER fail the publish"); nên liệt kê "publish→notifyReportPublished→findUnique{symbols}" trong danh sách crash là sai một phần — publish tự nó an toàn. (2) Đường deploy prod không được pin trong repo (không có vercel.json; build = next build thuần; không postinstall migrate) — "migrate deploy là đường prod" được suy luận (đúng chắc chắn cho CI). Nếu prod lỡ dùng prisma db push từ schema thì bảng F2 sẽ có (nhưng contentTsv vẫn thiếu → vỡ F1). Khoảng trống chứng cứ nhỏ này không refute drift: drift có thật và CI chứng minh được là KHÔNG thể bắt được.

</details>

<details><summary><strong>F2-3 · 🟠 HIGH — ✅ confirmed</strong> · performance — Notify publish là ĐỒNG BỘ, chặn response server action theo số watcher</summary>

- 📌 report-actions.ts:94-100 `await getNotifier().notifyReportPublished(reportId)` nằm INLINE trong reviewReport. notifier.ts:55-90 lặp tuần tự qua watchers, mỗi vòng `await sendMail` (HTTP POST tới SendGrid, mailer.ts:64) + `await prisma.reportNotification.create`. Không dùng next/after, unstable_after, waitUntil hay queue (grep xác nhận NO after/queue usage; comment dòng 92-93 tự thừa nhận 'Synchronous for now'). Bọc try/catch nên KHÔNG abort publish (tốt) nhưng vẫn block.
- 💥 Với N watcher, publish action chờ N round-trip HTTP+DB tuần tự → APPROVER thấy nút 'phát hành' treo nhiều giây/timeout khi watchlist lớn; trên serverless có giới hạn thời gian hàm, publish có thể timeout sau khi DB đã commit (trạng thái PUBLISHED) — UX 'tưởng lỗi nhưng đã publish'. Đây là 'slow email blocks publish' mà invariant (c) cảnh báo.
- 🔧 Bọc lời gọi notify trong next/after (unstable_after) hoặc đẩy vào hàng đợi job để publish trả về ngay sau commit; giữ try/catch. Tối thiểu chuyển vòng gửi sang song song có giới hạn (Promise.allSettled theo batch) để giảm thời gian chặn. _(effort M)_
- 🔎 Cơ chế đúng y như mô tả, kiểm chứng từng dòng:

1) report-actions.ts:94-100 — trong reviewReport, nhánh `if (decision === "publish")` gọi INLINE `await getNotifier().notifyReportPublished(reportId)`, bọc try/catch. Comment dòng 91-93 tự thừa nhận "Synchronous for now; a queue is the scale path". Quan trọng: updateMany set status=PUBLISHED + publishedAt đã COMMIT ở dòng 66-69 TRƯỚC vòng notify → nếu request chết giữa chừng (timeout), DB đã PUBLISHED nhưng action có vẻ lỗi = đúng hazard "tưởng lỗi nhưng đã publish".

2) notifier.ts:55-90 — `for (const w of watchers)` TUẦN TỰ; mỗi vòng `await sendMail` (notifier.ts:70) rồi `await prisma.reportNotification.create` (notifier.ts:77). Không Promise.all/batch.

3) mailer.ts:64 — sendMail → sendViaSendgridApi → `await fetch("https://api.sendgrid.com/v3/mail/send")`: HTTP POST thật MỖI người nhận.

4) Không có cơ chế bất đồng bộ: grep toàn src/ cho unstable_after / next/after / waitUntil / queue → CHỈ là comment (report-actions.ts:93), KHÔNG có usage thật.

5) listWatchersToNotify (authz.ts:98-107) KHÔNG có `take` → fan-out KHÔNG giới hạn theo số watcher. Vậy N watcher = N round-trip HTTP+DB tuần tự inline, đúng như impact mô tả.

Điều chỉnh severity high→medium vì 2 yếu tố giảm nhẹ (auditor có nêu nhưng chưa cân vào mức độ):
(a) FLAG MẶC ĐỊNH TẮT — notifier.ts:27 `if (!watchlistEmailsEnabled()) return { notified: 0 }` trả về NGAY, 0 query/0 HTTP, khi cờ off (mặc định). Vấn đề CHỈ phát sinh khi WATCHLIST_EMAILS_ENABLED=true ở prod.
(b) try/catch (report-actions.ts:95-99) đảm bảo lỗi notify KHÔNG abort publish; cộng với idempotency @@unique([reportId,userId,channel]) + "record AFTER send" → republish retry sạch, giới hạn thiệt hại.

Đây là lỗi scalability/UX có thật (đặc biệt trên serverless Vercel có giới hạn thời gian hàm), KHÔNG phải lỗi bảo mật/rò rỉ/sai dữ liệu, lại default-OFF và recoverable → medium hợp lý hơn high. Phần claim về cơ chế hoàn toàn chính xác.</adjustedSeverity>

</details>

<details><summary><strong>F2-4 · 🟠 HIGH — 🔧 adjusted → **MEDIUM**</strong> · data-localization — watchlistEmails opt-out mặc định ON (consent ngầm) — rủi ro PDPD Decree 13</summary>

- 📌 schema.prisma:153 `watchlistEmails Boolean @default(true)` — mọi user APPROVED tự động đủ điều kiện nhận email (listWatchersToNotify lọc watchlistEmails:true) ngay khi flag bật, KHÔNG có bước đồng ý gửi email rõ ràng khi đăng ký. PII egress: địa chỉ email người dùng VN được đẩy tới SendGrid (mailer.ts: sendViaSendgridApi, endpoint api.sendgrid.com — máy chủ ngoài lãnh thổ) qua HTTPS. Comment mailer.ts:9 nói prod nên trỏ SMTP về server in-VN nhưng đường SendGrid HTTP API (ưu tiên, mailer.ts:103-108) vẫn gửi PII ra US khi dùng key SendGrid.
- 💥 PDPD (Nghị định 13/2023) yêu cầu cơ sở pháp lý/đồng ý cho xử lý + chuyển dữ liệu cá nhân ra nước ngoài. Opt-in mặc định ON + xuất email qua SendGrid US có thể không thỏa mãn yêu cầu consent + data-localization của một portal 'security-first VN private-wealth'.
- 🔧 Cân nhắc đổi default watchlistEmails sang false (opt-in tường minh) hoặc thêm bước đồng ý lúc đăng ký; với prod dùng nhà cung cấp email in-territory (SMTP VN) thay vì SendGrid HTTP API, hoặc DPA + ghi nhận consent. Ghi audit việc xuất PII. Quyết định với phía pháp lý. _(effort M)_
- 🔎 Mọi dữ kiện kỹ thuật của claim đều ĐÚNG khi đọc code thực tế:

1. schema.prisma:153 — `watchlistEmails Boolean @default(true)`: xác nhận opt-out mặc định ON.
2. KHÔNG có bước đồng ý rõ ràng: registerAction (auth-actions.ts:119-129) tạo user KHÔNG set watchlistEmails → rơi về default true; register-form.tsx không có checkbox/consent/opt-in nào (grep rỗng); không có text consent/privacy/PDPD trong vi.json; module watchlist không có UI opt-in. Cơ chế duy nhất là OPT-OUT hậu kỳ (unsubscribe.ts:55 set watchlistEmails:false). → "consent ngầm" đúng.
3. listWatchersToNotify (authz.ts:101) lọc `watchlistEmails: true` + `status:"APPROVED"` → mọi user APPROVED tự đủ điều kiện. Đúng.
4. PII egress ra US: sendMail (mailer.ts:103-108) ƯU TIÊN SendGrid HTTP API trước SMTP; sendViaSendgridApi (mailer.ts:64-71) POST tới https://api.sendgrid.com/v3/mail/send với `to:[{email: opts.to}]` (email người dùng VN). Comment mailer.ts:9 khuyến nghị prod trỏ SMTP về server in-VN nhưng đường SendGrid vẫn vượt mặt khi có key SG. → egress ra ngoài lãnh thổ đúng.
5. Lo ngại PDPD (NĐ 13/2023) về cơ sở pháp lý/đồng ý cho xử lý + chuyển dữ liệu cá nhân ra nước ngoài là HỢP LỆ cho một portal 'security-first VN private-wealth'.

LÝ DO HẠ SEVERITY high→medium (claim đánh giá quá nặng mức phơi nhiễm LIVE): toàn bộ đường gửi email bị chặn bởi feature flag watchlistEmailsEnabled() MẶC ĐỊNH OFF (flags.ts:24-26), enforce ngay đầu notifier.notifyReportPublished (notifier.ts:27 `if (!watchlistEmailsEnabled()) return {notified:0}`). Trong cấu hình mặc định hiện tại: 0 email gửi, 0 PII egress. Rủi ro là TIỀM ẨN — chỉ hiện thực hóa khi operator đặt WATCHLIST_EMAILS_ENABLED=true VÀ cấu hình key SendGrid. Đây là lỗ hổng governance/compliance (thiếu consent rõ ràng + thiếu data-localization guarantee), không phải leak đang khai thác được. Core claim đúng → adjusted (sai severity), không refute.

</details>

<details><summary><strong>F2-5 · 🟡 MEDIUM</strong> · correctness — Lockstep visibleWhere ↔ listWatchersToNotify là HAND-MIRRORED — rủi ro drift cao, không có test chốt tương đương</summary>

- 📌 visibleWhere() (authz.ts:41) biểu diễn entitlement như ReportWhereInput; listWatchersToNotify() (authz.ts:76-96) chép lại logic đó như UserWhereInput thủ công, dựa vào comment 'LOCKSTEP — keep identical' (authz.ts:38-40, 67). Hiện hai bên KHỚP về PUBLIC/entitlement/staff, nhưng đã LỆCH ngay về audience (F2-1): nếu thêm audience vào visibleWhere mà quên thêm bên kia thì lại lệch tiếp. watchers.test.ts chỉ assert shape WHERE tĩnh, KHÔNG có test khẳng định 'tập user mà listWatchersToNotify trả về = tập user mà visibleWhere cho xem' trên dữ liệu thật.
- 💥 Mỗi thay đổi entitlement tương lai (audience, tier-gating, nhóm mới) phải sửa hai nơi tay; quên một nơi → fan-out email lệch khỏi visibility (gửi cho người không xem được HOẶC bỏ sót người xem được). Đây là nợ thiết kế đã hiện thực hóa thành lỗi audience.
- 🔧 Sau khi sửa F2-1, thêm một test integration (DB thật) kiểm tra bất biến: với một bộ report×user, mọi recipient của listWatchersToNotify phải pass canViewReport. Cân nhắc refactor để derive một trong hai từ cùng một nguồn predicate. _(effort M)_

</details>

<details><summary><strong>F2-6 · ⚪ LOW</strong> · completeness — Notify chỉ chạy ở reviewReport(publish); reportType/recommendation/symbol gán SAU publish không kích hoạt thông báo</summary>

- 📌 Lời gọi notify duy nhất là khi decision==='publish' (report-actions.ts:94). notifier.ts:43-44 return {notified:0} nếu report.symbols rỗng tại thời điểm publish. Nếu report được publish trước rồi mới được tag symbol (ingest/biên tập sau), hoặc symbol được thêm sau publish, sẽ KHÔNG có sự kiện nào re-trigger notify → watcher không bao giờ nhận mail cho report đó.
- 💥 Bỏ sót thông báo (silent-drop) cho luồng publish-trước-tag-sau, vốn rất khả dĩ với pipeline ingest 5.7k report. Không phải lỗi bảo mật nhưng làm F2 'im lặng' đúng lúc cần nhất.
- 🔧 Cân nhắc gọi notify (idempotent nhờ @@unique) khi gán symbol cho report đã PUBLISHED, hoặc một job quét reconcile. Tối thiểu document hành vi này cho biên tập viên. _(effort M)_

</details>

<details><summary><strong>F2-7 · ⚪ LOW</strong> · security — Trang unsubscribe public hiển thị email đầy đủ của chủ token</summary>

- 📌 page.tsx (unsubscribe) :21 findUserByUnsubscribeToken trả về email; unsubscribe-confirm.tsx:83,92 render t('doneBody',{email}) / t('confirmBody',{email}) — hiển thị địa chỉ email của chủ token cho bất kỳ ai mở URL.
- 💥 Token 32-byte không đoán được nên rủi ro thấp (người giữ link = chủ sở hữu), nhưng nếu link bị forward/log/lộ qua referrer thì email người dùng hiển thị nguyên văn. Cân nhắc với chuẩn 'security-first'.
- 🔧 Mask email (a***@b.vn) trên màn xác nhận, hoặc bỏ hiển thị email và chỉ nói 'địa chỉ này'. Đảm bảo trang không gửi token qua Referer tới bên thứ ba. _(effort S)_

</details>

**Gap vs spec:**
- Invariant #2 KHÔNG đạt: audience=INTERNAL không được loại khỏi notify cho client (cũng không khỏi search/viewer) — báo cáo nội bộ có thể email cho client (F2-1).
- Invariant 'recipient không bao giờ vượt entitlement': đúng cho accessLevel/entitlement/staff nhưng THỦNG ở chiều audience; lockstep là hand-mirror nên rủi ro drift hệ thống (F2-1, F2-5).
- Invariant (c) 'notify non-blocking': KHÔNG đạt — vẫn await đồng bộ trong server action, chỉ được bọc try/catch không-abort; chưa dùng next/after/queue (F2-3).
- Spec data-localization 'PII email egress / PDPD Decree 13': đường ưu tiên SendGrid HTTP API gửi email ra US + opt-out mặc định ON (consent ngầm) — chưa thỏa cấu hình in-territory như comment hứa (F2-4).
- Foundation Symbol/ReportSymbol/WatchlistItem/ReportNotification + cột User chưa có Prisma migration nào → đường deploy prod (migrate deploy) tạo DB thiếu bảng, F2 crash runtime; CI xanh giả vì test mock DB (F2-2).
- Notify chỉ trigger tại publish chokepoint; luồng publish-trước-rồi-tag-symbol không phát thông báo (silent-drop), đáng lưu ý với pipeline ingest hàng loạt (F2-6).

---

### F3 — Excel/Word attachments (download-only) — 72/100 (mostly-done)

F3 được hiện thực khá hoàn chỉnh và là feature an toàn nhất trong 4 feature về mặt thiết kế gate. Upload chỉ dành cho staff (requireCapability("report.upload") với re-check DB tươi: status + tokenVersion + role), validation nối đúng vào validator thuần đã unit-test (magic-byte + chặn macro + cap 25MB), dedup theo (reportId, sha256), và CÓ rollback blob mồ côi khi transaction fail. Route download tái-kiểm auth + freshness + canViewReport + audience trên MỖI request — INTERNAL được chặn tại thời điểm download chứ không chỉ ẩn trong list (đúng invariant). Blob được dọn khi xoá report (removePrefix). Hai lỗ hổng nghiêm trọng nằm NGOÀI biên F3 nhưng phá vỡ giả định của nó: (1) migration drift — không có migration nào tạo bảng ReportAttachment/enum Audience nên prisma migrate deploy ở prod sẽ tạo DB thiếu bảng → mọi route attachment crash; (2) visibleWhere() KHÔNG lọc audience=INTERNAL, nên report INTERNAL + accessLevel=PUBLIC + PUBLISHED vẫn mở được cho CLIENT — attachment CLIENT trên report đó (và cả PDF INTERNAL) bị lộ. Per-attachment gate của F3 đúng; lỗ hổng nằm ở gate report phía trên. Ngoài ra guard size dựa trên content-length có thể bypass bằng chunked transfer-encoding → buffer toàn bộ body vào RAM (OOM/DoS), và phòng thủ macro còn nông (chỉ quét chuỗi vbaProject.bin, không giải nén, không AV).

**Điểm tốt:** Upload RBAC chặt: src/app/api/reports/[id]/attachments/route.ts:24 gọi requireCapability("report.upload") → requireFreshRole → re-check status+tokenVersion+role trên DB (không tin JWT 30 phút). DELETE cũng dùng cùng gate (route.ts:103). · Validation nối đúng vào validator thuần: route.ts:54 gọi validateAttachment(buf, file.name) SAU khi buffer, trả 422 với mã lỗi nếu fail; validator (attachment-validate.ts) reject macro-ext, kiểm magic ZIP/OLE, cap 25MB, đã unit-test (8/8 pass). · Download gate đầy đủ và đúng thứ tự (src/app/api/reports/[id]/attachments/[attachmentId]/route.ts:32-61): 401 nếu chưa APPROVED → re-check freshness DB (status+tokenVersion) → canViewReport (cùng gate PDF) → audience INTERNAL chỉ staff. INTERNAL bị chặn tại download, không chỉ ẩn ở list. · Audience gate ở list-helper đúng: src/server/attachments.ts:22 — client chỉ thấy audience=CLIENT, staff thấy tất cả; page.tsx:63 dùng helper này, canManage = isStaff (page.tsx:67). · Dedup idempotent theo (reportId, sha256): route.ts:60-64 trả duplicate trước khi ghi; @@unique([reportId, sha256]) ở schema (schema.prisma:533) + catch P2002 ở nhánh transaction (route.ts:100-106). · Rollback blob mồ côi: route.ts:97-99 — nếu transaction (create row + audit) ném lỗi thì storage.del(fileKey) dọn blob đã put trước đó. Đúng pattern như PDF upload. · Dọn blob khi xoá report: src/server/report-actions.ts:210-212 gọi del(fileKey) + removePrefix(`attachments/${reportId}`) nên cascade-delete row ở DB không để lại blob mồ côi. · Storage key an toàn: fileKey = attachments/<reportId>/<randomUUID>.<ext> (route.ts:66) — server-controlled, không lấy từ tên file người dùng; resolveKey() trong storage.ts:28 còn chặn path-traversal phòng thủ thêm. fileKey không bao giờ lộ ra client (chỉ stream qua route authed). · Header download an toàn: Content-Disposition attachment (ép tải về), RFC 5987 ascii fallback + filename* UTF-8 cho tên tiếng Việt (route.ts:76-78,88), Cache-Control private no-store, X-Robots-Tag noindex (route.ts:90-91); stream destroy khi client abort hoặc source lỗi (route.ts:82-83) tránh leak fd. · Audit log đầy đủ: REPORT_UPLOAD khi tạo (route.ts:85-93) và REPORT_DELETE khi xoá (route.ts:117-125) ghi trong cùng transaction; DOWNLOAD log fire-and-forget sau khi authz (route.ts:67-73). · Storage là volume filesystem cục bộ (STORAGE_ROOT), không egress blob ra cloud ngoài — nếu host đặt tại VN thì attachment tuân thủ data-localization (cùng posture với PDF). · UI hoàn chỉnh: attachments-panel.tsx có list + badge INTERNAL (dòng 146-150), upload có chọn audience (203-211), delete có confirm 2 bước (160-190), pre-check ext/size phía client (68-77, chỉ là courtesy), map mã lỗi server → i18n (ERR_KEY), router.refresh() re-pull RSC list.

<details><summary><strong>F3-01 · 🔴 CRITICAL — ✅ confirmed</strong> · deploy/migration — Migration drift: không có migration nào tạo bảng ReportAttachment / enum Audience → prod crash</summary>

- 📌 prisma/migrations/ kết thúc ở 20260618092813_report_sha256_unique; grep ReportAttachment|Audience|audience trong thư mục migrations/ KHÔNG có kết quả. Bảng/enum chỉ tồn tại trong prisma/schema.prisma:96 (enum Audience), :269 (Report.audience), :518-535 (model ReportAttachment). CI nối prisma migrate deploy (batch trước) → prod tạo DB THIẾU bảng reportAttachment.
- 💥 Trên prod (migrate deploy, không phải db push), bảng reportAttachment + enum Audience không tồn tại. Mọi truy vấn prisma.reportAttachment.* (list ở attachments.ts:21, upload/dedup ở route.ts:30/60/72, download ở route.ts:48, delete ở route.ts:109) ném P2021/P2010 → trang report 500 và toàn bộ F3 chết. Đây là lỗi chặn release dùng chung cho cả 4 feature, áp dụng trực tiếp cho F3.
- 🔧 Thêm một Prisma migration thật tạo enum Audience, cột Report.audience/reportType/recommendation/tier/contentText, các bảng Symbol/ReportSymbol/WatchlistItem/ReportNotification/ReportAttachment, và wrap report-fts.sql. Chạy prisma migrate diff để sinh và commit vào prisma/migrations/ trước khi deploy. _(effort M)_
- 🔎 Claim hoàn toàn đúng và đường đi tới crash đã được trace đầy đủ.

1) MIGRATION DRIFT (xác nhận): prisma/migrations/ chỉ có 6 migration, kết thúc ở 20260618092813_report_sha256_unique. grep toàn bộ migration SQL cho ReportAttachment|Audience|audience|Symbol|Watchlist|ReportNotification|contentTsv|reportType → 0 kết quả. Trong khi đó schema.prisma có: enum Audience (:96), Report.audience (:269), model ReportAttachment (:514-535). contentTsv KHÔNG có trong schema (chỉ ở prisma/sql/report-fts.sql, comment :8-10 thừa nhận 'prod uses a migration that wraps this SQL' — migration đó KHÔNG tồn tại).

2) CI dùng migrate deploy chứ không db push: .github/workflows/ci.yml:58 chạy `prisma migrate deploy` trên Postgres ephemeral. Quan trọng — CI KHÔNG có DB-integration test: chỉ typecheck + unit test (vitest, thuần, không khởi tạo PrismaClient — grep test dir 0 hit) + build. report-fts.sql cũng KHÔNG được apply trong CI. Vì vậy CI XANH trong khi DB do migrate deploy tạo ra THIẾU toàn bộ bảng 4-feature. Không có vercel.json → prod build/deploy lấy migrations/ làm nguồn sự thật, nhận đúng schema thiếu này.

3) Crash path runtime (trace đầy đủ): listReportAttachments (attachments.ts:21 prisma.reportAttachment.findMany) được gọi bằng AWAIT KHÔNG bọc try/catch tại app/[locale]/(client)/reports/[slug]/page.tsx:63 trong render path của Server Component → khi bảng ReportAttachment không tồn tại, Prisma ném P2021 → TOÀN BỘ trang report 500 (không chỉ panel F3). Các site khác: attachments/route.ts:60/72/101, attachments/[attachmentId]/route.ts:48/109/116 → 500 cho mọi thao tác F3.

Severity 'critical' giữ nguyên: lỗi chặn release dùng chung cho cả 4 feature (contentTsv FTS + Symbol/Watchlist/Notification + ReportAttachment đều thiếu), giết chết F3 và làm sập trang report cho cả client lẫn staff trên prod.

</details>

<details><summary><strong>F3-02 · 🟠 HIGH — ✅ confirmed</strong> · security — Report audience=INTERNAL + accessLevel=PUBLIC + PUBLISHED vẫn mở được cho CLIENT (gate report không lọc audience)</summary>

- 📌 visibleWhere() (src/lib/authz.ts:41-51) chỉ lọc status=PUBLISHED + OR(accessLevel PUBLIC | entitlement) — KHÔNG có điều kiện audience. canViewReport (authz.ts:23-35) và getReportBySlug (src/server/reports.ts:31) chỉ dựa vào visibleWhere. Schema ghi rõ audience INTERNAL = 'staff-only forever' (schema.prisma:269) nhưng không code nào ép điều đó ở cấp report.
- 💥 Một report đặt audience=INTERNAL nhưng accessLevel=PUBLIC và PUBLISHED sẽ: (a) mở được toàn bộ trang + PDF cho CLIENT qua /view (view/route.ts:56 cũng chỉ dùng canViewReport, không check audience); (b) mọi attachment audience=CLIENT trên report nội bộ đó tải được bởi client. Gate per-attachment của F3 đúng (chặn được attachment INTERNAL), nhưng tài liệu INTERNAL tổng thể vẫn lộ. Nhãn 'INTERNAL forever' bị phá. Rủi ro cao vì staff dễ tin nhãn INTERNAL là đủ để giữ kín.
- 🔧 Thêm nhánh audience vào visibleWhere(): với non-staff thêm { audience: 'CLIENT' } vào WHERE (và mirror vào listWatchersToNotify để giữ lockstep). Đây là sửa một chỗ ở authz.ts, bịt cả /view, /download và search cùng lúc. _(effort S)_
- 🔎 Claim đúng ở mọi điểm. visibleWhere() (src/lib/authz.ts:41-51) chỉ lọc status=PUBLISHED + OR(accessLevel=PUBLIC | entitlement-at-report | entitlement-at-category) — KHÔNG có điều kiện audience. canViewReport (authz.ts:23-35) và getReportBySlug (src/server/reports.ts:30-31) chỉ dựa vào visibleWhere. grep toàn bộ read-path (src/lib, src/server/reports.ts, report-actions.ts) xác nhận KHÔNG có bất kỳ filter audience nào ngoài chỗ per-attachment.

Schema xác nhận intent là một bảo đảm tuyệt đối: Audience INTERNAL = 'staff-only forever — never published to clients' (schema.prisma:98) và field comment 'INTERNAL = staff-only forever' (schema.prisma:269). Không code nào ép điều này ở cấp report.

Impact (a) XÁC NHẬN: src/app/api/reports/[id]/view/route.ts:56 chỉ gọi canViewReport(), không check audience → một report INTERNAL + accessLevel=PUBLIC + PUBLISHED stream được PDF (đã watermark) cho CLIENT, và trang chi tiết cũng mở (page.tsx → getReportBySlug).

Impact (b) XÁC NHẬN: route download attachment ([attachmentId]/route.ts:55-61) gate bằng canViewReport (đậu vì không lọc audience) RỒI mới chặn att.audience==='INTERNAL'. Nên attachment audience=CLIENT đặt trên report INTERNAL đó tải được bởi client. Đúng như claim thừa nhận: per-attachment gate cho file INTERNAL hoạt động đúng (route.ts:59), nhưng tài liệu INTERNAL tổng thể + file CLIENT của nó vẫn lộ.

Trạng thái nguy hiểm CÓ THỂ ĐẠT ĐƯỢC: report-actions.ts đặt status=PUBLISHED (line 56-68) và accessLevel (line 115-145) độc lập với audience, không có ràng buộc chéo nào ngăn INTERNAL + PUBLIC + PUBLISHED cùng tồn tại.

Severity high (không nâng critical): đây là rò rỉ do MISCONFIG (phải chủ động đặt INTERNAL report thành accessLevel=PUBLIC + PUBLISHED), không phải leak zero-config trên default path (default accessLevel là RESTRICTED, và report INTERNAL thường không được entitle cho group client). Nhưng vì nhãn được tài liệu hoá là bảo đảm tuyệt đối mà không code nào ép, một sai sót cấu hình đơn lẻ phá vỡ toàn bộ — high là đúng.

</details>

<details><summary><strong>F3-03 · 🟡 MEDIUM</strong> · security — Guard kích thước dựa trên content-length bị bypass bằng chunked transfer-encoding → buffer toàn bộ body vào RAM</summary>

- 📌 route.ts:36-39: const declared = Number(req.headers.get('content-length') ?? '0'); if (declared > MAX_BODY_BYTES) → 413. Nếu request dùng Transfer-Encoding: chunked (không có content-length), Number(null??'0')=0, guard bị skip; req.formData() (route.ts:43) materialize TOÀN BỘ body trong RAM trước khi validateAttachment cap 25MB ở route.ts:54.
- 💥 Kẻ tấn công đã xác thực ở vai staff (hoặc bất kỳ ai vượt được requireCapability) có thể stream body khổng lồ không khai báo content-length, làm OOM tiến trình. Comment thừa nhận 'prod cũng cap qua nginx client_max_body_size' nhưng các commit gần đây cho thấy deploy Vercel/serverless KHÔNG có nginx, nên guard ứng dụng là tuyến duy nhất và nó bypass được.
- 🔧 Đọc body qua stream có đếm byte và abort khi vượt MAX_BODY_BYTES thay vì tin content-length; hoặc dùng req.body reader cộng dồn length và reject sớm. Tối thiểu: ghi rõ phụ thuộc nginx và bảo đảm cấu hình body-size ở reverse proxy/Edge thực tế. _(effort M)_

</details>

<details><summary><strong>F3-04 · 🟡 MEDIUM</strong> · security — Phòng thủ macro nông: chỉ quét chuỗi 'vbaProject.bin', không giải nén OOXML — có thể bị né</summary>

- 📌 attachment-validate.ts:54: if (buf.includes(VBA_MARKER)) → macro. VBA_MARKER = Buffer.from('vbaProject.bin'). Đây là quét substring trên bytes thô của file zip. Tên entry trong zip central directory thường KHÔNG nén (stored), nhưng nếu zip dùng tên entry đã nén/đổi, hoặc macro nhúng qua đường khác (XLM macro cũ trong .xls OLE, external-link/DDE, remote template injection trong docx), marker không xuất hiện và file vẫn qua.
- 💥 Office file có macro/DDE/remote-template injection có thể lọt validator và được lưu, rồi tải về cho client/staff — vector phishing/RCE phía máy người nhận. Comment đã ghi 'deeper AV is a fast-follow' nên đây là hạn chế đã biết, nhưng với portal 'security-first' phục vụ private-wealth thì rủi ro thực. File OLE (.xls/.doc) không bị quét VBA chút nào (chỉ check magic 8 byte ở route nhánh ole, attachment-validate.ts:56).
- 🔧 Giải nén OOXML và liệt kê entry để phát hiện vbaProject.bin/xlMacrosheet thực sự; với OLE parse storage để phát hiện VBA/Macro stream; lý tưởng nối AV/ClamAV scan ở pipeline upload (fast-follow đã ghi). Tối thiểu mở rộng test cho OLE-macro để không tạo false sense of safety. _(effort L)_

</details>

<details><summary><strong>F3-05 · ⚪ LOW</strong> · security — Không watermark được file Office — nguy cơ rò rỉ dữ liệu chỉ được ghi chú một phần</summary>

- 📌 route.ts:24-25 comment 'No watermark / no Range'. PDF có watermark per-user (view/route.ts dùng resolveStreamKey) nhưng attachment Excel/Word tải nguyên bản, không có dấu vết người tải nhúng trong file. flags.ts watermarkEnabled() DEFAULT OFF nên ngay cả PDF cũng có thể không watermark.
- 💥 Một client entitled tải file Office rồi phát tán; không có cách truy nguyên ai làm rò (no per-user stamp trong file). Có log DOWNLOAD (route.ts:67) ghi userId/ip nên truy được AI ĐÃ TẢI, nhưng bản thân file lan ra ngoài không mang dấu vết. Đây là hạn chế cố hữu của Office format (không stamp được như PDF), nhưng tài liệu/quyết định chấp nhận rủi ro nên được nêu rõ cho khách hàng.
- 🔧 Ghi rõ trade-off trong tài liệu bảo mật + dựa vào audit log DOWNLOAD để truy nguyên; cân nhắc giới hạn audience INTERNAL cho file nhạy cảm. Không có fix kỹ thuật để stamp Office mà không hỏng định dạng. _(effort S)_

</details>

<details><summary><strong>F3-06 · ⚪ LOW</strong> · correctness — Upload cho phép gắn attachment vào report ở MỌI trạng thái (DRAFT/ARCHIVED) không kiểm</summary>

- 📌 route.ts:30-31 chỉ check report tồn tại (select id), không kiểm report.status. Không có ràng buộc chỉ cho gắn vào report PUBLISHED hay DRAFT.
- 💥 Staff có thể gắn attachment vào report đã ARCHIVED hoặc bất kỳ trạng thái nào. Vì đây là hành động staff-only (đã gate report.upload), tác động bảo mật thấp; chủ yếu là vấn đề tính nhất quán vòng đời — attachment trên report archived vẫn tải được nếu client còn entitled (download chỉ phụ thuộc canViewReport, mà archived thường không PUBLISHED nên client bị chặn). Rủi ro thấp nhưng nên xác nhận chủ đích.
- 🔧 Nếu nghiệp vụ yêu cầu, giới hạn upload theo status (ví dụ chỉ DRAFT/PUBLISHED) trong route.ts sau khi load report.status. Hoặc ghi nhận đây là hành vi cố ý. _(effort S)_

</details>

<details><summary><strong>F3-07 · 🔵 INFO</strong> · performance — Không có giới hạn số lượng/tổng dung lượng attachment mỗi report</summary>

- 📌 route.ts không kiểm count attachment hiện có trước khi tạo; mỗi file tới 25MB, không cap tổng. listReportAttachments (attachments.ts:21) findMany không phân trang.
- 💥 Staff (hoặc tài khoản staff bị chiếm) có thể gắn rất nhiều file 25MB làm phình storage + làm panel UI dài. Tác động thấp vì staff-only, nhưng không có rào tài nguyên.
- 🔧 Thêm giới hạn mềm số attachment/report hoặc tổng byte; phân trang/giới hạn list nếu cần. _(effort S)_

</details>

**Gap vs spec:**
- Spec yêu cầu lưu trữ tại VN (data-localization): code dùng filesystem volume cục bộ (STORAGE_ROOT) — đúng nếu host ở VN, nhưng các commit gần đây cho thấy app đang deploy Vercel (không VN, filesystem ephemeral). Trên Vercel attachment sẽ mất sau mỗi deploy/scale và KHÔNG nằm trong territory VN. Chưa có S3/SeaweedFS in-VN driver (storage.ts:77 chỉ có filesystem MVP).
- Spec 'validate magic-byte / block macros': có làm nhưng phòng thủ macro chỉ là quét substring vbaProject.bin trên OOXML, KHÔNG giải nén và KHÔNG quét macro cho file OLE (.xls/.doc) — chưa đạt mức 'block macros' chắc chắn; AV scan để ngỏ (đã ghi fast-follow).
- Spec 'reuse chunked-upload + storage + download-token': KHÔNG tái dùng chunked-upload (upload single-request multipart) và KHÔNG dùng download-token (download dựa trực tiếp canViewReport + audience mỗi request). Quyết định này hợp lý cho file nhỏ và thực ra an toàn hơn token, nhưng lệch với spec đã nêu — cần xác nhận chủ đích.
- Invariant #2 (INTERNAL không bao giờ phục vụ client): đạt cho TỪNG attachment (download re-check audience) nhưng KHÔNG đạt ở cấp report — report audience=INTERNAL + PUBLIC + PUBLISHED vẫn mở cho client, kéo theo PDF nội bộ và attachment CLIENT trên report đó bị lộ (F3-02).
- Migration để tạo bảng ReportAttachment/enum Audience chưa tồn tại — F3 không thể deploy lên prod qua migrate deploy (F3-01).

---

### Foundation — Symbol/tagging, migration drift, flags, F4 Prop Indicators — 52/100 (partial)

Phần xương sống dữ liệu (Symbol, ReportSymbol, WatchlistItem, ReportNotification, ReportAttachment, các cột mới của Report + contentTsv) được thiết kế tốt về mặt schema: ràng buộc unique/cascade/index hợp lý, axis Symbol là first-class. Nhưng có hai vấn đề nghiêm trọng thuộc khu vực Foundation: (1) MIGRATION DRIFT — không có bất kỳ Prisma migration nào tạo ra các bảng/cột của 4 feature; prisma migrate deploy trong CI và prod chỉ chạy 6 migration cũ (kết thúc ở 20260618092813_report_sha256_unique), nên prod sẽ thiếu toàn bộ bảng → crash runtime, trong khi CI vẫn XANH vì test mock toàn bộ prisma (58/58 pass) và build không chạm DB → false-green nguy hiểm. (2) Cột Report.audience hoàn toàn KHÔNG được lọc trong đường đọc/tìm kiếm/notify (visibleWhere, listWatchersToNotify, searchReports) — chỉ F3 attachments lọc audience. Một report INTERNAL + accessLevel=PUBLIC sẽ rò rỉ vào search/list của client VÀ vào email watchlist cho mọi user. Ngoài ra: KHÔNG có UI/admin action để gắn ticker cho report (chỉ tag được qua scripts/ingest.ts, mỗi report đúng 1 primary symbol) → F1/F2 gần như inert nếu không chạy ingest; enum audit REPORT_TAG_ADD/REMOVE không bao giờ được phát. WATERMARK mặc định OFF (rủi ro bảo mật tài liệu). F4 đúng như dự kiến: CHƯA build, bị chặn bởi external API + cần proxy server-side vì CSP connect-src 'self'.

**Điểm tốt:** Schema Symbol là first-class: ticker @unique UPPERCASE (schema.prisma:425), exchange/sector/isActive, quan hệ reports + watchers — đúng spine cho F1/F2 · ReportSymbol join có @@id([reportId,symbolId]) + @@index([symbolId]) để tra cứu ticker→reports nhanh, onDelete:Cascade cả hai phía (schema.prisma:439-449) · WatchlistItem @@unique([userId,symbolId]) + @@index([symbolId]) (fan-out) + @@index([userId]) (schema.prisma:493-495); cascade từ User và Symbol đều có · ReportNotification @@unique([reportId,userId,channel]) là idempotency guard chống double-send khi republish/retry (schema.prisma:510) · ReportAttachment @@unique([reportId,sha256]) dedup + @@index([reportId]), fileKey không lộ (schema.prisma:518-535) · report-fts.sql idempotent đúng: f_unaccent IMMUTABLE wrapper, contentTsv GENERATED ALWAYS STORED, GIN index, dùng IF NOT EXISTS toàn bộ (prisma/sql/report-fts.sql) · searchReports() THỰC SỰ intersect FTS ids với visibleWhere(userId) cho client (authz.ts:249,261) — invariant #1 (FTS gate) đứng vững; facet/cursor đều nằm trong cùng where · Publish→notify được bọc try/catch nên notify lỗi KHÔNG làm fail publish đã commit (report-actions.ts:94-100) — invariant #4 về mặt fail-safe đạt · flags.ts có safe defaults, đọc lazy theo env, registry additive sạch sẽ (flags.ts) · 58/58 unit test pass (vitest), bao gồm test lockstep watchers + notifier idempotency + attachment-validate

<details><summary><strong>F-FND-1 · 🔴 CRITICAL — ✅ confirmed</strong> · deploy/migration — Không có Prisma migration cho BẤT KỲ bảng/cột nào của 4 feature → prod thiếu bảng, CI false-green</summary>

- 📌 prisma/migrations/ chỉ có 6 thư mục, mới nhất là 20260618092813_report_sha256_unique; grep toàn bộ migrations cho Symbol/ReportSymbol/WatchlistItem/ReportNotification/ReportAttachment/contentTsv/reportType → 'NO MIGRATION references these models'. CI (.github/workflows/ci.yml:57-58) chạy `prisma migrate deploy` rồi `pnpm test`/`pnpm build`. Tests mock toàn bộ prisma (notifier.test.ts:23, watchers.test.ts:6) nên không bao giờ chạm bảng thật → CI XANH dù schema CI thiếu mọi bảng feature.
- 💥 Khi deploy prod bằng `prisma migrate deploy` (cơ chế deploy đã wire vào CI), DB sẽ KHÔNG có Symbol/ReportSymbol/WatchlistItem/ReportNotification/ReportAttachment/các cột Report mới/contentTsv. Mọi truy vấn F1-F3 (search, watchlist, attachments, notify) ném lỗi 'relation/column does not exist' → 500 / crash. Schema dev hiện chỉ tồn tại nhờ `prisma db push` thủ công + psql -f report-fts.sql, không reproduce được trên prod.
- 🔧 Tạo MỘT migration mới (vd `pnpm prisma migrate dev --name feature_models_fts`) sinh ra DDL cho 5 model + cột Report mới, rồi APPEND nội dung prisma/sql/report-fts.sql (CREATE EXTENSION/FUNCTION/generated column/GIN, đều IF NOT EXISTS) vào cuối migration.sql đó để contentTsv/GIN được tạo trong cùng migrate deploy. Thêm bước test integration chạm DB thật (ít nhất 1) vào CI để drift kiểu này không còn false-green. _(effort M)_
- 🔎 Claim xác nhận đầy đủ. (1) prisma/migrations/ chỉ có 6 thư mục, mới nhất 20260618092813_report_sha256_unique và migration.sql của nó chỉ đổi index Report_fileSha256 — KHÔNG tạo bảng feature nào. (2) grep toàn bộ *.sql trong mọi migration cho Symbol/ReportSymbol/WatchlistItem/ReportNotification/ReportAttachment/contentTsv/reportType/recommendation → 0 hit. (3) schema.prisma LẠI có đủ các model (Symbol L423, ReportSymbol L439, WatchlistItem L484, ReportNotification L500, ReportAttachment L518) + cột Report mới (reportType/recommendation/audience/contentText L266-273) → drift thuần qua `prisma db push`, không có migration. (4) contentTsv chỉ tồn tại trong prisma/sql/report-fts.sql (psql -f); chính comment trong file thừa nhận 'prod uses a migration that wraps this SQL' — migration đó KHÔNG tồn tại. (5) CI (.github/workflows/ci.yml) chạy `prisma migrate deploy` trên Postgres ephemeral rồi test+build; grep CI cho report-fts/db push/psql → 0 hit, nên DB CI thiếu mọi bảng/cột feature + contentTsv. (6) Tests mock toàn bộ prisma: notifier.test.ts vi.mock('@/lib/prisma') (report.findUnique, reportNotification.create), watchers.test.ts vi.mock('@/lib/prisma') (user.findMany) → không bao giờ chạm DB thật → CI XANH dù schema thiếu bảng. (7) Runtime impact thật: src/lib/search.ts:18-22 chạy $queryRaw `WHERE r.\"contentTsv\" @@ query` → trên DB dựng bằng migrate deploy sẽ ném 'column \"contentTsv\" does not exist'; tương tự mọi truy cập prisma.symbol/watchlistItem/reportNotification/reportAttachment ném 'relation does not exist' → 500/crash F1-F3. Đây là lỗi deploy-blocking thật: cơ chế deploy (migrate deploy) đã wire vào CI nhưng KHÔNG reproduce được schema dev. Severity critical là chính xác (prod crash toàn bộ 4 feature ngay khi deploy sạch). Một lưu ý nhỏ không giảm severity: `pnpm build` (next build) về lý thuyết có thể bắt lỗi nếu một trang pre-render query feature lúc build, nhưng các surface là route động/gated nên không bắt — false-green vẫn đứng vững.

</details>

<details><summary><strong>F-FND-2 · 🔴 CRITICAL — 🔧 adjusted → **MEDIUM**</strong> · security — Report.audience KHÔNG được lọc trong đường đọc/search/notify — report INTERNAL+PUBLIC rò rỉ cho client</summary>

- 📌 visibleWhere() (authz.ts:41-51) chỉ lọc status=PUBLISHED + (accessLevel PUBLIC ∪ entitlement) — KHÔNG có audience. listWatchersToNotify() (authz.ts:69-108) khi accessLevel=PUBLIC trả entitled={} (line 77-78) → mọi user APPROVED có watchlist khớp đều nhận mail; KHÔNG lọc audience. notifier.ts select report (lines 31-39) còn không select audience. searchReports (authz.ts:248-254) dùng visibleWhere làm gate, không thêm audience. grep 'audience' toàn repo: trong read path chỉ xuất hiện ở COMMENT (authz.ts:39) và type hiển thị (pdf-viewer.tsx:82); filter audience thật chỉ tồn tại ở F3 attachments.ts:22.
- 💥 Một report được tag audience=INTERNAL (staff-only forever theo schema.prisma:98) nhưng accessLevel=PUBLIC + status=PUBLISHED sẽ: (a) hiện trong kết quả search & list của CLIENT, (b) gửi email watchlist tới TẤT CẢ user APPROVED. Vi phạm trực tiếp invariant #2; rò rỉ research nội bộ ra ngoài client. Default audience=CLIENT giảm xác suất nhưng không phải là gate — chỉ cần một report bị tag/ingest INTERNAL là rò.
- 🔧 Thêm `audience: { not: 'INTERNAL' }` (hoặc `audience: 'CLIENT'`) vào nhánh client của visibleWhere() và vào where của listWatchersToNotify() (giữ LOCKSTEP), đồng thời select audience trong notifier để defense-in-depth. Cân nhắc đưa filter audience vào một helper chung để không hand-mirror lệch. _(effort S)_
- 🔎 Cơ chế (mechanism) của claim ĐÚNG hoàn toàn theo code: (1) visibleWhere() (authz.ts:41-51) chỉ lọc status=PUBLISHED + OR(accessLevel PUBLIC, entitlement report/category) — KHÔNG có audience. Đây là gate duy nhất cho canViewReport, getReportBySlug (reports.ts:31), listVisibleReports, searchReports (authz.ts:249) và countVisibleReportsBySymbols. (2) listWatchersToNotify() (authz.ts:69-108): nhánh accessLevel=PUBLIC trả entitled={} (line 77-78) → mọi user APPROVED có watchlistEmails=true + watchlist khớp đều nhận mail; không lọc audience. notifier.ts (lines 29-40) còn không select audience. (3) grep toàn repo xác nhận lọc audience CHỈ tồn tại ở F3 attachments (attachments.ts:22; [attachmentId]/route.ts:59); trong report read/search/notify path audience chỉ xuất hiện ở COMMENT (authz.ts:39) và display type (pdf-viewer.tsx:82). Schema (schema.prisma:269,290) ghi rõ INTERNAL = "staff-only forever — never published to clients". Vậy invariant #2 thực sự bị vi phạm về mặt logic gate. NHƯNG hạ severity từ critical→medium vì tính reachable: tôi grep toàn bộ setter audience cấp Report (create/update) — assignment DUY NHẤT trong cả codebase là audience:"CLIENT" (ingest.ts:214). KHÔNG có server action, admin UI, hay ingest path nào ghi audience=INTERNAL vào Report; field default CLIENT và không có write path nào tạo ra state nguy hiểm (INTERNAL+PUBLIC+PUBLISHED). INTERNAL chỉ được dùng cho ReportAttachment (đã được gate đúng). Do đó đây là lỗ hổng latent / defense-in-depth thật sự (gate bỏ sót một chiều bảo mật đã được document; comment LOCKSTEP authz.ts:39 thậm chí tự nhắc audience "MUST be reflected" nhưng cả hai phía đều không lọc) — đáng sửa, nhưng KHÔNG khai thác được hôm nay vì không có đường tạo report INTERNAL. Impact claimed (rò rỉ research nội bộ ra client + mail tới mọi APPROVED) là đúng nếu state tồn tại, nhưng overstated vì state đó hiện không thể sinh ra qua bất kỳ code path nào.

</details>

<details><summary><strong>F-FND-3 · 🟠 HIGH — ✅ confirmed</strong> · completeness — Không có UI/admin để gắn ticker cho report — F1/F2 inert nếu không chạy ingest</summary>

- 📌 Nơi DUY NHẤT tạo ReportSymbol là scripts/ingest.ts:227 (`symbols: { create: [{ symbolId: symbol.id, isPrimary: true }] }`) — đúng 1 primary symbol/report. src/server/reports.ts chỉ ĐỌC symbols (line 24,45). Không có server action reportSymbol.create/upsert nào trong src/. Enum audit REPORT_TAG_ADD/REPORT_TAG_REMOVE (schema.prisma:124-125) chỉ xuất hiện làm label ở admin/audit/page.tsx:33-34, KHÔNG có nơi nào logAudit phát ra → tag flow chưa tồn tại. seed.ts không seed Symbol nào.
- 💥 Report tạo qua luồng upload thường (UploadSession→Report) sẽ KHÔNG có symbol nào → không bao giờ xuất hiện trong search theo ticker, không bao giờ trigger watchlist email (notifier.ts:44 return sớm khi symbolIds rỗng). F1 facet/search-by-ticker và toàn bộ F2 chỉ hoạt động với report đã ingest; report do staff upload tay là 'mồ côi' khỏi axis Symbol. Staff không thể sửa/bổ sung ticker, không thể tag nhiều ticker (sector note) vì ingest hard-code 1 primary.
- 🔧 Bổ sung admin server action tagReportSymbol/untagReportSymbol (RBAC: EDITOR+), UI chọn ticker trong trang sửa report, phát logAudit REPORT_TAG_ADD/REMOVE (enum đã sẵn). Cho phép nhiều symbol + đặt isPrimary. Wire vào luồng upload finalize để gợi ý ticker. _(effort M)_
- 🔎 Claim đúng toàn bộ, đã trace từng đường dẫn.

1) Nơi DUY NHẤT tạo ReportSymbol = scripts/ingest.ts:227 (`symbols: { create: [{ symbolId: symbol.id, isPrimary: true }] }`). Grep `symbols:{create` / `reportSymbol.create|upsert` trên toàn src/ + scripts/ chỉ trả về đúng dòng này. Không có server action nào trong src/server/ hay src/app/ mutate ReportSymbol (grep `ReportSymbol\b` ngoài test = rỗng).

2) Luồng upload tay thật sự là createReportFromPdf() (src/lib/report-create.ts), gọi từ finalizeUpload (upload-session.ts:288) ← api/admin/uploads/[id]/route.ts:67. tx.report.create() (report-create.ts:96-110) chỉ set slug/category/status/accessLevel/file*/pageCount/uploadedById — KHÔNG có symbols, reportType, recommendation. Hơn nữa reportMetaSchema (report-create.ts:20-32) thậm chí không có field ticker/symbol nào, và upload-dialog.tsx không có input ticker/symbol/reportType/recommendation (grep = 0 match). ⇒ report upload tay là 'mồ côi' khỏi axis Symbol, đúng như claim.

3) src/server/reports.ts chỉ ĐỌC symbols (line 24-26 include, line 45 map) — confirm không ghi.

4) Enum REPORT_TAG_ADD/REPORT_TAG_REMOVE (schema.prisma:124-125) chỉ xuất hiện làm label i18n ở admin/audit/page.tsx:33-34. KHÔNG có logAudit nào phát ra 2 action này (grep mọi logAudit call: chỉ REPORT_UPLOAD, account/entitlement/notify... — không có REPORT_TAG). ⇒ tag flow chưa tồn tại như runtime path.

5) seed.ts không seed Symbol/ticker/reportSymbol nào (grep = rỗng).

Tác động được xác nhận: notifier.ts:44 `if (symbolIds.length === 0) return { notified: 0 }` ⇒ report không symbol KHÔNG BAO GIỜ trigger watchlist email (F2 inert). authz.ts:254 facet ticker = `{ symbols: { some: { symbol: { ticker } } } }` cần join row ReportSymbol tồn tại ⇒ report không symbol vô hình với search-by-ticker (F1 facet inert). ingest.ts:227 hard-code đúng 1 isPrimary ⇒ không hỗ trợ multi-ticker (sector note). Vậy F1-by-ticker và toàn bộ F2 chỉ hoạt động với report đã chạy ingest; staff không có UI/action để gắn/sửa/thêm ticker.

Mức độ: đây là 'completeness gap' về vận hành/feature hơn là security/leak (gate entitlement vẫn nguyên vẹn — không có rò rỉ). Severity giữ nguyên như claim (gap chức năng nghiêm trọng làm F1/F2 vô dụng cho report upload tay), verdict = confirmed.

</details>

<details><summary><strong>F-FND-4 · 🟠 HIGH — 🔧 adjusted → **MEDIUM**</strong> · security — WATERMARK_ENABLED mặc định OFF — tài liệu mật stream không có dấu định danh người dùng</summary>

- 📌 flags.ts:14-16 watermarkEnabled() trả `process.env.WATERMARK_ENABLED === 'true'` → default OFF; comment xác nhận 'When off, the base PDF is streamed as-is (no per-user stamp)'.
- 💥 Với một portal private-wealth security-first, mặc định không watermark nghĩa là PDF tải/xem ra không truy vết được người làm rò. Nếu prod quên set env, mọi tài liệu mật bị stream trần. Đây là posture mặc định kém an toàn cho đúng giá trị cốt lõi của sản phẩm.
- 🔧 Đảo posture: mặc định ON ở prod (vd default true trừ khi WATERMARK_ENABLED==='false'), hoặc fail-safe theo NODE_ENV=production. Tối thiểu phải có deploy-checklist bắt buộc bật. Tài liệu hoá rõ rủi ro. _(effort S)_
- 🔎 Các dữ kiện kỹ thuật của claim ĐÚNG hoàn toàn. flags.ts:14-16: watermarkEnabled() trả process.env.WATERMARK_ENABLED === "true" → DEFAULT OFF, comment dòng 12 xác nhận "base PDF is streamed as-is (no per-user stamp)". watermark.ts:117-128 resolveStreamKey(): khi flag OFF trả thẳng report.fileKey (bản gốc, không đóng dấu). Cả route view (view/route.ts:60) lẫn download (download/route.ts:56) đều đi qua đúng path này, nên khi prod quên set env thì mọi PDF mật stream/tải ra KHÔNG có dấu định danh người dùng trong tài liệu. Claim mô tả chính xác.

NHƯNG mức "high" bị thổi phồng, hạ xuống MEDIUM vì:
1) Đây là toggle env per-deploy, KHÔNG phải bug code — tính năng watermark đã build đầy đủ và hoạt động đúng khi bật (watermark.ts:34-109 stamp footer per-user + diagonal "BẢO MẬT", cache theo reportId+userId). "Lỗ hổng" chỉ nằm ở lựa chọn DEFAULT.
2) Có compensating control mạnh: MỌI lần view/download đều ghi audit với userId + reportId + IP + userAgent (logReportAccess tại view/route.ts:79-86 và download/route.ts:66-72). Tức rò rỉ VẪN truy được về user đã truy cập ở phía server — chỉ là không có dấu nhúng trong file nếu tài liệu bị phát tán ngoài nền tảng.
3) Watermark được code chú thích rõ "NOT DRM, a leak-tracing stamp" (watermark.ts:10-11) — là defense-in-depth, không phải control chính. Toàn bộ entitlement gate (canViewReport), re-validate auth + tokenVersion mỗi request, one-time download token, header no-store/noindex VẪN nguyên vẹn bất kể flag. KHÔNG có bypass access-control, KHÔNG rò dữ liệu cho bên không được phép.
4) Có thể coi là LOW vì không có tác động bảo mật trực tiếp; nhưng giữ MEDIUM do với sản phẩm "security-first private-wealth", default OFF dấu định danh là posture mặc định kém an toàn (fail-open thay vì fail-safe) và UI còn hiển thị thông báo "tải xuống có đóng dấu định danh" (pdf-viewer.tsx:806-841, t("downloadNoticeWatermark")) — gây hiểu lầm/sai khi flag tắt. Đây là hardening/defaults issue, không phải vulnerability mức high.

</details>

<details><summary><strong>F-FND-5 · 🟠 HIGH — ✅ confirmed</strong> · deploy/migration — contentTsv/GIN không được tạo trong CI và prod (chỉ qua psql -f thủ công)</summary>

- 📌 report-fts.sql nằm ngoài schema.prisma (comment line 8-10 thừa nhận); cách apply duy nhất là `psql -f` thủ công (header line 5). CI (.github/workflows/ci.yml) KHÔNG có bước nào chạy report-fts.sql → DB test thiếu contentTsv + report_contenttsv_gin. Comment trong file nói 'prod uses a migration that wraps this SQL' nhưng migration đó KHÔNG tồn tại (xem F-FND-1).
- 💥 searchReportIds() (src/lib/search.ts) chạy websearch_to_tsquery trên contentTsv + GIN; nếu cột/index không tồn tại trên prod → search ném lỗi cột không tồn tại, hoặc (nếu chỉ thiếu GIN) full-scan ~12s/truy vấn theo chính ghi chú trong SQL. Drift này đi kèm F-FND-1.
- 🔧 Gộp report-fts.sql vào migration mới (xem F-FND-1) để migrate deploy tự tạo. Nếu giữ tách, thêm bước CI chạy psql -f sau migrate deploy và thêm integration test cho search. _(effort S)_
- 🔎 Claim đúng ở mọi trục cốt lõi. (1) contentTsv KHÔNG nằm trong schema.prisma — chỉ có contentText (prisma/schema.prisma:273); chính file SQL thừa nhận (report-fts.sql:8-10). (2) Cách apply duy nhất là psql -f thủ công (report-fts.sql:5); grep toàn repo cho 'report-fts' chỉ ra chính file SQL + 1 doc-comment ở src/lib/search.ts:12. KHÔNG có script/package.json task/CI step nào chạy nó. (3) CI (.github/workflows/ci.yml:54-67) chỉ: prisma generate → prisma migrate deploy (line 58) → typecheck → vitest → build; Postgres ephemeral (line 15-28) chỉ nhận migrate deploy. Grep prisma/migrations/ cho contentTsv|report-fts|f_unaccent|GENERATED ALWAYS = 0 match → migration KHÔNG tạo các object này (chính F-FND-1). Nên DB test/prod thiếu cột contentTsv, index report_contenttsv_gin VÀ function f_unaccent. (4) Comment report-fts.sql:10 'prod uses a migration that wraps this SQL' là SAI — migration đó không tồn tại. (5) searchReportIds() (src/lib/search.ts:18-24) chạy websearch_to_tsquery('simple', f_unaccent(...)) + WHERE r.contentTsv @@ query + ts_rank → trên prod thiếu object sẽ ném lỗi 'column/function does not exist' ngay khi user search. Hai tinh chỉnh nhỏ (không làm sai claim cốt lõi): (a) phần impact 'nếu chỉ thiếu GIN → full-scan ~12s' không chính xác — query tham chiếu thẳng cột contentTsv, không recompute to_tsvector(contentText); con số ~12s trong comment mô tả pattern CŨ. Vì cột+index+function tạo cùng một file/một bước, thực tế vắng mặt CÙNG nhau → lỗi cứng chứ không scan chậm. (b) pnpm test (vitest) KHÔNG có test nào gọi searchReportIds/searchReports hay $queryRaw vào DB → CI VẪN PASS dù thiếu FTS object: false-green, drift im lặng, lỗi chỉ lộ ở prod runtime. Giữ severity HIGH (không critical): không phải lỗ hổng entitlement/leak — chỉ làm F1 search sập runtime trên prod, gắn liền F-FND-1; đây là availability/deploy bug đúng nghĩa.

</details>

<details><summary><strong>F-FND-6 · 🟡 MEDIUM</strong> · performance — Publish→notify await đồng bộ trong server action — email chậm chặn response publish</summary>

- 📌 report-actions.ts:94-100: `await getNotifier().notifyReportPublished(reportId)` nằm trong luồng request của reviewReport, sau commit. Comment (line 92-93) thừa nhận 'Synchronous for now'. notifier.ts vòng for gửi mail tuần tự, mỗi watcher một sendMail await (notifier.ts ~lines 55-70).
- 💥 Publish không bị FAIL khi mail lỗi (try/catch ổn), nhưng response của hành động publish bị BLOCK cho đến khi gửi xong toàn bộ watcher. Với SMTP/SendGrid chậm hoặc nhiều watcher, staff thấy publish 'treo' vài giây→chục giây. Không phải fire-and-forget/next-after như spec invariant #4 mong đợi.
- 🔧 Chuyển sang next/after() (Next 15) hoặc fire-and-forget không await (đã có try/catch), hoặc đẩy ra queue. Giữ idempotency ledger nên retry an toàn. _(effort S)_

</details>

<details><summary><strong>F-FND-8 · ⚪ LOW</strong> · performance — Report.audience không có index dù được dùng làm gate bảo mật (sau khi fix F-FND-2)</summary>

- 📌 schema.prisma:269 audience có default nhưng không nằm trong @@index nào; các index Report hiện có (lines 288-291) là status/publishedAt/id, categoryId, reportType, recommendation.
- 💥 Khi thêm filter audience vào visibleWhere/search (fix F-FND-2), predicate audience không được index hỗ trợ; với catalog lớn (đã ingest ~5.7k report) có thể ảnh hưởng nhẹ. Thường gộp được vào composite index sẵn có.
- 🔧 Cân nhắc thêm audience vào composite index visibility (vd @@index([audience, status, publishedAt])) hoặc xác nhận selectivity đủ để bỏ qua. _(effort S)_

</details>

<details><summary><strong>F-FND-7 · 🔵 INFO</strong> · completeness — F4 Prop Indicators chưa build (đúng dự kiến) — bị chặn bởi external API + cần proxy do CSP</summary>

- 📌 find src/app cho indicator/dashboard/prop → không có route nào; grep 'indicator' toàn src chỉ trúng comment CSS (colors.css:18). CSP next.config.ts:24 đặt `connect-src 'self'` → trình duyệt không gọi được external API.
- 💥 F4 không tồn tại, đúng như spec (BLOCKED chờ client cấp chi tiết API). Không phải lỗi; ghi nhận để rõ phạm vi.
- 🔧 Khi client cấp API: bắt buộc proxy server-side (route handler /api/indicators/* fetch external, cache, trả về same-origin) vì CSP cấm browser→external; cân nhắc khoá secret/API key phía server, rate-limit, và data-localization cho dữ liệu giá. _(effort L)_

</details>

**Gap vs spec:**
- MIGRATION: spec ngầm định prod dùng migrate deploy nhưng KHÔNG có migration nào tạo bảng feature — toàn bộ schema 4-feature chỉ tồn tại qua `prisma db push` thủ công + `psql -f report-fts.sql`, không reproduce trên prod (P0)
- Symbol tagging: spec coi Symbol/ReportSymbol là spine của F1+F2 nhưng chỉ ingest script gắn tag (1 primary/report); thiếu UI/admin action để staff tag ticker → report upload-tay bị mồ côi khỏi search/watchlist; enum audit REPORT_TAG_ADD/REMOVE chưa được dùng
- Audience gate: spec yêu cầu INTERNAL không lọt vào search client và notify client, nhưng audience hoàn toàn không được lọc trong visibleWhere/listWatchersToNotify/searchReports (chỉ F3 attachments lọc) — invariant #2 thất bại
- FTS index trong CI/prod: contentTsv + GIN không được tạo bởi migrate deploy; CI không chạy report-fts.sql nên không validate được search path
- Watermark posture: mặc định OFF mâu thuẫn với định vị security-first/private-wealth
- CI coverage: không có integration test chạm DB thật → drift schema không bị phát hiện (false-green 58/58)
- F4 đúng spec là CHƯA build; cần proxy server-side khi unblock do CSP connect-src 'self'

---
