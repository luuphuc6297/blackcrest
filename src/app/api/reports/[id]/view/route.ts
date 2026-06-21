import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canViewReport } from "@/lib/authz";
import { resolveStreamKey } from "@/lib/watermark";
import { getStorage, webStream } from "@/lib/storage";
import { logReportAccess } from "@/lib/audit";

// SDK storage + pdf-lib need Node streams (blueprint §F1, §9).
export const runtime = "nodejs";

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "0.0.0.0"
  );
}

/**
 * Stream a per-user watermarked PDF for inline viewing. Authorizes auth +
 * entitlement on EVERY request (blueprint §6.1), supports Range/206 for pdf.js,
 * and never exposes the underlying storage URL.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "APPROVED") {
    return new Response("Unauthorized", { status: 401 });
  }
  // Re-validate against the DB on every stream (defense in depth): a suspension
  // or forced re-login (tokenVersion bump) must revoke access immediately, not
  // when the 30-minute JWT expires.
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
  const { id } = await params;

  const report = await prisma.report.findUnique({
    where: { id },
    select: { id: true, slug: true, fileKey: true },
  });
  if (!report) return new Response("Not found", { status: 404 });

  if (!(await canViewReport(session.user.id, session.user.role, id))) {
    return new Response("Forbidden", { status: 403 });
  }

  const key = await resolveStreamKey(
    report,
    { id: session.user.id, email: session.user.email ?? "" },
    clientIp(req),
  );
  if (!key) return new Response("Tài liệu chưa có tệp PDF.", { status: 404 });

  const storage = getStorage();
  const { size } = await storage.stat(key);

  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="${report.slug}.pdf"`,
    "Cache-Control": "private, no-store",
    "Accept-Ranges": "bytes",
    // Gated, per-user watermarked stream — never index/cache/snippet it.
    "X-Robots-Tag": "noindex, noarchive, nosnippet",
  };

  // Fire-and-forget access log (after authorization).
  void logReportAccess({
    userId: session.user.id,
    reportId: id,
    action: "VIEW",
    ip: clientIp(req),
    userAgent: req.headers.get("user-agent"),
  });

  const range = req.headers.get("range");
  const m = range?.match(/bytes=(\d*)-(\d*)/);
  if (m) {
    const start = m[1] ? parseInt(m[1], 10) : 0;
    const end = m[2] ? parseInt(m[2], 10) : size - 1;
    if (start >= size || end >= size || start > end) {
      return new Response("Range Not Satisfiable", {
        status: 416,
        headers: {
          "Content-Range": `bytes */${size}`,
          "X-Robots-Tag": "noindex, noarchive, nosnippet",
        },
      });
    }
    const stream = storage.getStream(key, { start, end });
    return new Response(webStream(stream, req.signal), {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }

  const stream = storage.getStream(key);
  return new Response(webStream(stream, req.signal), {
    status: 200,
    headers: { ...baseHeaders, "Content-Length": String(size) },
  });
}
