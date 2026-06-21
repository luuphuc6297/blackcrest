import { Readable } from "node:stream";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canViewReport } from "@/lib/authz";
import { isStaff, requireCapability } from "@/lib/rbac";
import { getStorage } from "@/lib/storage";
import { logReportAccess } from "@/lib/audit";

export const runtime = "nodejs";

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "0.0.0.0"
  );
}

/**
 * F3: download a report attachment. Authorizes on EVERY request — session
 * freshness (status + tokenVersion), then canViewReport (same entitlement gate
 * as the PDF), then the per-attachment audience gate (INTERNAL → staff only).
 * Streams via the storage seam as a forced download; the storage key is never
 * exposed. No watermark / no Range (binary office formats don't benefit).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "APPROVED") {
    return new Response("Unauthorized", { status: 401 });
  }
  const fresh = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { status: true, tokenVersion: true },
  });
  if (
    !fresh ||
    fresh.status !== "APPROVED" ||
    fresh.tokenVersion !== session.user.tokenVersion
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id: reportId, attachmentId } = await params;
  const att = await prisma.reportAttachment.findFirst({
    where: { id: attachmentId, reportId },
    select: { fileKey: true, fileName: true, mimeType: true, audience: true },
  });
  if (!att) return new Response("Not found", { status: 404 });

  // Entitlement: must be able to view the parent report …
  if (!(await canViewReport(session.user.id, session.user.role, reportId))) {
    return new Response("Forbidden", { status: 403 });
  }
  // … and INTERNAL attachments are staff-only regardless of report entitlement.
  if (att.audience === "INTERNAL" && !isStaff(session.user.role)) {
    return new Response("Forbidden", { status: 403 });
  }

  const storage = getStorage();
  const { exists, size } = await storage.stat(att.fileKey);
  if (!exists) return new Response("Not found", { status: 404 });

  void logReportAccess({
    userId: session.user.id,
    reportId,
    action: "DOWNLOAD",
    ip: clientIp(req),
    userAgent: req.headers.get("user-agent"),
  });

  // RFC 5987: ascii fallback + utf-8 for Vietnamese filenames.
  const ascii = att.fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  const utf8 = encodeURIComponent(att.fileName);

  const stream = storage.getStream(att.fileKey);
  // Destroy the fs handle if the source errors (e.g. the blob is deleted between
  // stat() and read) or the client disconnects mid-download — avoids fd leaks.
  stream.on("error", () => stream.destroy());
  req.signal.addEventListener("abort", () => stream.destroy());
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": att.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`,
      "Content-Length": String(size),
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, noarchive, nosnippet",
    },
  });
}

/** Staff removes an attachment (row + blob + audit). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  let actor;
  try {
    actor = await requireCapability("report.upload");
  } catch {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const { id: reportId, attachmentId } = await params;

  const att = await prisma.reportAttachment.findFirst({
    where: { id: attachmentId, reportId },
    select: { id: true, fileKey: true, fileName: true },
  });
  if (!att) return Response.json({ error: "not_found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.reportAttachment.delete({ where: { id: att.id } });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "REPORT_DELETE",
        targetType: "Report",
        targetId: reportId,
        metadata: { kind: "attachment", attachmentId: att.id, fileName: att.fileName },
      },
    });
  });
  // Best-effort blob cleanup after the row is gone.
  await getStorage().del(att.fileKey).catch(() => {});
  return Response.json({ ok: true });
}
