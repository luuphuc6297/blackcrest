import "server-only";
import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isStaff } from "@/lib/rbac";

/**
 * THE single authorization function for report visibility (blueprint §F2, §6.1).
 * Call from EVERY RSC / Server Action / Route Handler that touches a report.
 *
 * Non-staff visibility = report is PUBLISHED AND (PUBLIC OR an entitlement exists
 * for one of the user's groups, at the report OR its category). Expressed with
 * Prisma `some` (compiles to correlated EXISTS — no JOIN-then-DISTINCT row
 * duplication when a user is in multiple groups).
 */
export async function canViewReport(
  userId: string,
  role: Role,
  reportId: string,
): Promise<boolean> {
  if (isStaff(role)) return true; // staff bypass — explicit, never implicit

  const hit = await prisma.report.findFirst({
    where: { id: reportId, ...visibleWhere(userId) },
    select: { id: true },
  });
  return hit !== null;
}

/** The reusable WHERE fragment for "reports this client may see". */
function visibleWhere(userId: string): Prisma.ReportWhereInput {
  const memberOf = { group: { members: { some: { userId } } } };
  return {
    status: "PUBLISHED",
    OR: [
      { accessLevel: "PUBLIC" },
      { entitlements: { some: memberOf } }, // group → report
      { category: { entitlements: { some: memberOf } } }, // group → category
    ],
  };
}

export type VisibleReport = Awaited<
  ReturnType<typeof listVisibleReports>
>["items"][number];

/**
 * Paginated list of reports a user may see, with translations resolved in the
 * app layer (requested → vi → any) so reports missing a translation never
 * vanish (blueprint §F4). Keyset pagination on (publishedAt, id).
 */
export async function listVisibleReports(opts: {
  userId: string;
  role: Role;
  locale: string;
  take?: number;
  cursor?: string | null;
  categorySlug?: string | null;
}) {
  const { userId, role, locale, take = 12, cursor, categorySlug } = opts;

  const where: Prisma.ReportWhereInput = isStaff(role)
    ? { status: "PUBLISHED" }
    : visibleWhere(userId);
  if (categorySlug) where.category = { ...(where.category as object), slug: categorySlug };

  const rows = await prisma.report.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { translations: true, category: true },
  });

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;

  const items = page.map((r) => ({
    id: r.id,
    slug: r.slug,
    status: r.status,
    accessLevel: r.accessLevel,
    publishedAt: r.publishedAt,
    pageCount: r.pageCount,
    coverLabel: r.coverLabel,
    category: r.category,
    ...resolveTranslation(r.translations, locale),
  }));

  return { items, nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null };
}

/** Resolve a report's display fields with the requested → vi → any fallback. */
export function resolveTranslation(
  translations: { locale: string; title: string; summary: string | null; author: string | null }[],
  locale: string,
) {
  const pick =
    translations.find((t) => t.locale === locale) ??
    translations.find((t) => t.locale === "vi") ??
    translations[0];
  return {
    title: pick?.title ?? "(không có tiêu đề)",
    summary: pick?.summary ?? null,
    author: pick?.author ?? null,
  };
}
