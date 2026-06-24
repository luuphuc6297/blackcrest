import "server-only";
import type { Category, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { reportVisibilityWhere, resolveTranslation } from "@/lib/authz";

export function categoryName(category: Category, locale: string): string {
  if (locale === "en") return category.nameEn;
  if (locale === "zh") return category.nameZh;
  return category.nameVi;
}

/** Report detail for a viewer — null if not found OR not entitled (blueprint §6.1). */
export async function getReportBySlug(
  slug: string,
  locale: string,
  user: { id: string; role: Role },
) {
  // ONE entitlement-gated query: the visibility predicate is folded into the
  // WHERE (reportVisibilityWhere), so a non-entitled report returns null here
  // instead of a second canViewReport() findFirst on the same row. `select` (not
  // `include`) keeps the heavy @db.Text `contentText` body off this hot path.
  const report = await prisma.report.findFirst({
    where: { slug, ...reportVisibilityWhere(user.id, user.role) },
    select: {
      id: true,
      slug: true,
      status: true,
      accessLevel: true,
      publishedAt: true,
      pageCount: true,
      coverLabel: true,
      fileKey: true,
      category: true,
      uploadedBy: { select: { name: true } },
      translations: { select: { locale: true, title: true, summary: true, author: true } },
      symbols: {
        orderBy: { isPrimary: "desc" },
        select: { symbol: { select: { id: true, ticker: true } } },
      },
    },
  });
  if (!report) return null;

  return {
    id: report.id,
    slug: report.slug,
    status: report.status,
    accessLevel: report.accessLevel,
    publishedAt: report.publishedAt,
    pageCount: report.pageCount,
    coverLabel: report.coverLabel,
    hasFile: !!report.fileKey,
    category: report.category,
    categoryLabel: categoryName(report.category, locale),
    uploadedBy: report.uploadedBy?.name ?? null,
    symbols: report.symbols.map((s) => ({ id: s.symbol.id, ticker: s.symbol.ticker })),
    ...resolveTranslation(report.translations, locale),
  };
}

/** Admin Reports table (staff only) — full list; the client table does the
 * (instant, in-memory) search / status-filter / pagination. */
export async function listAdminReports(locale: string) {
  const rows = await prisma.report.findMany({
    orderBy: [{ updatedAt: "desc" }],
    take: 500,
    // SELECT (not include) — never drag the heavy `contentText` body (~8KB/row,
    // ~22KB/full row) into a 500-row admin list. Same trap REPORT_CARD_SELECT
    // avoids on the client paths (commit bc8550f); this was the admin leftover.
    select: {
      id: true,
      slug: true,
      status: true,
      accessLevel: true,
      publishedAt: true,
      updatedAt: true,
      pageCount: true,
      category: true,
      translations: { select: { locale: true, title: true, summary: true, author: true } },
      symbols: { orderBy: { isPrimary: "desc" }, select: { symbol: { select: { ticker: true } } } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    status: r.status,
    accessLevel: r.accessLevel,
    publishedAt: r.publishedAt,
    updatedAt: r.updatedAt,
    pageCount: r.pageCount,
    tickers: r.symbols.map((s) => s.symbol.ticker),
    categoryLabel: categoryName(r.category, locale),
    ...resolveTranslation(r.translations, locale),
  }));
}

/** All reports as { id, title } for select dropdowns (e.g. entitlement grant). */
export async function listReportOptions(locale: string) {
  const rows = await prisma.report.findMany({
    orderBy: [{ updatedAt: "desc" }],
    take: 1000,
    // Dropdown needs only { id, title } — narrow select avoids dragging every
    // Report scalar + all-locale summary/author across the wire for 1000 rows.
    select: {
      id: true,
      translations: { select: { locale: true, title: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    ...resolveTranslation(r.translations, locale),
  }));
}

export async function listCategories() {
  return prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
}
