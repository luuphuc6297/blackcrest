import type { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { reportVisibilityWhere } from "@/lib/authz";
import { resolveStreamKey } from "@/lib/watermark";
import { getStorage, webStream } from "@/lib/storage";
import { logReportAccess } from "@/lib/audit";

// SDK storage + pdf-lib need Node streams (blueprint §F1, §9).
export const runtime = "nodejs";
// Insurance ceiling for slow clients / large PDFs streamed range-by-range.
export const maxDuration = 60;

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
  const { id } = await params;

  // One round-trip pair instead of three serial reads:
  //  • freshness re-check (defense in depth — a suspension / forced re-login via
  //    tokenVersion bump revokes access immediately, not at JWT expiry), and
  //  • the report fetch with the entitlement gate FOLDED IN (reportVisibilityWhere)
  //    so a non-entitled report returns null in one query rather than
  //    findUnique-then-canViewReport re-reading the same row.
  const [fresh, report] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { status: true, tokenVersion: true },
    }),
    prisma.report.findFirst({
      where: { id, ...reportVisibilityWhere(session.user.id, session.user.role) },
      select: { id: true, slug: true, fileKey: true },
    }),
  ]);
  if (
    !fresh ||
    fresh.status !== "APPROVED" ||
    fresh.tokenVersion !== session.user.tokenVersion
  ) {
    return new Response("Unauthorized", { status: 401 });
  }
  // null = not found OR not entitled; 404 (don't reveal existence to non-entitled).
  if (!report) return new Response("Not found", { status: 404 });

  const target = await resolveStreamKey(
    report,
    { id: session.user.id, email: session.user.email ?? "" },
    clientIp(req),
  );
  if (!target) return new Response("Tài liệu chưa có tệp PDF.", { status: 404 });
  const { key, size } = target;

  const storage = getStorage();
  // Weak ETag over (key,size): a full-document reload revalidates cheaply (304,
  // no re-stream). `no-cache` keeps EVERY request re-authorized above, so a
  // revoked user is still rejected — caching never bypasses the entitlement gate.
  const etag = `W/"${size.toString(16)}-${createHash("sha1")
    .update(key)
    .digest("hex")
    .slice(0, 16)}"`;

  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="${report.slug}.pdf"`,
    "Cache-Control": "private, no-cache, must-revalidate",
    ETag: etag,
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
  // Conditional full-document GET: client already holds this exact body → 304.
  if (!range && req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: baseHeaders });
  }
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
