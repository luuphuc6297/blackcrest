"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ReportStatus, AccessLevel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getStorage } from "@/lib/storage";
import { getNotifier } from "@/lib/notifier";
import { REVIEW_TRANSITIONS, resolveReportTransition } from "@/lib/report-transitions";

const schema = z.object({
  reportId: z.string().cuid(),
  decision: z.enum(["submit", "approve", "reject", "publish"]),
  note: z.string().max(1000).optional(),
});

export type ReviewResult =
  | { ok: true; status: ReportStatus }
  | { ok: false; error: string };

/**
 * Persist a report lifecycle decision (blueprint draft→duyệt→phát hành). Only
 * APPROVER / SUPER_ADMIN. Writes an immutable audit row and revalidates the
 * viewer + admin list. Replaces the viewer's previously-fake confirmation toast.
 */
export async function reviewReport(input: {
  reportId: string;
  decision: "submit" | "approve" | "reject" | "publish";
  note?: string;
}): Promise<ReviewResult> {
  let actor;
  try {
    // Fresh DB re-check (status + tokenVersion + role): a suspended/demoted
    // APPROVER must NOT be able to approve/publish within the JWT window —
    // same guarantee the upload routes already have (SEC-12).
    actor = await requireCapability("report.review");
  } catch {
    return { ok: false, error: "Bạn không có quyền duyệt báo cáo." };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Yêu cầu không hợp lệ." };
  const { reportId, decision, note } = parsed.data;

  const existing = await prisma.report.findUnique({
    where: { id: reportId },
    select: { id: true, status: true },
  });
  if (!existing) return { ok: false, error: "Không tìm thấy báo cáo." };

  // State machine (SEC-09): each decision is only valid from specific current
  // states — illegal jumps are rejected. resolveReportTransition + the optimistic
  // updateMany guard below share the single map in @/lib/report-transitions.
  const status = resolveReportTransition(decision, existing.status);
  if (!status) {
    return {
      ok: false,
      error: "Không thể thực hiện thao tác này ở trạng thái hiện tại của báo cáo.",
    };
  }

  // Guard the write against a concurrent transition (optimistic): only update
  // if the status is still one we validated.
  const res = await prisma.report.updateMany({
    where: { id: reportId, status: { in: REVIEW_TRANSITIONS[decision].from } },
    data: decision === "publish" ? { status, publishedAt: new Date() } : { status },
  });
  if (res.count !== 1) {
    return {
      ok: false,
      error: "Trạng thái báo cáo vừa thay đổi. Vui lòng tải lại.",
    };
  }

  const AUDIT_ACTION = {
    submit: "REPORT_SUBMIT",
    approve: "REPORT_APPROVE",
    reject: "REPORT_REJECT",
    publish: "REPORT_PUBLISH",
  } as const;
  await logAudit({
    actorId: actor.id,
    action: AUDIT_ACTION[decision],
    targetType: "Report",
    targetId: reportId,
    metadata: note ? { note } : undefined,
  });

  // F2: fan out watchlist alerts on publish. Fully guarded — a notify failure
  // must NEVER fail the publish that already committed above. (Synchronous for
  // now; a queue is the scale path once fan-out grows.)
  if (decision === "publish") {
    try {
      await getNotifier().notifyReportPublished(reportId);
    } catch (err) {
      console.error("[reviewReport] watchlist notify failed:", err);
    }
  }

  revalidatePath("/[locale]/reports/[slug]", "page");
  revalidatePath("/[locale]/admin/reports", "page");
  return { ok: true, status };
}

/* ─────────────────────────────────────────────────────────────────────────
 * Admin reports-table row actions: change access level + delete.
 * ──────────────────────────────────────────────────────────────────────── */

export type ActionResult = { ok: true } | { ok: false; error: string };

const accessSchema = z.object({
  reportId: z.string().cuid(),
  accessLevel: z.enum(["PUBLIC", "RESTRICTED"]),
});

/**
 * Change a report's access level (PUBLIC ↔ RESTRICTED). Classification controls
 * who can see the document, so it is staff-only and audited. Re-checks the role
 * against the DB (requireFreshRole) like the other sensitive writes.
 */
export async function setReportAccess(input: {
  reportId: string;
  accessLevel: AccessLevel;
}): Promise<ActionResult> {
  let actor;
  try {
    actor = await requireCapability("report.setAccess");
  } catch {
    return { ok: false, error: "Bạn không có quyền thay đổi quyền truy cập." };
  }

  const parsed = accessSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Yêu cầu không hợp lệ." };
  const { reportId, accessLevel } = parsed.data;

  const existing = await prisma.report.findUnique({
    where: { id: reportId },
    select: { id: true, accessLevel: true },
  });
  if (!existing) return { ok: false, error: "Không tìm thấy báo cáo." };
  if (existing.accessLevel === accessLevel) return { ok: true }; // no-op

  await prisma.report.update({ where: { id: reportId }, data: { accessLevel } });

  await logAudit({
    actorId: actor.id,
    action: "REPORT_ACCESS",
    targetType: "Report",
    targetId: reportId,
    metadata: { accessLevel },
  });

  revalidatePath("/[locale]/reports/[slug]", "page");
  revalidatePath("/[locale]/admin/reports", "page");
  return { ok: true };
}

const deleteSchema = z.object({ reportId: z.string().cuid() });

/**
 * Permanently delete a report — SUPER_ADMIN only (destructive). Removes the row
 * (translations / entitlements / access-logs cascade) plus its stored file and
 * any outstanding download tokens, then writes an audit row. The audit event is
 * committed INSIDE the transaction so the deletion is never lost; the blob is
 * removed only AFTER the row is gone (so a failed tx never orphans live bytes).
 */
export async function deleteReport(input: {
  reportId: string;
}): Promise<ActionResult> {
  let actor;
  try {
    actor = await requireCapability("report.delete");
  } catch {
    return { ok: false, error: "Bạn không có quyền xoá báo cáo." };
  }

  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Yêu cầu không hợp lệ." };
  const { reportId } = parsed.data;

  const existing = await prisma.report.findUnique({
    where: { id: reportId },
    select: { id: true, slug: true, fileKey: true },
  });
  if (!existing) return { ok: false, error: "Không tìm thấy báo cáo." };

  await prisma.$transaction(async (tx) => {
    // DownloadToken has no FK to Report (just a reportId column) so it does not
    // cascade — clean it up explicitly.
    await tx.downloadToken.deleteMany({ where: { reportId } });
    await tx.report.delete({ where: { id: reportId } });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "REPORT_DELETE",
        targetType: "Report",
        targetId: reportId,
        metadata: { slug: existing.slug },
      },
    });
  });

  // Best-effort blob cleanup after the row is gone. An orphaned blob is harmless
  // (nothing points to it); a missing blob for a deleted row is also fine.
  if (existing.fileKey) {
    try {
      await getStorage().del(existing.fileKey);
    } catch (err) {
      console.error(
        "[deleteReport] blob cleanup failed:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  revalidatePath("/[locale]/admin/reports", "page");
  return { ok: true };
}
