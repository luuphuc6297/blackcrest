import "server-only";
import type { Prisma, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { categoryName } from "@/server/reports";

const ACCOUNT_STATUSES: UserStatus[] = ["PENDING", "APPROVED", "SUSPENDED"];

/** Overall account counts — admin stat cards (filter/page independent). */
export async function getAccountStatusCounts() {
  await requireRole("SUPER_ADMIN", "APPROVER");
  const [total, active, pending, admins] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "APPROVED" } }),
    prisma.user.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { role: "SUPER_ADMIN" } }),
  ]);
  return { total, active, pending, admins };
}

/** Admin Accounts table (staff only) — search + status filter + pagination. */
export async function listAccounts(
  opts: {
    q?: string | null;
    status?: string | null;
    page?: number;
    pageSize?: number;
  } = {},
) {
  await requireRole("SUPER_ADMIN", "APPROVER");
  const pageSize = opts.pageSize ?? 10;
  const page = Math.max(1, opts.page ?? 1);

  const where: Prisma.UserWhereInput = {};
  const term = opts.q?.trim();
  if (term) {
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { organization: { contains: term, mode: "insensitive" } },
    ];
  }
  if (opts.status && (ACCOUNT_STATUSES as string[]).includes(opts.status)) {
    where.status = opts.status as UserStatus;
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        memberships: { include: { group: { select: { name: true } } } },
      },
    }),
  ]);

  const items = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    organization: u.organization,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt,
    groups: u.memberships.map((m) => m.group.name),
  }));

  return {
    items,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Groups with their current entitlements + member count (staff only). */
export async function listGroupsWithEntitlements(locale: string) {
  await requireRole("SUPER_ADMIN", "APPROVER");
  const groups = await prisma.group.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { members: true } },
      entitlements: {
        include: {
          category: true,
          report: { include: { translations: true } },
        },
      },
    },
  });
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    memberCount: g._count.members,
    entitlements: g.entitlements.map((e) => ({
      id: e.id,
      kind: e.categoryId ? ("category" as const) : ("report" as const),
      label: e.category
        ? categoryName(e.category, locale)
        : (e.report?.translations.find((t) => t.locale === locale)?.title ??
          e.report?.translations.find((t) => t.locale === "vi")?.title ??
          "—"),
    })),
  }));
}

/** Recent audit events (staff only) — blueprint §6.5. */
export async function listAuditLog(take = 50) {
  await requireRole("SUPER_ADMIN", "APPROVER");
  const events = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: { actor: { select: { name: true, email: true } } },
  });
  return events.map((e) => ({
    id: e.id,
    action: e.action,
    targetType: e.targetType,
    targetId: e.targetId,
    actor: e.actor?.name ?? "—",
    metadata: e.metadata,
    createdAt: e.createdAt,
  }));
}
