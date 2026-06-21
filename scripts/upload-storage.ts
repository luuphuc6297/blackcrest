/**
 * Upload the local STORAGE_ROOT tree (reports/*.pdf + attachments/**) to the
 * Supabase Storage bucket, preserving keys 1:1 so the app's view/download routes
 * resolve unchanged. Idempotent: set SKIP_EXISTING=true to skip already-uploaded
 * objects on re-run.
 *
 *   set -a; . ./.env; set +a   # SUPABASE_S3_* + bucket
 *   STORAGE_ROOT=./storage pnpm exec tsx scripts/upload-storage.ts
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const ROOT = path.resolve(process.env.STORAGE_ROOT ?? "./storage");
const env = (k: string) => process.env[`S3_${k}`] ?? process.env[`SUPABASE_S3_${k}`];
const BUCKET = process.env.S3_BUCKET ?? process.env.SUPABASE_STORAGE_BUCKET ?? "reports";
const CONCURRENCY = Number(process.env.UPLOAD_CONCURRENCY ?? 8);
const SKIP_EXISTING = process.env.SKIP_EXISTING === "true";
const S3_ENDPOINT = env("ENDPOINT");

const s3 = new S3Client({
  region: env("REGION") ?? process.env.AWS_REGION ?? "us-east-1",
  ...(S3_ENDPOINT ? { endpoint: S3_ENDPOINT } : {}),
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE
    ? process.env.S3_FORCE_PATH_STYLE === "true"
    : Boolean(S3_ENDPOINT),
  credentials: {
    accessKeyId: env("ACCESS_KEY_ID") ?? "",
    secretAccessKey: env("SECRET_ACCESS_KEY") ?? "",
  },
});

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
};

async function* walk(dir: string): AsyncGenerator<string> {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

async function exists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!env("ACCESS_KEY_ID") || !env("SECRET_ACCESS_KEY")) {
    throw new Error("Missing S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY — set them in env first.");
  }
  // Only object-store content: reports/ + attachments/. Skip transient/regenerable
  // local-only dirs (uploads/ chunk parts, cache/ watermark cache).
  const PREFIXES = ["reports/", "attachments/"];
  const all: string[] = [];
  for await (const f of walk(ROOT)) all.push(f);
  const files = all.filter((f) => {
    const key = path.relative(ROOT, f).split(path.sep).join("/");
    return PREFIXES.some((p) => key.startsWith(p));
  });
  console.log(
    `${files.length} files (of ${all.length}) under ${ROOT} → bucket "${BUCKET}" ` +
      `(concurrency=${CONCURRENCY}, skipExisting=${SKIP_EXISTING}); skipping cache/ + uploads/`,
  );

  let done = 0, skipped = 0, failed = 0, idx = 0;
  async function worker() {
    while (idx < files.length) {
      const f = files[idx++];
      const key = path.relative(ROOT, f).split(path.sep).join("/");
      try {
        if (SKIP_EXISTING && (await exists(key))) {
          skipped++;
        } else {
          const Body = await fs.readFile(f);
          await s3.send(
            new PutObjectCommand({
              Bucket: BUCKET,
              Key: key,
              Body,
              ContentType: MIME[path.extname(f).toLowerCase()] ?? "application/octet-stream",
            }),
          );
          done++;
        }
      } catch (e) {
        failed++;
        console.error(`  FAIL ${key}: ${(e as Error).message.slice(0, 80)}`);
      }
      const n = done + skipped + failed;
      if (n % 200 === 0) console.log(`  ${n}/${files.length} (up=${done} skip=${skipped} fail=${failed})`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`DONE: uploaded=${done} skipped=${skipped} failed=${failed} of ${files.length}`);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
