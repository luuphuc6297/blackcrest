import "server-only";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/lib/storage";
import { reportMetaSchema, createReportFromPdf, type CreateReportResult } from "@/lib/report-create";

/**
 * Server side of the resumable chunked upload (Upload Flow + File Integrity).
 *
 *   init     → create (or resume) a session; returns which chunks already exist
 *   chunk    → store one part; the (sessionId,index) PK makes re-PUT idempotent
 *   status   → which chunks are present (drives client resume)
 *   finalize → reassemble, verify size + SHA-256, validate PDF, create Report
 *   abort    → drop the session + its parts
 *
 * Why this shape covers the checklist:
 *   idempotency        → uploadId + idempotent finalize (status guard) + dedup
 *   deduplication      → SHA-256 lookup in createReportFromPdf
 *   resume / recovery  → init returns received chunks; client resends only gaps
 *   retry              → per-chunk PUT is idempotent, safe to repeat
 *   completeness       → finalize verifies assembled size === totalSize
 *   corruption / dup   → finalize verifies SHA-256 + parses the PDF
 *   partial detection  → finalize 409s with the list of missing chunks
 */

export const MAX_BYTES = 25 * 1024 * 1024; // 25MB (matches nginx body limit)
export const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB
export const MAX_CHUNKS = Math.ceil(MAX_BYTES / CHUNK_SIZE) + 1;
const SESSION_TTL_MS = 6 * 60 * 60 * 1000; // 6h to finish an upload
const PDF_MAGIC = Buffer.from("%PDF");

function partKey(sessionId: string, index: number): string {
  return `uploads/${sessionId}/${index}.part`;
}

export type InitInput = {
  userId: string;
  filename: string;
  totalSize: number;
  totalChunks: number;
  sha256: string;
  meta: unknown;
};

export type InitResult =
  | { ok: true; uploadId: string; chunkSize: number; received: number[]; resumed: boolean }
  | { ok: false; status: number; error: string };

/** Create a new session, or resume an existing OPEN one with the same content. */
export async function initUploadSession(input: InitInput): Promise<InitResult> {
  const { userId, filename, totalSize, totalChunks, sha256 } = input;

  if (!Number.isInteger(totalSize) || totalSize <= 0 || totalSize > MAX_BYTES) {
    return { ok: false, status: 400, error: "size" };
  }
  if (!Number.isInteger(totalChunks) || totalChunks <= 0 || totalChunks > MAX_CHUNKS) {
    return { ok: false, status: 400, error: "chunks" };
  }
  if (!/^[a-f0-9]{64}$/i.test(sha256)) {
    return { ok: false, status: 400, error: "sha256" };
  }
  const parsedMeta = reportMetaSchema.safeParse(input.meta);
  if (!parsedMeta.success) {
    return { ok: false, status: 400, error: "meta" };
  }
  // Category must exist up-front (clearer than failing only at finalize).
  const category = await prisma.category.findUnique({
    where: { id: parsedMeta.data.categoryId },
    select: { id: true },
  });
  if (!category) return { ok: false, status: 400, error: "category" };

  // Resume: an OPEN session for the same user + content + size already in flight.
  const open = await prisma.uploadSession.findFirst({
    where: { userId, sha256, totalSize, status: "OPEN", expiresAt: { gt: new Date() } },
    select: { id: true, chunkSize: true, chunks: { select: { index: true } } },
  });
  if (open) {
    return {
      ok: true,
      uploadId: open.id,
      chunkSize: open.chunkSize,
      received: open.chunks.map((c) => c.index).sort((a, b) => a - b),
      resumed: true,
    };
  }

  const session = await prisma.uploadSession.create({
    data: {
      userId,
      filename: filename.slice(0, 255),
      totalSize,
      totalChunks,
      chunkSize: CHUNK_SIZE,
      sha256: sha256.toLowerCase(),
      status: "OPEN",
      meta: parsedMeta.data,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
    select: { id: true },
  });
  return { ok: true, uploadId: session.id, chunkSize: CHUNK_SIZE, received: [], resumed: false };
}

type Session = {
  id: string;
  userId: string;
  totalSize: number;
  totalChunks: number;
  chunkSize: number;
  sha256: string;
  status: string;
  reportId: string | null;
  meta: unknown;
  expiresAt: Date;
};

async function loadOwned(sessionId: string, userId: string): Promise<Session | null> {
  const s = await prisma.uploadSession.findUnique({ where: { id: sessionId } });
  if (!s || s.userId !== userId) return null;
  return s as unknown as Session;
}

export type ChunkResult =
  | { ok: true; index: number }
  | { ok: false; status: number; error: string };

/** Store one chunk. Idempotent: the same index can be re-sent (retry/resume). */
export async function recordChunk(opts: {
  sessionId: string;
  userId: string;
  index: number;
  buf: Buffer;
}): Promise<ChunkResult> {
  const { sessionId, userId, index, buf } = opts;
  const session = await loadOwned(sessionId, userId);
  if (!session) return { ok: false, status: 404, error: "not_found" };
  if (session.status !== "OPEN") return { ok: false, status: 409, error: "not_open" };
  if (session.expiresAt.getTime() < Date.now())
    return { ok: false, status: 410, error: "expired" };
  if (!Number.isInteger(index) || index < 0 || index >= session.totalChunks)
    return { ok: false, status: 400, error: "index" };
  // Every chunk is chunkSize except the last; never larger.
  if (buf.length === 0 || buf.length > session.chunkSize)
    return { ok: false, status: 400, error: "chunk_size" };

  await getStorage().put(partKey(sessionId, index), buf);
  await prisma.uploadChunk.upsert({
    where: { sessionId_index: { sessionId, index } },
    create: { sessionId, index, size: buf.length },
    update: { size: buf.length },
  });

  // No COUNT(*) per chunk PUT: the client derives the received-chunk set from the
  // init/status response (which returns the full index list) and ignores this
  // field, so echo the just-recorded index instead of scanning the chunk table.
  return { ok: true, index };
}

export type StatusResult =
  | { ok: true; status: string; received: number[]; totalChunks: number; slug?: string }
  | { ok: false; status: number; error: string };

export async function getSessionStatus(
  sessionId: string,
  userId: string,
): Promise<StatusResult> {
  const session = await loadOwned(sessionId, userId);
  if (!session) return { ok: false, status: 404, error: "not_found" };
  const chunks = await prisma.uploadChunk.findMany({
    where: { sessionId },
    select: { index: true },
    orderBy: { index: "asc" },
  });
  let slug: string | undefined;
  if (session.status === "COMPLETED" && session.reportId) {
    const r = await prisma.report.findUnique({
      where: { id: session.reportId },
      select: { slug: true },
    });
    slug = r?.slug;
  }
  return {
    ok: true,
    status: session.status,
    received: chunks.map((c) => c.index),
    totalChunks: session.totalChunks,
    slug,
  };
}

export type FinalizeResult =
  | { ok: true; reportId: string; slug: string; duplicate: boolean }
  | { ok: false; status: number; error: string; missing?: number[] };

export async function finalizeUpload(opts: {
  sessionId: string;
  userId: string;
}): Promise<FinalizeResult> {
  const { sessionId, userId } = opts;
  const session = await loadOwned(sessionId, userId);
  if (!session) return { ok: false, status: 404, error: "not_found" };

  // Idempotent replay: already finished → return the same report.
  if (session.status === "COMPLETED" && session.reportId) {
    const r = await prisma.report.findUnique({
      where: { id: session.reportId },
      select: { slug: true },
    });
    if (r) return { ok: true, reportId: session.reportId, slug: r.slug, duplicate: true };
  }
  if (session.status === "ABORTED")
    return { ok: false, status: 409, error: "aborted" };
  if (session.expiresAt.getTime() < Date.now())
    return { ok: false, status: 410, error: "expired" };

  // Partial-upload detection — every chunk must be present.
  const present = await prisma.uploadChunk.findMany({
    where: { sessionId },
    select: { index: true },
  });
  const have = new Set(present.map((c) => c.index));
  const missing: number[] = [];
  for (let i = 0; i < session.totalChunks; i++) if (!have.has(i)) missing.push(i);
  if (missing.length) return { ok: false, status: 409, error: "incomplete", missing };

  // Atomically claim finalize so two concurrent finalizes can't double-create.
  const claim = await prisma.uploadSession.updateMany({
    where: { id: sessionId, status: "OPEN" },
    data: { status: "FINALIZING" },
  });
  if (claim.count !== 1) {
    // Someone else is finalizing / already did — re-read and replay.
    const again = await prisma.uploadSession.findUnique({
      where: { id: sessionId },
      select: { status: true, reportId: true },
    });
    if (again?.status === "COMPLETED" && again.reportId) {
      const r = await prisma.report.findUnique({
        where: { id: again.reportId },
        select: { slug: true },
      });
      if (r) return { ok: true, reportId: again.reportId, slug: r.slug, duplicate: true };
    }
    return { ok: false, status: 409, error: "finalizing" };
  }

  try {
    const storage = getStorage();
    // Reassemble in order.
    const parts: Buffer[] = [];
    for (let i = 0; i < session.totalChunks; i++) {
      parts.push(await storage.get(partKey(sessionId, i)));
    }
    const buf = Buffer.concat(parts);

    // Completeness — assembled size must match the declared total.
    if (buf.length !== session.totalSize) {
      await releaseToOpen(sessionId);
      return { ok: false, status: 422, error: "size_mismatch" };
    }
    // Integrity — assembled content must hash to the declared SHA-256.
    const sha = createHash("sha256").update(buf).digest("hex");
    if (sha !== session.sha256) {
      await releaseToOpen(sessionId);
      return { ok: false, status: 422, error: "checksum_mismatch" };
    }
    // Content validation — magic bytes + structural parse.
    if (!buf.subarray(0, 4).equals(PDF_MAGIC)) {
      await failSession(sessionId);
      return { ok: false, status: 415, error: "not_pdf" };
    }
    let pageCount: number;
    try {
      pageCount = (await PDFDocument.load(buf, { ignoreEncryption: true })).getPageCount();
    } catch {
      await failSession(sessionId);
      return { ok: false, status: 422, error: "corrupt_pdf" };
    }

    const parsed = reportMetaSchema.safeParse(session.meta);
    if (!parsed.success) {
      await failSession(sessionId);
      return { ok: false, status: 400, error: "meta" };
    }

    let created: CreateReportResult;
    try {
      created = await createReportFromPdf({
        buf,
        sha256: sha,
        pageCount,
        meta: parsed.data,
        actorId: userId,
      });
    } catch (err) {
      await releaseToOpen(sessionId);
      console.error("[upload] finalize create failed", err);
      return { ok: false, status: 500, error: "create_failed" };
    }

    await prisma.uploadSession.update({
      where: { id: sessionId },
      data: { status: "COMPLETED", reportId: created.reportId },
    });
    await storage.removePrefix(`uploads/${sessionId}`);
    return { ok: true, reportId: created.reportId, slug: created.slug, duplicate: created.duplicate };
  } catch (err) {
    await releaseToOpen(sessionId);
    console.error("[upload] finalize failed", err);
    return { ok: false, status: 500, error: "finalize_failed" };
  }
}

/** Recoverable failure: let the client retry finalize. */
async function releaseToOpen(sessionId: string) {
  await prisma.uploadSession
    .updateMany({ where: { id: sessionId, status: "FINALIZING" }, data: { status: "OPEN" } })
    .catch(() => {});
}

/** Unrecoverable bad content: kill the session + parts. */
async function failSession(sessionId: string) {
  await prisma.uploadSession
    .update({ where: { id: sessionId }, data: { status: "ABORTED" } })
    .catch(() => {});
  await getStorage().removePrefix(`uploads/${sessionId}`);
}

export async function abortUpload(sessionId: string, userId: string): Promise<boolean> {
  const session = await loadOwned(sessionId, userId);
  if (!session) return false;
  if (session.status !== "COMPLETED") {
    await prisma.uploadSession
      .update({ where: { id: sessionId }, data: { status: "ABORTED" } })
      .catch(() => {});
    await getStorage().removePrefix(`uploads/${sessionId}`);
  }
  return true;
}
