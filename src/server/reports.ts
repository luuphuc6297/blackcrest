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
    ...resolveTranslation(report.translations, locale),
  };
}

/** Lightweight portal stats (real counts + representative figures). */
export async function getPortalSummary(user: { id: string; role: Role }) {
  const memberGroups = await prisma.groupMembership.findMany({
    where: { userId: user.id },
    include: { group: true },
  });
  const latest = await prisma.report.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: [{ publishedAt: "desc" }],
    select: { publishedAt: true },
  });
  return {
    groups: memberGroups.map((m) => m.group.name),
    latestPublishedAt: latest?.publishedAt ?? null,
  };
}

/** All reports across statuses — admin Reports table (staff only). */
export async function listAdminReports(locale: string) {
  const rows = await prisma.report.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: { translations: true, category: true },
  });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    status: r.status,
    accessLevel: r.accessLevel,
    publishedAt: r.publishedAt,
    updatedAt: r.updatedAt,
    pageCount: r.pageCount,
    categoryLabel: categoryName(r.category, locale),
    ...resolveTranslation(r.translations, locale),
  }));
}

export async function listCategories() {
  return prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
}
