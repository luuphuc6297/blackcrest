import "server-only";
import type { Category, Prisma, ReportStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canViewReport, resolveTranslation } from "@/lib/authz";

const REPORT_STATUSES: ReportStatus[] = [
  "DRAFT",
  "REVIEW",
  "APPROVED",
  "PUBLISHED",
  "REJECTED",
  "ARCHIVED",
];

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

/** Overall report counts by status — drives the admin stat cards (filter/page
 * independent). Returns { total, DRAFT, REVIEW, ... }. */
export async function getReportStatusCounts() {
  const grouped = await prisma.report.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const counts: Record<string, number> = { total: 0 };
  for (const s of REPORT_STATUSES) counts[s] = 0;
  for (const g of grouped) {
    counts[g.status] = g._count._all;
    counts.total += g._count._all;
  }
  return counts;
}

/** Admin Reports table (staff only) — search + status filter + pagination. */
export async function listAdminReports(
  locale: string,
  opts: {
    q?: string | null;
    status?: string | null;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const pageSize = opts.pageSize ?? 10;
  const page = Math.max(1, opts.page ?? 1);

  const where: Prisma.ReportWhereInput = {};
  const term = opts.q?.trim();
  if (term) {
    where.OR = [
      { slug: { contains: term, mode: "insensitive" } },
      {
        translations: {
          some: {
            OR: [
              { title: { contains: term, mode: "insensitive" } },
              { author: { contains: term, mode: "insensitive" } },
            ],
          },
        },
      },
    ];
  }
  if (opts.status && (REPORT_STATUSES as string[]).includes(opts.status)) {
    where.status = opts.status as ReportStatus;
  }

  const [total, rows] = await Promise.all([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { translations: true, category: true },
    }),
  ]);

  const items = rows.map((r) => ({
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

  return {
    items,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** All reports as { id, title } for select dropdowns (e.g. entitlement grant). */
export async function listReportOptions(locale: string) {
  const rows = await prisma.report.findMany({
    orderBy: [{ updatedAt: "desc" }],
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
