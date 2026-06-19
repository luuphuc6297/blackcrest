import type { NextRequest } from "next/server";
import { requireCapability } from "@/lib/rbac";
import {
  recordChunk,
  getSessionStatus,
  finalizeUpload,
  abortUpload,
} from "@/lib/upload-session";

export const runtime = "nodejs";

async function actor(): Promise<string | null> {
  try {
    // Fresh DB re-check on every upload op (status + tokenVersion + role).
    return (await requireCapability("report.upload")).id;
  } catch {
    return null;
  }
}

/** GET — resume support: which chunks are already stored. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await actor();
  if (!userId) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const res = await getSessionStatus(id, userId);
  if (!res.ok) return Response.json({ error: res.error }, { status: res.status });
  return Response.json(res);
}

/** PUT /api/admin/uploads/:id?index=N — store one chunk (raw octet body). */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await actor();
  if (!userId) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const index = Number(req.nextUrl.searchParams.get("index"));
  if (!Number.isInteger(index)) {
    return Response.json({ error: "index" }, { status: 400 });
  }

  const ab = await req.arrayBuffer();
  const res = await recordChunk({
    sessionId: id,
    userId,
    index,
    buf: Buffer.from(ab),
  });
  if (!res.ok) return Response.json({ error: res.error }, { status: res.status });
  return Response.json(res);
}

/** POST /api/admin/uploads/:id — finalize (assemble + verify + create Report). */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await actor();
  if (!userId) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const res = await finalizeUpload({ sessionId: id, userId });
  if (!res.ok) {
    return Response.json(
      { error: res.error, missing: res.missing },
      { status: res.status },
    );
  }
  return Response.json(res);
}

/** DELETE — cancel an in-flight upload and drop its parts. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await actor();
  if (!userId) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const ok = await abortUpload(id, userId);
  if (!ok) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ ok: true });
}
