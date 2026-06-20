# Blackcrest ⟷ Firm_Web — Audit so sánh

> So sánh `tranphat258/Firm_Web-` ("Investment Firm Website") với Blackcrest hiện tại. Cả hai ~7.3k LOC, Next.js + TypeScript + Tailwind + next-intl, cùng ngành (asset management). Nhưng **định vị ngược nhau**.

## TL;DR
- **Firm_Web = website marketing/content + portal nhẹ.** Bề mặt public phong phú (about/careers/contact/insights/research) + Payload CMS + Supabase + Turborepo monorepo. Mạnh về **SEO/acquisition & content ops** — đúng thứ Blackcrest đang thiếu.
- **Blackcrest = gated document portal security-first.** Entitlement isolation, per-user watermark, one-time token, lifecycle duyệt, audit, tests+CI. Mạnh hơn **rất nhiều** ở lõi "giao tài liệu mật cho đúng client".
- **Chúng bổ sung cho nhau, không phải bản sao.** Mỗi bên giỏi đúng cái bên kia yếu.

---

## Bảng so sánh

| Tiêu chí | Firm_Web | Blackcrest |
|---|---|---|
| Định vị | Marketing site + content + portal nhẹ | Gated private-wealth document portal |
| Public surface | **Rộng**: about, careers, contact, insights(blog), research (equity/macro/sectors) | **Mỏng**: chỉ landing |
| Content authoring | **Payload CMS v2** (non-dev publish được) | Không (seed/hardcode) |
| Stack | Next **14**, React 18, Supabase (Auth+DB+Storage), Payload, **Turborepo monorepo** | Next **15**, React 19, Prisma+Postgres, NextAuth v5, fs/S3, single app |
| Auth | **Supabase Auth** (managed: invite, magic-link, reset) | NextAuth v5 + argon2 (tự quản, tokenVersion revocation) |
| **Authorization** | **Role-only** (client/admin/staff) → **MỌI client thấy MỌI report** | **Entitlement per-group** → client chỉ thấy report được cấp |
| **Phát báo cáo (PDF)** | Supabase **signed URL 1h** (chia sẻ được, **không watermark**) | Stream có auth + **per-user watermark** + **one-time token 60s** bound user+report |
| DB security | **Postgres RLS** (defense-in-depth ở tầng DB) | App-layer only (**không RLS**) |
| Upload validation | `type==pdf` thôi (no magic-byte, no size cap, no parse) | magic-byte + pdf-lib parse + size cap + chunked/resumable |
| Lifecycle | `is_public` boolean / CMS | DRAFT→REVIEW→APPROVED→PUBLISHED + audit |
| Audit | chỉ `downloads_log` | AuditLog (append-only) + ReportAccessLog |
| Forms | react-hook-form + zod | server actions + zod + useActionState |
| i18n | next-intl | next-intl (độ phủ cao hơn) |
| Tests / CI / git | ❌ / ❌ / ✅ | ✅ 34 tests / ✅ CI / ✅ git |
| Shared UI | `@firm/ui` + `@firm/config` package | trong app |
| Deploy | Vercel + Railway (Payload) | Docker + nginx self-host |
| SEO | **mạnh** (nhiều trang public + CMS) | yếu (mỏng — nhưng gate đúng) |

---

## Deep-dive: lõi chung — bảo mật báo cáo PDF

Cả hai đều "investment firm + gated reports", nên đây là trục so sánh quan trọng nhất.

### Firm_Web — coarse, có khe hở cho ngữ cảnh private-wealth
- **Không có entitlement isolation.** RLS `reports_authenticated_read` (init.sql) cho **bất kỳ** user role `client`/`admin` đọc **tất cả** report không-public. Không có khái niệm group/grant/per-client (grep entitlement = rỗng). → Một client thấy **toàn bộ** kho research.
- **Signed URL 1 giờ, chia sẻ được.** `research/[id]/download` + `signed-url` trả `createSignedUrl(..., 3600)`. Link đó **ai cầm cũng tải được trong 1h**, không auth lại, không single-use. → rò một link = rò file.
- **Không watermark.** Tải về là **bản gốc**, không truy vết được người làm rò.
- **Upload yếu:** chỉ check `file.type === "application/pdf"` (giả mạo được), **không** magic-byte / size cap / pdf-lib parse.
- ✅ Có làm đúng: role đọc từ DB (không tin JWT), rollback file khi insert lỗi, service-role key chỉ ở server, `create-user` admin-only + rollback.
- ⚠️ **2 định nghĩa schema `research_reports` chồng nhau** (init.sql vs scripts/migrations/001) — phân kỳ, dễ lệch.
- ⚠️ `download` và `signed-url` gần như **trùng route** (auth→role→fetch→sign).

### Blackcrest — fine-grained, đúng chuẩn confidential
- **Entitlement isolation thật** (`canViewReport`/`visibleWhere`) áp ở page + 2 stream route; client chỉ thấy report được cấp cho group.
- **One-time download token** (jose, 60s, bound user+report, single-use atomic) — chống chia sẻ lại.
- **Per-user watermark** đóng dấu danh tính lên PDF khi phát.
- Upload **hardened** (magic-byte + pdf-lib + cap + chunked/resumable + dedup sha256).
- Audit đầy đủ + lifecycle duyệt.

**Kết luận lõi:** cho nhiệm vụ "giao tài liệu mật cho đúng người và truy vết được", **Blackcrest vượt trội**. Mô hình signed-URL/role-only của Firm_Web phù hợp cho "research công khai cho mọi khách đã đăng nhập", **không** phù hợp cho tài liệu cá nhân hoá theo từng nhà đầu tư.

**Nhưng** Firm_Web có **một thứ Blackcrest nên học: RLS ở tầng DB** — một lỗi authz trong code Blackcrest = rò dữ liệu (không có lưới an toàn); RLS sẽ là lớp phòng thủ thứ hai. (Lưu ý: Firm_Web tự làm yếu RLS vì các route dùng **service-role key bỏ qua RLS**, và signed URL bỏ qua RLS hoàn toàn — nên lợi ích RLS của họ cũng chỉ một phần.)

---

## Blackcrest nên "mượn" gì từ Firm_Web
1. **Bề mặt marketing + CMS** (insights/research/careers/about/contact) — chính xác là gap SEO/acquisition đã bàn. Firm_Web là "cỗ máy marketing" mà Blackcrest thiếu. Nếu muốn SEO thật → đây là blueprint trang public cần thêm.
2. **Postgres RLS làm defense-in-depth** cho dữ liệu entitlement (lưới an toàn khi code authz có bug).
3. **CMS cho content** (Payload hoặc tương đương) để publish bài viết/insight không cần deploy.
4. **react-hook-form** cho UX form client phong phú hơn (validation realtime).
5. (Cân nhắc) **monorepo + shared UI package** nếu định tách thêm app (marketing site riêng).

## Firm_Web nên "mượn" gì từ Blackcrest
1. **Entitlement isolation** — đừng để mọi client thấy mọi report.
2. **One-time/short-lived token + watermark** thay signed-URL 1h chia sẻ được.
3. **Upload hardening** (magic-byte + size + parse).
4. **Tests + CI** (cả hai đều thiếu, nhưng Blackcrest đã có 34 test + CI).
5. **Audit trail đầy đủ** + lifecycle duyệt.
6. Dọn **route trùng** (download/signed-url) và **schema migration trùng**.

## Điểm yếu CHUNG (cả hai)
- **Không test tự động, không CI** (Firm_Web) — Blackcrest đã khắc phục, Firm_Web thì chưa.
- **Không ESLint config riêng** (đều dựa `next lint`).
- Upload/route có chỗ trùng lặp; thiếu rate-limit ở một số endpoint.

---

## Khuyến nghị
- **Không thay thế Blackcrest bằng Firm_Web** cho lõi document-delivery — Firm_Web yếu hơn hẳn về confidentiality (no isolation/no watermark/shareable link).
- **Lấy phần public/marketing/CMS + RLS của Firm_Web** ghép vào Blackcrest để vá đúng 2 gap lớn nhất của Blackcrest (SEO/acquisition mỏng + thiếu defense-in-depth DB).
- Mô hình lý tưởng: **kiến trúc Blackcrest (gated core) + lớp marketing/CMS kiểu Firm_Web + RLS** = vừa kín vừa tìm thấy được.
