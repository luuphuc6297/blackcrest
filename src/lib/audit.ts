import "server-only";
import type { AccessAction, AuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Append-only audit log (blueprint §6.5) — who approved an account, granted an
 * entitlement, published a report, and when. Never updated or deleted.
 */
export async function logAudit(entry: {
  actorId?: string | null;
  action: AuditAction;
  targetType: string;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId ?? null,
        metadata: entry.metadata,
      },
    });
  } catch (err) {
    // Audit must never break the primary operation, but failures are notable.
    console.error("[audit] failed to write", entry.action, err);
  }
}

/** Per-access log for report VIEW / DOWNLOAD (blueprint §F1). Fire-and-forget. */
export async function logReportAccess(entry: {
  userId: string;
  reportId: string;
  action: AccessAction;
  ip?: string | null;
  userAgent?: string | null;
}) {
  try {
    await prisma.reportAccessLog.create({ data: entry });
  } catch (err) {
    console.error("[access-log] failed to write", entry.action, err);
  }
}
