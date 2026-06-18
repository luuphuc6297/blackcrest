/**
 * Generate base sample PDFs for seeded reports so the view/download endpoints
 * have real files. Per-user watermarking is applied at stream time (lib/watermark).
 * Run: pnpm tsx scripts/generate-sample-pdfs.ts
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const STORAGE_ROOT = path.resolve(
  process.env.STORAGE_ROOT ?? path.join(process.cwd(), "storage"),
);

const BODY = [
  "Báo cáo này được phát hành riêng cho nhà đầu tư đã được cấp quyền truy cập.",
  "Các nhận định dựa trên dữ liệu thị trường tại thời điểm phát hành và có thể thay đổi.",
  "NAV, hiệu suất và phân bổ tài sản được trình bày theo đơn vị đồng (₫).",
  "Tài liệu không phải là khuyến nghị đầu tư cá nhân hoá.",
];

async function main() {
  const regular = await readFile(
    path.join(process.cwd(), "assets/fonts/BeVietnamPro-Regular.ttf"),
  );
  const semibold = await readFile(
    path.join(process.cwd(), "assets/fonts/BeVietnamPro-SemiBold.ttf"),
  );

  const reports = await prisma.report.findMany({
    where: { fileKey: { not: null } },
    include: { translations: true, category: true },
  });

  let count = 0;
  for (const r of reports) {
    const t =
      r.translations.find((x) => x.locale === "vi") ?? r.translations[0];
    const title = t?.title ?? r.slug;
    const author = t?.author ?? "Khối Nghiên cứu Blackcrest";

    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    const fReg = await pdf.embedFont(regular, { subset: true });
    const fBold = await pdf.embedFont(semibold, { subset: true });

    const pages = Math.max(2, Math.min(r.pageCount ?? 4, 6));
    for (let i = 0; i < pages; i++) {
      const page = pdf.addPage([595, 842]); // A4
      const { width, height } = page.getSize();

      // NOTE: the "BẢO MẬT" diagonal watermark is NOT baked here — it is applied
      // PER-USER at stream time (lib/watermark). Baking it too produced a
      // double/overlapping watermark.

      if (i === 0) {
        page.drawText("BLACKCREST", {
          x: 48,
          y: height - 90,
          size: 11,
          font: fBold,
          color: rgb(0.11, 0.11, 0.13),
        });
        page.drawText(r.coverLabel ?? r.category.nameVi, {
          x: 48,
          y: height - 150,
          size: 11,
          font: fReg,
          color: rgb(0.42, 0.44, 0.47),
        });
        page.drawText(title, {
          x: 48,
          y: height - 210,
          size: 26,
          font: fBold,
          color: rgb(0.11, 0.11, 0.13),
          maxWidth: width - 96,
          lineHeight: 32,
        });
        page.drawText(author, {
          x: 48,
          y: 150,
          size: 12,
          font: fReg,
          color: rgb(0.24, 0.26, 0.29),
        });
      } else {
        page.drawText(`${title} — trang ${i + 1}`, {
          x: 48,
          y: height - 80,
          size: 13,
          font: fBold,
          color: rgb(0.11, 0.11, 0.13),
        });
        BODY.forEach((line, j) => {
          page.drawText(line, {
            x: 48,
            y: height - 130 - j * 26,
            size: 11,
            font: fReg,
            color: rgb(0.24, 0.26, 0.29),
            maxWidth: width - 96,
          });
        });
      }

      // Footer.
      page.drawText("chỉ dành cho nhà đầu tư · không phân phối lại", {
        x: 48,
        y: 36,
        size: 8,
        font: fReg,
        color: rgb(0.6, 0.62, 0.65),
      });
      page.drawText(`${i + 1} / ${pages}`, {
        x: width - 80,
        y: 36,
        size: 8,
        font: fReg,
        color: rgb(0.6, 0.62, 0.65),
      });
    }

    const bytes = await pdf.save();
    const full = path.join(STORAGE_ROOT, r.fileKey!);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, bytes);
    count++;
  }

  console.log(`Generated ${count} sample PDFs under ${STORAGE_ROOT}/reports/`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
