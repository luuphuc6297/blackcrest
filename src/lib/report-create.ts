import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/lib/storage";

/**
 * Shared "create a Report from a validated PDF buffer" path, used by the
 * chunked-upload finalize step. Properties that the audit flagged (blueprint
 * §F1a, data-integrity hardening):
 *   • dedup by SHA-256 — identical content is never stored twice;
 *   • the storage key is a random UUID (NOT the slug) so two concurrent uploads
 *     can never collide on the same file path / delete each other's bytes;
 *   • the file is written BEFORE the row, and only cleaned up when the
 *     transaction fails (so we never delete a file a committed row points to);
 *   • the audit event is written INSIDE the same transaction (atomic — an
 *     append-only event is never lost).
 */

export const reportMetaSchema = z.object({
  categoryId: z.string().cuid(),
  accessLevel: z.enum(["PUBLIC", "RESTRICTED"]),
  // NOTE: no `status` here on purpose. An upload ALWAYS creates a DRAFT —
  // publishing is a separate APPROVER decision (separation of duties). This
  // closes the self-publish hole where an EDITOR could upload straight to
  // PUBLISHED, bypassing review.
  titleVi: z.string().trim().min(1).max(300),
  summaryVi: z.string().trim().max(2000).optional(),
  authorVi: z.string().trim().max(200).optional(),
  titleEn: z.string().trim().max(300).optional(),
  titleZh: z.string().trim().max(300).optional(),
});

export type ReportMeta = z.infer<typeof reportMetaSchema>;

export type CreateReportResult = {
  reportId: string;
  slug: string;
  /** true if an identical file already existed — no new report was created. */
  duplicate: boolean;
};

/** Vietnamese-aware slug (đ→d, strip diacritics). */
export function slugify(input: string): string {
  return (
    input
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "bao-cao"
  );
}

export async function createReportFromPdf(opts: {
  buf: Buffer;
  sha256: string;
  pageCount: number;
  meta: ReportMeta;
  actorId: string;
}): Promise<CreateReportResult> {
  const { buf, sha256, pageCount, meta, actorId } = opts;

  // ── Deduplication / duplicate-content detection ──────────────────────────
  // If the exact bytes already exist, return that report instead of storing a
  // second copy. This also makes finalize idempotent across retries.
  const existing = await prisma.report.findFirst({
    where: { fileSha256: sha256 },
    select: { id: true, slug: true },
  });
  if (existing) {
    return { reportId: existing.id, slug: existing.slug, duplicate: true };
  }

  // Unique slug from the VN title (display only; not the storage key).
  const base = slugify(meta.titleVi);
  let slug = base;
  for (
    let n = 2;
    await prisma.report.findUnique({ where: { slug }, select: { id: true } });
    n++
  ) {
    slug = `${base}-${n}`;
  }

  // Race-safe storage key: random, never derived from slug/title.
  const fileKey = `reports/${randomUUID()}.pdf`;
  const storage = getStorage();
  await storage.put(fileKey, buf);

  try {
    const report = await prisma.$transaction(async (tx) => {
      const r = await tx.report.create({
        data: {
          slug,
          categoryId: meta.categoryId,
          // Always DRAFT — never self-publish from an upload (see schema note).
          status: "DRAFT",
          accessLevel: meta.accessLevel,
          publishedAt: null,
          fileKey,
          fileSize: buf.length,
          fileSha256: sha256,
          pageCount,
          uploadedById: actorId,
        },
      });

      const translations: {
        reportId: string;
        locale: string;
        title: string;
        summary: string | null;
        author: string | null;
      }[] = [
        {
          reportId: r.id,
          locale: "vi",
          title: meta.titleVi,
          summary: meta.summaryVi ?? null,
          author: meta.authorVi ?? null,
        },
      ];
      if (meta.titleEn)
        translations.push({
          reportId: r.id,
          locale: "en",
          title: meta.titleEn,
          summary: null,
          author: meta.authorVi ?? null,
        });
      if (meta.titleZh)
        translations.push({
          reportId: r.id,
          locale: "zh",
          title: meta.titleZh,
          summary: null,
          author: meta.authorVi ?? null,
        });
      await tx.reportTranslation.createMany({ data: translations });

      // Atomic audit: the event commits with the row or not at all.
      await tx.auditLog.create({
        data: {
          actorId,
          action: "REPORT_UPLOAD",
          targetType: "Report",
          targetId: r.id,
          metadata: { slug, fileSize: buf.length, pageCount, sha256 },
        },
      });

      return r;
    });

    return { reportId: report.id, slug: report.slug, duplicate: false };
  } catch (err) {
    // Roll back the orphaned file — the row was NOT committed, so it is safe
    // to delete (the catch only runs when the transaction failed).
    await storage.del(fileKey);
    throw err;
  }
}
