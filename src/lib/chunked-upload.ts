/**
 * Browser side of the resumable chunked upload. No external libraries — the
 * SHA-256 is computed with the built-in Web Crypto API (data stays local).
 *
 * Keep CHUNK_SIZE in sync with src/lib/upload-session.ts (server validates it).
 */
const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB — must match the server
const CHUNK_TIMEOUT_MS = 30_000;
const CHUNK_RETRIES = 3;
const CONCURRENCY = 3;

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export type UploadState =
  | "hashing"
  | "uploading"
  | "finalizing"
  | "done"
  | "canceled"
  | "error";

export type UploadMeta = {
  categoryId: string;
  accessLevel: string;
  // No `status`: uploads always create a DRAFT; publishing is an APPROVER action.
  titleVi: string;
  summaryVi?: string;
  authorVi?: string;
  titleEn?: string;
  titleZh?: string;
};

export type UploadResult = { slug: string; duplicate: boolean };

export class UploadCanceledError extends Error {}

export type UploadCallbacks = {
  onState?: (state: UploadState) => void;
  /** 0..1 across the chunk-transfer phase. */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
};

async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function aborted(signal?: AbortSignal) {
  return !!signal?.aborted;
}

/** PUT one chunk with a per-chunk timeout; caller handles retry. */
async function putChunk(
  uploadId: string,
  index: number,
  body: Blob,
  signal: AbortSignal | undefined,
): Promise<void> {
  const timeout = AbortSignal.timeout(CHUNK_TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const res = await fetch(
    `/api/admin/uploads/${uploadId}?index=${index}`,
    {
      method: "PUT",
      body,
      headers: { "Content-Type": "application/octet-stream" },
      signal: combined,
    },
  );
  if (!res.ok) {
    throw new Error(`chunk ${index} failed: ${res.status}`);
  }
}

async function putChunkWithRetry(
  uploadId: string,
  index: number,
  body: Blob,
  signal: AbortSignal | undefined,
): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < CHUNK_RETRIES; attempt++) {
    if (aborted(signal)) throw new UploadCanceledError();
    try {
      await putChunk(uploadId, index, body, signal);
      return;
    } catch (err) {
      if (aborted(signal)) throw new UploadCanceledError();
      lastErr = err;
      // Exponential backoff before retrying this chunk only (not the whole file).
      await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("chunk failed");
}

/** Run a pool of workers over indices with bounded concurrency. */
async function uploadChunks(
  uploadId: string,
  file: File,
  pending: number[],
  alreadyDone: number,
  totalChunks: number,
  cb: UploadCallbacks,
): Promise<void> {
  let completed = alreadyDone;
  cb.onProgress?.(totalChunks ? completed / totalChunks : 0);

  let cursor = 0;
  const worker = async () => {
    while (cursor < pending.length) {
      if (aborted(cb.signal)) throw new UploadCanceledError();
      const index = pending[cursor++];
      const start = index * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      await putChunkWithRetry(uploadId, index, file.slice(start, end), cb.signal);
      completed++;
      cb.onProgress?.(totalChunks ? completed / totalChunks : 1);
    }
  };
  const runners = Array.from(
    { length: Math.min(CONCURRENCY, pending.length) },
    () => worker(),
  );
  await Promise.all(runners);
}

async function postJson(url: string, body: unknown, signal?: AbortSignal) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const json = await res.json().catch(() => ({}));
  return { res, json } as { res: Response; json: Record<string, unknown> };
}

/**
 * Upload `file` as a Report. Resumable: if the same content is already
 * partially uploaded, only the missing chunks are sent. Idempotent: the same
 * file finalizes to the same Report (deduplicated by SHA-256).
 */
export async function uploadFileChunked(
  file: File,
  meta: UploadMeta,
  cb: UploadCallbacks = {},
): Promise<UploadResult> {
  if (aborted(cb.signal)) throw new UploadCanceledError();

  cb.onState?.("hashing");
  const sha256 = await sha256Hex(file);
  if (aborted(cb.signal)) throw new UploadCanceledError();

  const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));

  // 1) init / resume
  const init = await postJson(
    "/api/admin/uploads",
    {
      filename: file.name,
      totalSize: file.size,
      totalChunks,
      sha256,
      meta,
    },
    cb.signal,
  );
  if (!init.res.ok || !init.json.ok) {
    throw new Error(String(init.json.error ?? "init_failed"));
  }
  const uploadId = String(init.json.uploadId);
  const received: number[] = Array.isArray(init.json.received)
    ? (init.json.received as number[])
    : [];

  // 2) upload missing chunks
  cb.onState?.("uploading");
  const have = new Set(received);
  const pending = Array.from({ length: totalChunks }, (_, i) => i).filter(
    (i) => !have.has(i),
  );

  try {
    await uploadChunks(uploadId, file, pending, received.length, totalChunks, cb);

    // 3) finalize (one re-fill pass if the server reports gaps)
    cb.onState?.("finalizing");
    let fin = await postJson(`/api/admin/uploads/${uploadId}`, {}, cb.signal);
    if (
      !fin.res.ok &&
      fin.json.error === "incomplete" &&
      Array.isArray(fin.json.missing)
    ) {
      await uploadChunks(
        uploadId,
        file,
        fin.json.missing as number[],
        totalChunks - (fin.json.missing as number[]).length,
        totalChunks,
        cb,
      );
      fin = await postJson(`/api/admin/uploads/${uploadId}`, {}, cb.signal);
    }
    if (!fin.res.ok || !fin.json.ok) {
      throw new Error(String(fin.json.error ?? "finalize_failed"));
    }
    cb.onState?.("done");
    return {
      slug: String(fin.json.slug),
      duplicate: Boolean(fin.json.duplicate),
    };
  } catch (err) {
    if (aborted(cb.signal) || err instanceof UploadCanceledError) {
      // Best-effort: drop the server session + its parts.
      void fetch(`/api/admin/uploads/${uploadId}`, { method: "DELETE" }).catch(
        () => {},
      );
      cb.onState?.("canceled");
      throw new UploadCanceledError();
    }
    cb.onState?.("error");
    throw err;
  }
}
