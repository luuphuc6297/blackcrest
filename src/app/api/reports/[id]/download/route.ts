import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { reportVisibilityWhere } from "@/lib/authz";
import { consumeDownloadToken } from "@/lib/download-token";
import { resolveStreamKey } from "@/lib/watermark";
import { getStorage, webStream } from "@/lib/storage";
import { logReportAccess } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 60;

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "0.0.0.0"
  );
}

/**
 * Download via a one-time, ~60s token (blueprint §F1). The token is consumed
 * atomically; we then RE-CHECK the user is still active + entitled (defense in
 * depth — the token alone is not trusted) before streaming as an attachment.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return new Response("Missing token", { status: 400 });

  const claim = await consumeDownloadToken(token);
  if (!claim || claim.reportId !== id) {
    return new Response("Forbidden", { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: claim.userId },
    select: { id: true, email: true, role: true, status: true },
  });
  if (!user || user.status !== "APPROVED") {
    return new Response("Forbidden", { status: 403 });
  }

  // Report fetch with the entitlement gate folded in (one query, not
  // findUnique-then-canViewReport on the same row). null = missing or not entitled.
  const report = await prisma.report.findFirst({
    where: { id, ...reportVisibilityWhere(user.id, user.role) },
    select: { id: true, slug: true, fileKey: true },
  });
  if (!report) return new Response("Not found", { status: 404 });

  const target = await resolveStreamKey(
    report,
    { id: user.id, email: user.email },
    clientIp(req),
  );
  if (!target) return new Response("Tài liệu chưa có tệp PDF.", { status: 404 });
  const { key, size } = target;

  const storage = getStorage();

  void logReportAccess({
    userId: user.id,
    reportId: id,
    action: "DOWNLOAD",
    ip: clientIp(req),
    userAgent: req.headers.get("user-agent"),
  });

  const stream = storage.getStream(key);
  return new Response(webStream(stream, req.signal), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${report.slug}.pdf"`,
      "Content-Length": String(size),
      "Cache-Control": "private, no-store",
      // Gated, per-user watermarked attachment — never index/cache/snippet it.
      "X-Robots-Tag": "noindex, noarchive, nosnippet",
    },
  });
}
