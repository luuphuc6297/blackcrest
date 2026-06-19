import type { NextRequest } from "next/server";
import { requireCapability } from "@/lib/rbac";
import { initUploadSession } from "@/lib/upload-session";

// Chunked-upload control plane runs on Node (Prisma + pdf-lib at finalize).
export const runtime = "nodejs";

/** POST /api/admin/uploads — open (or resume) a chunked upload session. */
export async function POST(req: NextRequest) {
  let actorId: string;
  try {
    // Fresh DB re-check (status + tokenVersion + role) — a suspended/revoked
    // user must not be able to keep uploading within the JWT window.
    actorId = (await requireCapability("report.upload")).id;
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    filename?: unknown;
    totalSize?: unknown;
    totalChunks?: unknown;
    sha256?: unknown;
    meta?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_json" }, { status: 400 });
  }

  const result = await initUploadSession({
    userId: actorId,
    filename: typeof body.filename === "string" ? body.filename : "upload.pdf",
    totalSize: Number(body.totalSize),
    totalChunks: Number(body.totalChunks),
    sha256: typeof body.sha256 === "string" ? body.sha256 : "",
    meta: body.meta,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json({
    ok: true,
    uploadId: result.uploadId,
    chunkSize: result.chunkSize,
    received: result.received,
    resumed: result.resumed,
  });
}
