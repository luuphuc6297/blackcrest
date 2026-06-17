"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

const idSchema = z.object({ userId: z.string().cuid() });

async function setStatus(
  userId: string,
  status: UserStatus,
  action: Parameters<typeof logAudit>[0]["action"],
) {
  const actor = await requireRole("SUPER_ADMIN", "APPROVER");
  const updated = await prisma.user.update({
    where: { id: userId },
    // Bump tokenVersion on suspend so any live JWT is invalidated promptly.
    data: {
      status,
      ...(status === "SUSPENDED" ? { tokenVersion: { increment: 1 } } : {}),
    },
    select: { id: true, email: true },
  });
  await logAudit({
    actorId: actor.id,
    action,
    targetType: "User",
    targetId: updated.id,
    metadata: { email: updated.email, status },
  });
  revalidatePath("/[locale]/admin/accounts", "page");
}

export async function approveAccount(formData: FormData) {
  const { userId } = idSchema.parse({ userId: formData.get("userId") });
  await setStatus(userId, "APPROVED", "ACCOUNT_APPROVE");
}

export async function rejectAccount(formData: FormData) {
  const { userId } = idSchema.parse({ userId: formData.get("userId") });
  await setStatus(userId, "SUSPENDED", "ACCOUNT_REJECT");
}

export async function suspendAccount(formData: FormData) {
  const { userId } = idSchema.parse({ userId: formData.get("userId") });
  await setStatus(userId, "SUSPENDED", "ACCOUNT_SUSPEND");
}

export async function reinstateAccount(formData: FormData) {
  const { userId } = idSchema.parse({ userId: formData.get("userId") });
  await setStatus(userId, "APPROVED", "ACCOUNT_REINSTATE");
}
