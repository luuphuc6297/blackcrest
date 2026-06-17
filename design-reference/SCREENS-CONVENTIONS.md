# Screen recreation conventions — UI kits → Next.js routes

Recreate the bundle UI kits as REAL Next.js App Router pages, wired to the real
auth + data layer. Match the bundle visually; compose the already-ported
components (do NOT re-implement Button/Card/etc.). Vietnamese content. Monochrome
institutional look.

## Read first
1. `design-reference/PORTING-CONVENTIONS.md` — token utility cheat-sheet + aesthetic guardrails (still apply).
2. Your screen's UI kit under `design-reference/ui_kits/<product>/` — read `index.html`, the `*.jsx`, and `README.md`. Reproduce its layout/structure.
3. The components you'll use, to get EXACT props: files in `src/components/ui/*.tsx`, `src/components/icon.tsx` (Icon + IconName), `src/components/app-shell.tsx` (AppShell + NavEntry), `src/components/logo.tsx`, `src/components/language-switcher.tsx`.

## Imports available
- UI: `import { Button, IconButton, Input, Select, Checkbox, Switch, Badge, Tag, Tooltip, Dialog, Toast, Avatar, Card, Tabs } from "@/components/ui"`
- `import { Icon } from "@/components/icon"` — `<Icon name="download" size={16} />` (kebab names; read icon.tsx for the full set; add new ones there only if missing).
- `import { AppShell } from "@/components/app-shell"`, `import { Logo } from "@/components/logo"`, `import { LanguageSwitcher } from "@/components/language-switcher"`.
- Nav: `import { portalNav, adminNav } from "@/lib/nav"`.
- Formatters: `import { formatVND, formatVNDCompact, formatPercent, formatNumber, formatDate, formatDateTime } from "@/lib/format"` — ALL figures use these + `font-mono` + `data-numeric`.
- Locale links: `import { Link } from "@/i18n/navigation"` (NEVER next/link). i18n: `getTranslations`, `setRequestLocale` from `next-intl/server` (RSC); `useTranslations`, `useLocale` (client).

## Page conventions
- Every page is `async` and receives `params: Promise<{ locale: string; ... }>`. First line of the body: `const { locale } = await params; setRequestLocale(locale);`.
- Auth: `import { auth } from "@/auth"; const session = await auth();` → `session.user` = `{ id, role, status, name, email }`. (client)/(admin) layouts already guard; in pages just use `session.user` (and `notFound()` / redirect for missing resources).
- RSC by default. Add a small `"use client"` island ONLY for interactive bits (forms, the viewer canvas, tabs). Keep data-fetching in the RSC page and pass plain props to islands.

## Data layer (call these — do not write raw Prisma in pages)
- `import { listVisibleReports, resolveTranslation } from "@/lib/authz"`
  `await listVisibleReports({ userId, role, locale, take?, cursor?, categorySlug? })` → `{ items: [{ id, slug, status, accessLevel, publishedAt, pageCount, coverLabel, category, title, summary, author }], nextCursor }`.
- `import { getReportBySlug, getPortalSummary, listAdminReports, listCategories, categoryName } from "@/server/reports"`
  `getReportBySlug(slug, locale, { id, role })` → detail or null. `getPortalSummary({id,role})` → `{ groups: string[], latestPublishedAt }`. `listAdminReports(locale)`, `listCategories()`.
- `import { listAccounts, listGroupsWithEntitlements, listAuditLog } from "@/server/admin-data"`.
- Server Actions (form `action={fn}`, each takes FormData with a hidden field):
  - `@/server/accounts`: `approveAccount`, `rejectAccount`, `suspendAccount`, `reinstateAccount` — FormData field `userId`.
  - `@/server/entitlements`: `grantEntitlement` (fields `groupId` + exactly one of `reportId`/`categoryId`), `revokeEntitlement` (field `entitlementId`).
  - `@/server/auth-actions`: `loginAction`, `registerAction` for `useActionState` (signature `(prevState, formData) => Promise<AuthFormState>`; `AuthFormState = { status: "idle"|"error"|"success"; message?; fieldErrors? }`).

## Status → Badge tone
draft→`tone="draft"`, review→`"review"`, approved→`"approved"`, published→`"published"`, rejected→`"rejected"`, archived→`"neutral"`. Account status: PENDING→`"review"`, APPROVED→`"approved"`, SUSPENDED→`"danger"`. Labels via `t("Status.<key>")` / `t("Roles.<ROLE>")` (messages/*.json already have these).

## Routes you may be assigned (create the file(s) exactly here)
- `src/app/[locale]/(public)/page.tsx` — marketing landing (public, no AppShell; own sticky header + dark CTA band + footer).
- `src/app/[locale]/(public)/login/page.tsx` (+ `login-form.tsx` client) and `.../register/page.tsx` (+ `register-form.tsx` client).
- `src/app/[locale]/(client)/portal/page.tsx` — investor dashboard (AppShell, portalNav, activeKey "overview"): greeting using `session.user.name`, KPI cards (representative wealth figures via formatters — these are illustrative, the schema has no portfolio), recent documents from `listVisibleReports`.
- `src/app/[locale]/(client)/reports/page.tsx` — full document library (AppShell, activeKey "documents"): category filter + report cards/rows, each links to `/reports/[slug]`.
- `src/app/[locale]/(client)/reports/[slug]/page.tsx` (+ a `"use client"` viewer island) — THE PDF VIEWER (core). `getReportBySlug` → `notFound()` if null. Toolbar (zoom, page nav, download/print/share), thumbnail rail, scrollable canvas recreating the mock report pages (mirror `ReportPages.jsx`: cover + content pages, the diagonal "BẢO MẬT" watermark + "chỉ dành cho nhà đầu tư" footer), and the approval side-panel. Show approval actions (Phê duyệt/Từ chối) ONLY when `isStaff(session.user.role)` (import `isStaff` from `@/lib/rbac`). The "Tải xuống" button may link to `/api/reports/${id}/view` (real endpoint, may not have a file yet — that's fine).
- `src/app/[locale]/(admin)/admin/reports/page.tsx` — admin reports table (AppShell, adminNav, active "reports"): `listAdminReports`, status pills, the draft→duyệt→phát hành workflow. Use the `.table` look (header row, alternating rows, hairline borders).
- `src/app/[locale]/(admin)/admin/accounts/page.tsx` — accounts table: `listAccounts`, role + status, per-row approve/suspend `<form action={...}>` with hidden `userId` + a `<Button type="submit">`.
- `src/app/[locale]/(admin)/admin/entitlements/page.tsx` — `listGroupsWithEntitlements` per-group cards listing entitlements with a revoke form, plus a grant form (group select + report/category select).
- `src/app/[locale]/(admin)/admin/audit/page.tsx` — `listAuditLog` table (actor, action, target, time via `formatDateTime`).

## Rules
- Compose the ported components; use Tailwind token utilities; keep figures in `font-mono`. No emoji. Vietnamese copy (match the bundle's tone/casing). Sentence case for buttons EXCEPT the Button component already uppercases.
- Do NOT edit components, tokens, globals.css, server/lib files, or middleware. Only create/replace the page + island files you are assigned.
- It must typecheck (React 19, TS strict). Return ONLY the structured summary.
