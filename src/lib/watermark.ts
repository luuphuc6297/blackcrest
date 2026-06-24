import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { getStorage } from "@/lib/storage";
import { watermarkEnabled } from "@/lib/flags";

/** Resolved stream target — the key to stream AND its byte size (captured from
 * the stat/save the resolver already performs, so the route never stat()s again). */
export type StreamTarget = { key: string; size: number };

/**
 * Per-user PDF watermark (blueprint §F1, §6.6) — NOT DRM, a leak-tracing stamp.
 * pdf-lib + fontkit + a Unicode (Vietnamese) font, since StandardFonts cannot
 * encode tiếng Việt. The watermarked output is cached by (reportId + userId) so
 * we stamp once per user, not per request.
 */
let cachedFont: Buffer | null = null;
async function loadFontBytes(): Promise<Buffer> {
  if (!cachedFont) {
    cachedFont = await readFile(
      path.join(process.cwd(), "assets/fonts/BeVietnamPro-Regular.ttf"),
    );
  }
  return cachedFont;
}

function userHash(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 16);
}

function watermarkKey(reportId: string, userId: string): string {
  return `cache/wm/${reportId}/${userHash(userId)}.pdf`;
}

async function stamp(
  baseBytes: Buffer,
  meta: { email: string; ip: string; when: Date },
): Promise<Uint8Array> {
  // Dynamic-import the heavy pdf-lib/fontkit CJS trees only when a watermark is
  // actually produced. Watermarking is OFF by default, so the common /view and
  // /download paths (which import resolveStreamKey from this module) no longer
  // drag pdf-lib into their cold-start bundle.
  const { PDFDocument, degrees, rgb } = await import("pdf-lib");
  const fontkit = (await import("@pdf-lib/fontkit")).default;

  const pdf = await PDFDocument.load(baseBytes, { ignoreEncryption: true });
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(await loadFontBytes(), { subset: true });

  const stampedAt = new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(meta.when);
  const footer = `BẢO MẬT · ${meta.email} · ${stampedAt} · ${meta.ip} · chỉ dành cho nhà đầu tư`;

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();

    // Diagonal faint "BẢO MẬT" across the page.
    const diag = "BẢO MẬT";
    const size = Math.min(width, height) * 0.16;
    const tw = font.widthOfTextAtSize(diag, size);
    page.drawText(diag, {
      x: width / 2 - (tw / 2) * Math.cos(Math.PI / 6),
      y: height / 2 - (tw / 2) * Math.sin(Math.PI / 6),
      size,
      font,
      color: rgb(0.08, 0.086, 0.106),
      opacity: 0.05,
      rotate: degrees(30),
    });

    // Per-user footer strip.
    const fSize = 7;
    page.drawText(footer, {
      x: 28,
      y: 18,
      size: fSize,
      font,
      color: rgb(0.42, 0.44, 0.47),
      opacity: 0.85,
      maxWidth: width - 56,
    });
  }

  return pdf.save();
}

/**
 * Return the storage key of a watermarked copy for this user, creating + caching
 * it on first request. Returns null if the base file is missing.
 */
export async function getWatermarkedKey(
  report: { id: string; fileKey: string | null },
  user: { id: string; email: string },
  ip: string,
): Promise<StreamTarget | null> {
  if (!report.fileKey) return null;
  const storage = getStorage();

  const key = watermarkKey(report.id, user.id);
  const cached = await storage.stat(key);
  if (cached.exists) return { key, size: cached.size };

  const base = await storage.stat(report.fileKey);
  if (!base.exists) return null;

  const baseBytes = await storage.get(report.fileKey);
  const stamped = await stamp(baseBytes, {
    email: user.email,
    ip,
    when: new Date(),
  });
  await storage.put(key, stamped);
  return { key, size: stamped.byteLength };
}

/**
 * Resolve the storage key to stream for a report's PDF, honoring the watermark
 * feature flag. Flag ON → a per-user watermarked copy (cached). Flag OFF
 * (default) → the base file streamed as-is. Returns null if there is no file.
 * Both the view and download routes go through this so behavior stays uniform.
 */
export async function resolveStreamKey(
  report: { id: string; fileKey: string | null },
  user: { id: string; email: string },
  ip: string,
): Promise<StreamTarget | null> {
  if (!report.fileKey) return null;
  if (!watermarkEnabled()) {
    const base = await getStorage().stat(report.fileKey);
    return base.exists ? { key: report.fileKey, size: base.size } : null;
  }
  return getWatermarkedKey(report, user, ip);
}
