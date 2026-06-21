import "server-only";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isStaff } from "@/lib/rbac";

export type ViewerAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  audience: "CLIENT" | "INTERNAL";
  createdAt: Date;
};

/**
 * Attachments a viewer may see on a report they can ALREADY open (report
 * visibility is enforced upstream by canViewReport in getReportBySlug / the
 * page). CLIENT files → everyone entitled; INTERNAL files → staff only.
 */
export async function listReportAttachments(reportId: string, role: Role): Promise<ViewerAttachment[]> {
  return prisma.reportAttachment.findMany({
    where: isStaff(role) ? { reportId } : { reportId, audience: "CLIENT" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      fileSize: true,
      audience: true,
      createdAt: true,
    },
  });
}
