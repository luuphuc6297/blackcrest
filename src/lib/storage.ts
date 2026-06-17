import "server-only";
import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

/**
 * Storage adapter (blueprint §1). Default driver = filesystem volume; the
 * interface is shaped so a SeaweedFS/S3 driver can drop in later. NEVER expose
 * these keys/paths to the client — PDFs are streamed only through the authed
 * endpoint (blueprint §6.2).
 */
export interface StorageAdapter {
  put(key: string, data: Buffer | Uint8Array): Promise<void>;
  get(key: string): Promise<Buffer>;
  getStream(key: string, range?: { start: number; end: number }): Readable;
  stat(key: string): Promise<{ exists: boolean; size: number }>;
  del(key: string): Promise<void>;
  /** Recursively remove a prefix/directory (e.g. an upload session's chunks). */
  removePrefix(prefix: string): Promise<void>;
}

const STORAGE_ROOT = path.resolve(
  process.env.STORAGE_ROOT ?? path.join(process.cwd(), "storage"),
);

/** Reject path traversal; keys are server-controlled but defense in depth. */
function resolveKey(key: string): string {
  const clean = path
    .normalize(key)
    .replace(/^(\.\.(\/|\\|$))+/, "")
    .replace(/^[/\\]+/, "");
  const full = path.join(STORAGE_ROOT, clean);
  if (!full.startsWith(STORAGE_ROOT + path.sep) && full !== STORAGE_ROOT) {
    throw new Error("Invalid storage key");
  }
  return full;
}

const filesystemAdapter: StorageAdapter = {
  async put(key, data) {
    const full = resolveKey(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  },
  async get(key) {
    return readFile(resolveKey(key));
  },
  getStream(key, range) {
    return createReadStream(resolveKey(key), range);
  },
  async stat(key) {
    try {
      const s = await stat(resolveKey(key));
      return { exists: s.isFile(), size: s.size };
    } catch {
      return { exists: false, size: 0 };
    }
  },
  async del(key) {
    try {
      await rm(resolveKey(key), { force: true });
    } catch {
      /* best-effort cleanup */
    }
  },
  async removePrefix(prefix) {
    try {
      await rm(resolveKey(prefix), { recursive: true, force: true });
    } catch {
      /* best-effort cleanup */
    }
  },
};

export function getStorage(): StorageAdapter {
  // Only the filesystem driver is implemented in the MVP.
  return filesystemAdapter;
}

export { STORAGE_ROOT };
