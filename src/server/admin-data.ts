import "server-only";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/rbac";
import { categoryName } from "@/server/reports";

/** Admin Accounts table (staff only) — full list; the client table does the
 * (instant, in-memory) search / status-filter / pagination. */
export async function listAccounts() {
  await requireCapability("admin.viewData");
  const users = await prisma.user.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 500,
    include: {
      memberships: { include: { group: { select: { name: true } } } },
    },
  });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    organization: u.organization,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt,
    groups: u.memberships.map((m) => m.group.name),
  }));
}

/** Groups with their current entitlements + member count (staff only). */
export async function listGroupsWithEntitlements(locale: string) {
  await requireCapability("admin.viewData");
  const groups = await prisma.group.findMany({
    orderBy: { name: "asc" },
    take: 200,
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
  await requireCapability("admin.viewData");
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
