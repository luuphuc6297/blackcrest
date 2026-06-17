# Blackcrest

Cổng phân phối **tài liệu đầu tư tư nhân** có kiểm soát truy cập (gated research
portal) — thị trường VN, đa ngôn ngữ (vi · en · zh), lõi là **trình xem & phê
duyệt PDF**. Server-first Next.js, bảo mật là trục thiết kế.

Giao diện theo **Blackcrest Design System** (đơn sắc trắng–đen kiểu Blackstone,
góc vuông, hairline, serif cho khoảnh khắc biên tập). Xem `design-reference/`.

## Stack
- **Next.js 15** App Router (TypeScript, RSC-first, `output: standalone`)
- **Tailwind v4** với design tokens qua `@theme` (token = nguồn chân lý)
- **PostgreSQL 17 + Prisma**
- **Auth.js v5** (Credentials + JWT) · **@node-rs/argon2** (Argon2id)
- **next-intl v4** (vi/en/zh) · **pdf-lib + fontkit** (watermark) · **jose** (download token)

## Yêu cầu
- Node ≥ 22 (dự án dùng `nvm use 22`) + **pnpm** (corepack)
- Docker (Postgres)

## Chạy local
```bash
pnpm install
cp .env.example .env            # đã có sẵn .env với secret dev nếu bạn vừa scaffold
docker compose up -d db         # Postgres trên 127.0.0.1:5432
pnpm db:migrate                 # áp dụng migrations (gồm CHECK entitlement)
pnpm db:seed                    # dữ liệu mẫu tiếng Việt + 2 nhóm khách
pnpm tsx scripts/generate-sample-pdfs.ts   # tạo PDF mẫu cho trình xem
pnpm dev                        # http://localhost:3000 → /vi
```

### Tài khoản mẫu (mật khẩu chung: `Blackcrest@2026`)
| Email | Vai trò | Trạng thái |
|---|---|---|
| `admin@blackcrest.vn` | SUPER_ADMIN | APPROVED |
| `editor@blackcrest.vn` | EDITOR | APPROVED |
| `approver@blackcrest.vn` | APPROVER | APPROVED |
| `minhanh@gia-an.vn` | CLIENT (Quỹ Gia An) | APPROVED |
| `trung@tran-family.vn` | CLIENT (Gia tộc Trần) | APPROVED |
| `pending@khach-moi.vn` | CLIENT | **PENDING** (chưa login được) |

> Kiểm thử cô lập entitlement (blueprint §6.14): `minhanh` thấy danh mục *Báo cáo
> tháng* + báo cáo *Danh mục phòng thủ*; `trung` chỉ thấy báo cáo *Cơ hội công
> nghệ*. Báo cáo PUBLIC (bản tin, tổng quan tuần) mọi nhà đầu tư đều xem được.

## Scripts
- `pnpm dev` · `pnpm build` · `pnpm start`
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm db:migrate` · `pnpm db:seed` · `pnpm db:studio`

## Bảo mật (đã hiện thực — blueprint §6)
- `lib/authz.canViewReport()` gọi ở **mọi** RSC/Action/Route Handler; staff bypass tường minh.
- PDF chỉ stream qua endpoint có auth (`/api/reports/[id]/view|download`), không lộ URL storage.
- Watermark động theo user (email + thời điểm + IP) trên mọi trang; cache theo (report+user).
- Download bằng **token một lần, ~60s** (jose + jti lưu DB, tiêu thụ nguyên tử).
- Argon2id; chặn login khi `status != APPROVED` ở `authorize` **và** data layer; `tokenVersion` để thu hồi.
- Audit log bất biến (duyệt account, gán entitlement…). Middleware **không** là biên bảo mật (CVE-2025-29927).

## Triển khai (blueprint §5)
`Dockerfile` (standalone) + `docker-compose.prod.yml` (web + nginx + db, DB bind
127.0.0.1) + `nginx/` (TLS, `limit_req` cho `/api/auth`, `client_max_body_size 12m`)
+ `scripts/backup.sh` (pg_dump + rclone offsite VN, 3-2-1). Blue/green: 2 service
web sau nginx upstream, chuyển traffic sau khi `/api/health` = 200.

## Cấu trúc
```
src/
  app/[locale]/(public|client|admin)/   # màn hình theo route group
  app/api/{auth,health,reports/[id]/{view,download}}/
  components/ui/                          # design system đã port (Tailwind TSX)
  components/{app-shell,icon,logo,language-switcher}.tsx
  lib/{authz,rbac,password,storage,watermark,download-token,audit,format,nav}.ts
  server/                                 # data fns (server-only) + Server Actions
  i18n/ · auth.ts · auth.config.ts · middleware.ts
prisma/ · messages/{vi,en,zh}.json · design-reference/ (bản gốc Claude Design)
```
