import { createHash, randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/rbac";
import { getStorage } from "@/lib/storage";
import { validateAttachment, MAX_ATTACHMENT_BYTES } from "@/lib/attachment-validate";

export const runtime = "nodejs";

// Allow a little multipart framing overhead above the raw file cap.
const MAX_BODY_BYTES = MAX_ATTACHMENT_BYTES + 1024 * 1024;

/**
 * F3: staff uploads a supplementary Excel/Word file to an existing report.
 * Single-request multipart (attachments are small; the chunked PDF pipeline is
 * PDF→Report-specific). Re-checks the report.upload capability against the DB,
 * validates magic-bytes + blocks macros, dedups by (report, sha256), stores via
 * the storage seam, and writes the row + audit in one transaction.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let actorId: string;
  try {
    actorId = (await requireCapability("report.upload")).id;
  } catch {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const { id: reportId } = await params;

  const report = await prisma.report.findUnique({ where: { id: reportId }, select: { id: true } });
  if (!report) return Response.json({ error: "not_found" }, { status: 404 });

  // Reject oversized bodies BEFORE buffering — Route Handlers have no default body
  // cap and req.formData() materializes the whole body in memory (OOM guard).
  // (Defence-in-depth; prod also caps via nginx client_max_body_size.)
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) {
    return Response.json({ error: "size" }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "file_required" }, { status: 400 });
  }
  const audience = form.get("audience") === "INTERNAL" ? "INTERNAL" : "CLIENT";

  const buf = Buffer.from(await file.arrayBuffer());
  const v = validateAttachment(buf, file.name);
  if (!v.ok) return Response.json({ error: v.error }, { status: 422 });

  const sha256 = createHash("sha256").update(buf).digest("hex");

  // Idempotent: the same bytes already attached to this report → return it.
  const dup = await prisma.reportAttachment.findUnique({
    where: { reportId_sha256: { reportId, sha256 } },
    select: { id: true, fileName: true },
  });
  if (dup) return Response.json({ ok: true, duplicate: true, attachment: dup });

  const fileKey = `attachments/${reportId}/${randomUUID()}.${v.ext}`;
  const storage = getStorage();
  await storage.put(fileKey, buf);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const a = await tx.reportAttachment.create({
        data: {
          reportId,
          fileKey,
          fileName: file.name.slice(0, 255),
          mimeType: v.mime,
          fileSize: buf.length,
          sha256,
          audience,
          uploadedById: actorId,
        },
        select: { id: true, fileName: true, mimeType: true, fileSize: true, audience: true, createdAt: true },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: "REPORT_UPLOAD",
          targetType: "Report",
          targetId: reportId,
          metadata: { kind: "attachment", attachmentId: a.id, fileName: a.fileName, audience },
        },
      });
      return a;
    });
    return Response.json({ ok: true, attachment: created });
  } catch (err) {
    // Roll back the orphaned blob (the row did NOT commit).
    await storage.del(fileKey).catch(() => {});
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const again = await prisma.reportAttachment.findUnique({
        where: { reportId_sha256: { reportId, sha256 } },
        select: { id: true, fileName: true },
      });
      if (again) return Response.json({ ok: true, duplicate: true, attachment: again });
    }
    throw err;
  }
}
