"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

/**
 * Grant a group an entitlement to EXACTLY ONE of a report or a category
 * (blueprint §F2). Only APPROVER / SUPER_ADMIN. Writes an immutable audit row.
 */
const grantSchema = z
  .object({
    groupId: z.string().cuid(),
    reportId: z.string().cuid().optional(),
    categoryId: z.string().cuid().optional(),
  })
  .refine((d) => !!d.reportId !== !!d.categoryId, {
    message: "Phải chọn đúng một trong báo cáo hoặc danh mục.",
  });

export async function grantEntitlement(formData: FormData) {
  const actor = await requireRole("SUPER_ADMIN", "APPROVER");
  const parsed = grantSchema.parse({
    groupId: formData.get("groupId"),
    reportId: formData.get("reportId") || undefined,
    categoryId: formData.get("categoryId") || undefined,
  });

  // Idempotent — the (groupId, reportId)/(groupId, categoryId) uniques also guard.
  const existing = await prisma.entitlement.findFirst({
    where: {
      groupId: parsed.groupId,
      reportId: parsed.reportId ?? null,
      categoryId: parsed.categoryId ?? null,
    },
  });
  if (!existing) {
    await prisma.entitlement.create({
      data: { ...parsed, grantedById: actor.id },
    });
    await logAudit({
      actorId: actor.id,
      action: "ENTITLEMENT_GRANT",
      targetType: "Group",
      targetId: parsed.groupId,
      metadata: {
        reportId: parsed.reportId ?? null,
        categoryId: parsed.categoryId ?? null,
      },
    });
  }
  revalidatePath("/[locale]/admin/entitlements", "page");
}

export async function revokeEntitlement(formData: FormData) {
  const actor = await requireRole("SUPER_ADMIN", "APPROVER");
  const { entitlementId } = z
    .object({ entitlementId: z.string().cuid() })
    .parse({ entitlementId: formData.get("entitlementId") });

  const ent = await prisma.entitlement.findUnique({
    where: { id: entitlementId },
  });
  if (ent) {
    await prisma.entitlement.delete({ where: { id: entitlementId } });
    await logAudit({
      actorId: actor.id,
      action: "ENTITLEMENT_REVOKE",
      targetType: "Group",
      targetId: ent.groupId,
      metadata: { reportId: ent.reportId, categoryId: ent.categoryId },
    });
  }
  revalidatePath("/[locale]/admin/entitlements", "page");
}
