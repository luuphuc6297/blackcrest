"use server";

import { z } from "zod";
import { canViewReport } from "@/lib/authz";
import { requireFreshUser } from "@/lib/rbac";
import { mintDownloadToken } from "@/lib/download-token";

/**
 * Mint a one-time download URL (blueprint §F1). Re-validates status from the DB
 * and the entitlement before issuing — the token is short-lived and single-use.
 * The client navigates to the returned URL.
 */
export async function requestDownloadUrl(
  reportId: string,
): Promise<{ url: string } | { error: string }> {
  const id = z.string().cuid().safeParse(reportId);
  if (!id.success) return { error: "Tài liệu không hợp lệ." };

  const user = await requireFreshUser();
  if (!(await canViewReport(user.id, user.role, id.data))) {
    return { error: "Bạn không có quyền tải tài liệu này." };
  }

  const token = await mintDownloadToken({
    userId: user.id,
    reportId: id.data,
  });
  return { url: `/api/reports/${id.data}/download?token=${token}` };
}
