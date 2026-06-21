/**
 * Resolve the IngestIssue review queue (UNKNOWN_TYPE + NO_DATE) WITHOUT re-reading
 * the corpus: re-parse each issue's filePath with the (now-extended) taxonomy and
 * recover the report date from the filename (US MMDDYYYY) or the already-extracted
 * contentText (VCSC prints DD/MM/YYYY near the top). Fills ONLY null fields on the
 * linked Report, fixes the publishedAt that ingest defaulted to "today", and marks
 * the issue resolved.
 *
 *   DATABASE_URL=… DIRECT_URL=… pnpm exec tsx scripts/reclassify.ts [--dry-run]
 *
 * Idempotent — safe to re-run; only touches unresolved issues + null fields.
 */
import { PrismaClient } from "@prisma/client";
import { parsePath, toDate, extractDateFromText, classifySlug } from "./lib/vietcap-parse";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry-run");

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

const basename = (p: string) => p.split("/").pop() ?? p;

async function findReport(fileName: string) {
  const cand = slugify(fileName);
  const select = {
    id: true,
    reportType: true,
    recommendation: true,
    reportDate: true,
    contentText: true,
    translations: { where: { locale: "vi" }, select: { title: true } },
  } as const;
  const exact = await prisma.report.findUnique({ where: { slug: cand }, select });
  if (exact) return exact;
  return prisma.report.findFirst({ where: { slug: { startsWith: `${cand}-` } }, select });
}

async function main() {
  const issues = await prisma.ingestIssue.findMany({
    where: { resolved: false },
    select: { id: true, filePath: true, rawCode: true, reason: true },
  });
  console.log(`Mode: ${DRY ? "DRY-RUN" : "WRITE"} — ${issues.length} unresolved issues\n`);

  const stat = {
    matched: 0, unmatched: 0,
    typeFilled: 0, recFilled: 0, dateFilledFile: 0, dateFilledText: 0,
    resolvedUnknown: 0, acceptedTypeless: 0, resolvedDate: 0, stillNoDate: 0,
  };
  const sampleUnmatched: string[] = [];

  for (const issue of issues) {
    const fileName = basename(issue.filePath);
    const parsed = parsePath(issue.filePath);
    const report = await findReport(fileName);
    if (!report) {
      stat.unmatched++;
      if (sampleUnmatched.length < 8) sampleUnmatched.push(fileName);
      continue;
    }
    stat.matched++;

    const data: Record<string, unknown> = {};
    // ── type / recommendation (UNKNOWN_TYPE) ──
    let newType = parsed.parsed.types[0] ?? null;
    // Fallback: epoch-named / keyword-less files often carry the type in the
    // extracted TITLE ("… Báo cáo KQKD …", "… Cập nhật …").
    let typeFromTitle = false;
    if (!newType) {
      const titleParsed = classifySlug(report.translations[0]?.title ?? "");
      if (titleParsed.status === "KNOWN") {
        newType = titleParsed.types[0];
        typeFromTitle = true;
      }
    }
    const newRec = parsed.parsed.rec;
    if (newType && !report.reportType) data.reportType = newType;
    if (newRec && !report.recommendation) data.recommendation = newRec;

    // ── date (NO_DATE, or any null-date report) ──
    let newDate: Date | null = null;
    let dateSource: "file" | "text" | null = null;
    if (!report.reportDate) {
      if (parsed.date) {
        newDate = toDate(parsed.date);
        dateSource = "file";
      } else {
        const t = extractDateFromText(report.contentText);
        if (t) {
          newDate = toDate(t);
          dateSource = "text";
        }
      }
      if (newDate) {
        data.reportDate = newDate;
        data.publishedAt = newDate; // fix the ingest "today" fallback so sorting is correct
      }
    }

    if ("reportType" in data) stat.typeFilled++;
    if ("recommendation" in data) stat.recFilled++;
    if (dateSource === "file") stat.dateFilledFile++;
    if (dateSource === "text") stat.dateFilledText++;

    // ── resolution decision ──
    let resolved = false;
    if (issue.reason === "UNKNOWN_TYPE") {
      // Classified now (filename code/recognized-no-rating, or type recovered from
      // the title) OR accepted as a genuinely typeless note — either way reviewed.
      if (parsed.parsed.status !== "UNKNOWN" || typeFromTitle) stat.resolvedUnknown++;
      else stat.acceptedTypeless++;
      resolved = true;
    } else if (issue.reason === "NO_DATE") {
      if (newDate) {
        resolved = true;
        stat.resolvedDate++;
      } else {
        stat.stillNoDate++;
      }
    }

    if (!DRY) {
      if (Object.keys(data).length) await prisma.report.update({ where: { id: report.id }, data });
      if (resolved) await prisma.ingestIssue.update({ where: { id: issue.id }, data: { resolved: true } });
    }
  }

  console.log("Linkage:   matched=%d  unmatched=%d", stat.matched, stat.unmatched);
  if (sampleUnmatched.length) console.log("  unmatched samples:", sampleUnmatched);
  console.log("Backfill:  reportType=%d  recommendation=%d  date(file)=%d  date(text)=%d",
    stat.typeFilled, stat.recFilled, stat.dateFilledFile, stat.dateFilledText);
  console.log("Resolved:  unknown→classified=%d  accepted-typeless=%d  no_date→dated=%d  still-no-date=%d",
    stat.resolvedUnknown, stat.acceptedTypeless, stat.resolvedDate, stat.stillNoDate);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
