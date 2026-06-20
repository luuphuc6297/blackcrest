/**
 * Bulk ingestion of the Vietcap corpus into Blackcrest (REAL — writes DB + files).
 *
 *   pnpm exec tsx scripts/ingest.ts [--limit N] [--source label] [--dry-run] ["/path/to/corpus"]
 *
 * Idempotent: dedups by fileSha256, so re-running skips already-ingested files.
 * Files are stored under STORAGE_ROOT (default ./storage) exactly like the app.
 * Reports are created PUBLISHED + PUBLIC so F1/F2 are immediately testable.
 * Unclassifiable files become IngestIssue rows (review queue), not failures.
 */
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { parsePath, toDate, type ParsedFile } from "./lib/vietcap-parse";

const prisma = new PrismaClient();

const argv = process.argv.slice(2);
const flag = (n: string) => {
  const i = argv.indexOf(n);
  return i >= 0 ? (argv[i + 1] ?? "") : undefined;
};
const LIMIT = flag("--limit") ? parseInt(flag("--limit")!, 10) : Infinity;
const SOURCE = flag("--source") ?? "vietcap";
const DRY = argv.includes("--dry-run");
const STORAGE_ROOT = path.resolve(process.env.STORAGE_ROOT ?? path.join(process.cwd(), "storage"));

let pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs") | null = null;

async function findCorpus(): Promise<string> {
  const pos = argv.find((a) => !a.startsWith("--") && a.includes("/"));
  if (pos) return pos;
  const dl = path.join(os.homedir(), "Downloads");
  const m = (await fs.readdir(dl)).find((e) => /vietcap/i.test(e) && !e.toLowerCase().endsWith(".rar"));
  if (!m) throw new Error("Corpus path not found — pass it as an argument.");
  return path.join(dl, m);
}

async function walk(dir: string, rel: string, out: string[]) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) await walk(path.join(dir, e.name), r, out);
    else if (e.name.toLowerCase().endsWith(".pdf")) out.push(r);
  }
}

/**
 * Join pdfjs text items POSITION-AWARE. pdfjs emits Vietnamese as many tiny glyph
 * fragments; a naive join(" ") shatters diacritics ("C ậ p"). We add a space only
 * on a real horizontal gap (≳0.2em) or a line break, so syllables re-attach
 * ("Cập") — critical for both titles and full-text search tokenization.
 */
type TItem = { str: string; height?: number; width?: number; transform?: number[] };
function joinItems(items: readonly unknown[]): string {
  let out = "";
  let prevEndX: number | null = null;
  let prevY: number | null = null;
  let h = 10;
  for (const raw of items) {
    const it = raw as TItem;
    if (typeof it.str !== "string" || it.str === "") continue;
    const tr = it.transform ?? [1, 0, 0, 1, 0, 0];
    const x = tr[4];
    const y = tr[5];
    const w = it.width ?? 0;
    if (it.height) h = it.height;
    if (prevY !== null && Math.abs(y - prevY) > h * 0.5) out += " ";
    else if (prevEndX !== null && x - prevEndX > h * 0.2) out += " ";
    out += it.str;
    prevEndX = x + w;
    prevY = y;
  }
  return out.replace(/\s+/g, " ").trim();
}

/** Reject boilerplate / junk so it never becomes a title. */
function cleanTitle(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length < 6) return "";
  if (/important disclosure|disclaimer|www\.|https?:|@|trang \d|page \d/i.test(t)) return "";
  return t.slice(0, 160);
}

/** Extract page count + a title + capped full text via pdfjs. Title heuristic:
 *  the largest-font text run on page 1 (the headline) → PDF metadata Title →
 *  (caller falls back to the filename). */
async function extract(bytes: Buffer): Promise<{ pages: number; title: string; text: string }> {
  if (!pdfjs) return { pages: 0, title: "", text: "" };
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(bytes),
    isEvalSupported: false,
    useSystemFonts: false,
    verbosity: 0,
  }).promise;
  const pages = doc.numPages;

  let metaTitle = "";
  try {
    const md = await doc.getMetadata();
    const info = md.info as { Title?: string } | undefined;
    if (info?.Title && !/^Microsoft Word|^untitled/i.test(info.Title)) metaTitle = info.Title;
  } catch {
    /* no metadata */
  }

  let text = "";
  let bigTitle = "";
  const max = Math.min(pages, 40);
  for (let i = 1; i <= max; i++) {
    const pg = await doc.getPage(i);
    const tc = await pg.getTextContent();
    if (i === 1) {
      // Largest-font run on page 1 = the headline (text-stream order is unreliable).
      let maxH = 0;
      for (const it of tc.items) if ("height" in it && it.str.trim() && it.height > maxH) maxH = it.height;
      const bigItems = tc.items.filter((it) => "height" in it && it.height >= maxH * 0.85 && it.str.trim());
      bigTitle = joinItems(bigItems);
    }
    text += joinItems(tc.items) + "\n";
    if (text.length > 40000) break;
  }
  await doc.destroy();

  const title = cleanTitle(bigTitle) || cleanTitle(metaTitle);
  return { pages, title, text: text.replace(/\s+/g, " ").slice(0, 40000) };
}

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/\.pdf$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "report";

async function main() {
  const root = await findCorpus();
  try {
    pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  } catch (e) {
    console.warn("[warn] pdfjs unavailable — no title/contentText extraction:", (e as Error).message);
  }
  console.log(`Corpus : ${root}`);
  console.log(`Storage: ${STORAGE_ROOT}`);
  console.log(`Mode   : ${DRY ? "DRY-RUN (no writes)" : "WRITE"}  limit=${LIMIT === Infinity ? "all" : LIMIT}\n`);

  const rels: string[] = [];
  await walk(root, "", rels);
  const files = rels.slice(0, LIMIT);

  // Required categoryId FK — one bucket; real classification is reportType/tier/symbol.
  const category = DRY
    ? { id: "(dry)" }
    : await prisma.category.upsert({
        where: { slug: "vietcap-research" },
        update: {},
        create: { slug: "vietcap-research", kind: "THEMATIC", nameVi: "Nghiên cứu Vietcap", nameEn: "Vietcap Research", nameZh: "Vietcap 研究", sortOrder: 10 },
      });

  const batch = DRY
    ? { id: "(dry)" }
    : await prisma.ingestBatch.create({ data: { source: SOURCE, filesSeen: files.length } });

  let imported = 0;
  let skipped = 0;
  let issues = 0;
  await fs.mkdir(path.join(STORAGE_ROOT, "reports"), { recursive: true });

  for (let idx = 0; idx < files.length; idx++) {
    const rel = files[idx];
    const meta: ParsedFile = parsePath(rel);
    try {
      const bytes = await fs.readFile(path.join(root, rel));
      const sha = createHash("sha256").update(bytes).digest("hex");

      if (!DRY) {
        const dup = await prisma.report.findUnique({ where: { fileSha256: sha }, select: { id: true } });
        if (dup) {
          skipped++;
          continue;
        }
      }

      const { pages, title, text } = await extract(bytes);
      const reportType = meta.parsed.types[0] ?? null;
      const reportDate = toDate(meta.date);

      if (DRY) {
        imported++;
        if (imported <= 3) console.log(`  [dry] ${meta.ticker} ${reportType ?? "?"} ${meta.parsed.rec ?? ""} «${title.slice(0, 60)}»`);
        continue;
      }

      const symbol = await prisma.symbol.upsert({
        where: { ticker: meta.ticker },
        update: meta.company ? { nameVi: meta.company } : {},
        create: { ticker: meta.ticker, nameVi: meta.company || meta.ticker },
      });

      const fileKey = `reports/${randomUUID()}.pdf`;
      await fs.writeFile(path.join(STORAGE_ROOT, fileKey), bytes);

      let slug = slugify(meta.fileName);
      const data = {
        slug,
        categoryId: category.id,
        status: "PUBLISHED",
        accessLevel: "PUBLIC",
        audience: "CLIENT",
        reportType: reportType as never,
        recommendation: meta.parsed.rec as never,
        tier: meta.tier as never,
        reportDate,
        publishedAt: reportDate ?? new Date(),
        coverLabel: meta.ticker,
        fileKey,
        fileSize: bytes.length,
        fileSha256: sha,
        pageCount: pages || null,
        contentText: text || null,
        translations: { create: [{ locale: "vi", title: title || meta.fileName.replace(/\.pdf$/i, "") }] },
        symbols: { create: [{ symbolId: symbol.id, isPrimary: true }] },
      };
      try {
        await prisma.report.create({ data: data as never });
      } catch (e) {
        // slug collision → suffix with a short content hash and retry once
        if (String((e as { code?: string }).code) === "P2002") {
          slug = `${slug}-${sha.slice(0, 6)}`;
          await prisma.report.create({ data: { ...data, slug } as never });
        } else throw e;
      }

      if (meta.parsed.status === "UNKNOWN" || !meta.date) {
        issues++;
        await prisma.ingestIssue.create({
          data: {
            batchId: batch.id,
            filePath: rel,
            rawCode: meta.rawCode,
            reason: meta.parsed.status === "UNKNOWN" ? "UNKNOWN_TYPE" : "NO_DATE",
          },
        });
      }
      imported++;
      if (imported % 100 === 0) console.log(`  …${imported} imported (${idx + 1}/${files.length})`);
    } catch (e) {
      issues++;
      console.error(`  [FAIL] ${rel.split("/").pop()}: ${(e as Error).message.slice(0, 70)}`);
    }
  }

  if (!DRY) {
    await prisma.ingestBatch.update({
      where: { id: batch.id },
      data: { finishedAt: new Date(), imported, skipped, needsReview: issues },
    });
  }
  console.log(`\n=== DONE ===\nimported=${imported}  skipped(dup)=${skipped}  issues=${issues}  of ${files.length} files`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
