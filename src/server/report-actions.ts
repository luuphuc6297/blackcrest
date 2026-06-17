"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ReportStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { REVIEW_TRANSITIONS } from "@/lib/report-transitions";

const schema = z.object({
  reportId: z.string().cuid(),
  decision: z.enum(["approve", "reject", "publish"]),
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
  decision: "approve" | "reject" | "publish";
  note?: string;
}): Promise<ReviewResult> {
  let actor;
  try {
    actor = await requireRole("SUPER_ADMIN", "APPROVER");
  } catch {
    return { ok: false, error: "Bạn không có quyền duyệt báo cáo." };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Yêu cầu không hợp lệ." };
  const { reportId, decision, note } = parsed.data;

  // State machine (SEC-09 / STATE-N1): each decision is only valid from
  // specific current states — illegal jumps are rejected. The map lives in
  // @/lib/report-transitions (pure + unit-tested; single source of truth).
  const rule = REVIEW_TRANSITIONS[decision];
  const status = rule.to;

  const existing = await prisma.report.findUnique({
    where: { id: reportId },
    select: { id: true, status: true },
  });
  if (!existing) return { ok: false, error: "Không tìm thấy báo cáo." };

  if (!rule.from.includes(existing.status)) {
    return {
      ok: false,
      error: "Không thể thực hiện thao tác này ở trạng thái hiện tại của báo cáo.",
    };
  }

  // Guard the write against a concurrent transition (optimistic): only update
  // if the status is still one we validated.
  const res = await prisma.report.updateMany({
    where: { id: reportId, status: { in: rule.from } },
    data: decision === "publish" ? { status, publishedAt: new Date() } : { status },
  });
  if (res.count !== 1) {
    return {
      ok: false,
      error: "Trạng thái báo cáo vừa thay đổi. Vui lòng tải lại.",
    };
  }

  await logAudit({
    actorId: actor.id,
    action:
      decision === "approve"
        ? "REPORT_APPROVE"
        : decision === "reject"
          ? "REPORT_REJECT"
          : "REPORT_PUBLISH",
    targetType: "Report",
    targetId: reportId,
    metadata: note ? { note } : undefined,
  });

  revalidatePath("/[locale]/reports/[slug]", "page");
  revalidatePath("/[locale]/admin/reports", "page");
  return { ok: true, status };
}
