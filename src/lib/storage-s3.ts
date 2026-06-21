import "server-only";
import { Readable, PassThrough } from "node:stream";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import type { StorageAdapter } from "./storage";

/**
 * S3-compatible StorageAdapter (Supabase Storage / AWS S3 / R2). Selected via
 * STORAGE_DRIVER=supabase|s3 in getStorage(). Honors Range so the PDF viewer's
 * 206 streaming works. Keys are server-controlled and never exposed; the bucket
 * is PRIVATE and reached only with the service-level S3 keys.
 */
// Generic S3 config — works with AWS S3 (omit S3_ENDPOINT), Supabase Storage,
// Cloudflare R2, MinIO, etc. Falls back to the older SUPABASE_S3_* names.
const env = (k: string) => process.env[`S3_${k}`] ?? process.env[`SUPABASE_S3_${k}`];
const S3_ENDPOINT = env("ENDPOINT"); // unset for AWS (SDK uses the region default)

let _client: S3Client | undefined;
function client(): S3Client {
  // Lazily built so env is read at call time, not module load.
  return (_client ??= new S3Client({
    region: env("REGION") ?? process.env.AWS_REGION ?? "us-east-1",
    ...(S3_ENDPOINT ? { endpoint: S3_ENDPOINT } : {}),
    // Custom endpoints (Supabase/R2/MinIO) need path-style; AWS uses vhost-style.
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE
      ? process.env.S3_FORCE_PATH_STYLE === "true"
      : Boolean(S3_ENDPOINT),
    credentials: {
      accessKeyId: env("ACCESS_KEY_ID") ?? "",
      secretAccessKey: env("SECRET_ACCESS_KEY") ?? "",
    },
  }));
}
const BUCKET = () => process.env.S3_BUCKET ?? process.env.SUPABASE_STORAGE_BUCKET ?? "reports";

async function toBuffer(s: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of s) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(chunks);
}

export const s3Adapter: StorageAdapter = {
  async put(key, data) {
    await client().send(
      new PutObjectCommand({
        Bucket: BUCKET(),
        Key: key,
        Body: Buffer.isBuffer(data) ? data : Buffer.from(data),
      }),
    );
  },

  async get(key) {
    const res = await client().send(new GetObjectCommand({ Bucket: BUCKET(), Key: key }));
    return toBuffer(res.Body as Readable);
  },

  // Sync signature (matches the fs adapter): return a PassThrough immediately and
  // feed it from the async GetObject. CRITICAL: tear down the upstream HTTP body +
  // in-flight request when the consumer destroys the PassThrough (client abort /
  // pdf.js range cancel) — Node's pipe does NOT destroy the source on destination
  // teardown, so without this the upstream socket/fd leaks on every cancel.
  getStream(key, range) {
    const pass = new PassThrough();
    const Range = range ? `bytes=${range.start}-${range.end}` : undefined;
    const ac = new AbortController();
    let body: Readable | undefined;
    pass.on("close", () => {
      ac.abort();
      body?.destroy();
    });
    client()
      .send(new GetObjectCommand({ Bucket: BUCKET(), Key: key, Range }), { abortSignal: ac.signal })
      .then((res) => {
        body = res.Body as Readable;
        if (pass.destroyed) {
          body.destroy(); // aborted during the round-trip
          return;
        }
        body.on("error", (e) => pass.destroy(e));
        body.pipe(pass);
      })
      .catch((e) => {
        if (!pass.destroyed) pass.destroy(e instanceof Error ? e : new Error(String(e)));
      });
    return pass;
  },

  async stat(key) {
    try {
      const res = await client().send(new HeadObjectCommand({ Bucket: BUCKET(), Key: key }));
      return { exists: true, size: res.ContentLength ?? 0 };
    } catch (e) {
      const err = e as { $metadata?: { httpStatusCode?: number }; name?: string };
      if (err.$metadata?.httpStatusCode === 404 || err.name === "NotFound" || err.name === "NoSuchKey") {
        return { exists: false, size: 0 };
      }
      throw e; // a transient/network/auth error must NOT masquerade as 404
    }
  },

  async del(key) {
    try {
      await client().send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key }));
    } catch {
      /* best-effort */
    }
  },

  async removePrefix(prefix) {
    const c = client();
    let token: string | undefined;
    do {
      const list = await c.send(
        new ListObjectsV2Command({ Bucket: BUCKET(), Prefix: prefix, ContinuationToken: token }),
      );
      const objs = (list.Contents ?? []).map((o) => ({ Key: o.Key as string }));
      if (objs.length) {
        await c.send(new DeleteObjectsCommand({ Bucket: BUCKET(), Delete: { Objects: objs } }));
      }
      token = list.IsTruncated ? list.NextContinuationToken : undefined;
    } while (token);
  },
};
