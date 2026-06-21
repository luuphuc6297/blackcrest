import "server-only";
import type { Category, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canViewReport, resolveTranslation } from "@/lib/authz";

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
  const report = await prisma.report.findUnique({
    where: { slug },
    include: {
      translations: true,
      category: true,
      uploadedBy: { select: { name: true } },
      symbols: {
        orderBy: { isPrimary: "desc" },
        select: { symbol: { select: { id: true, ticker: true } } },
      },
    },
  });
  if (!report) return null;
  if (!(await canViewReport(user.id, user.role, report.id))) return null;

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
    include: {
      translations: true,
      category: true,
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
    include: { translations: true },
  });
  return rows.map((r) => ({
    id: r.id,
    ...resolveTranslation(r.translations, locale),
  }));
}

export async function listCategories() {
  return prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
}
