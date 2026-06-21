// QA seed — exercises F2 (watchlist), F3 (attachments) and the entitlement /
// audience gates with REAL data. Idempotent (upsert by natural key). All rows are
// labelled "qa-…" / "QA —" so they're easy to find + remove later.
//   node --env-file=.env --env-file=.env.local scripts/qa-seed.mjs
import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID, createHash } from "node:crypto";

const p = new PrismaClient();
const env = (k) => process.env[`S3_${k}`] ?? process.env[`SUPABASE_S3_${k}`];
const s3 = new S3Client({
  region: env("REGION") ?? "ap-northeast-1",
  endpoint: env("ENDPOINT"),
  forcePathStyle: Boolean(env("ENDPOINT")),
  credentials: { accessKeyId: env("ACCESS_KEY_ID") ?? "", secretAccessKey: env("SECRET_ACCESS_KEY") ?? "" },
});
const BUCKET = process.env.S3_BUCKET ?? "reports";

const MINHANH = "cmqicbc630003mrgmu223skte";
const GROUP_MINE = "cmqicbfcs0006mrgmy0udz1jr"; // Quỹ Gia An (minhanh ∈)
const GROUP_OTHER = "cmqicbg950007mrgm1b4p5la1"; // Văn phòng Gia tộc Trần (minhanh ∉)
const SYM = { FPT: "cmqmdxvsl04u8mru83o5joblf", HPG: "cmqmdysvd06vxmru8fejhwwel", VCB: "cmqme31pe0gqwmru8ynouicuu" };
const CAT = "cmqicbl1u000cmrgmvbtv661a";

// ── F2: minhanh watches VCB, FPT, HPG ──
for (const t of ["VCB", "FPT", "HPG"]) {
  await p.watchlistItem.upsert({
    where: { userId_symbolId: { userId: MINHANH, symbolId: SYM[t] } },
    create: { userId: MINHANH, symbolId: SYM[t] }, update: {},
  });
}

async function qaReport(slug, title, { accessLevel = "PUBLIC", audience = "CLIENT", linkVCB = false } = {}) {
  const r = await p.report.upsert({
    where: { slug },
    create: { slug, categoryId: CAT, status: "PUBLISHED", accessLevel, audience, publishedAt: new Date(), coverLabel: "QA" },
    update: { accessLevel, audience, status: "PUBLISHED" },
  });
  await p.reportTranslation.upsert({
    where: { reportId_locale: { reportId: r.id, locale: "vi" } },
    create: { reportId: r.id, locale: "vi", title, summary: "Báo cáo QA để kiểm thử phân quyền + audience." },
    update: { title },
  });
  if (linkVCB) await p.reportSymbol.upsert({
    where: { reportId_symbolId: { reportId: r.id, symbolId: SYM.VCB } },
    create: { reportId: r.id, symbolId: SYM.VCB, isPrimary: true }, update: {},
  });
  return r;
}

// ── access-control fixtures ──
const rInternal = await qaReport("qa-internal-bao-cao-noi-bo", "QA — Báo cáo NỘI BỘ (INTERNAL — không client nào được thấy)", { audience: "INTERNAL" });
const rMine = await qaReport("qa-restricted-quy-gia-an", "QA — Hạn chế: cấp quyền cho Quỹ Gia An (minhanh THẤY)", { accessLevel: "RESTRICTED" });
const rOther = await qaReport("qa-restricted-nhom-khac", "QA — Hạn chế: nhóm khác (minhanh KHÔNG thấy)", { accessLevel: "RESTRICTED" });
const rAtt = await qaReport("qa-attachments-vcb", "QA — Báo cáo có đính kèm (VCB)", { linkVCB: true });

await p.entitlement.upsert({ where: { groupId_reportId: { groupId: GROUP_MINE, reportId: rMine.id } }, create: { groupId: GROUP_MINE, reportId: rMine.id }, update: {} });
await p.entitlement.upsert({ where: { groupId_reportId: { groupId: GROUP_OTHER, reportId: rOther.id } }, create: { groupId: GROUP_OTHER, reportId: rOther.id }, update: {} });

// ── F3: 1 CLIENT + 1 INTERNAL attachment on rAtt, real files in storage ──
async function attach(report, fileName, mimeType, audience, content) {
  const buf = Buffer.from(content, "utf8");
  const sha = createHash("sha256").update(buf).digest("hex");
  const ext = fileName.split(".").pop();
  const fileKey = `attachments/${report.id}/${randomUUID()}.${ext}`;
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: fileKey, Body: buf, ContentType: mimeType }));
  await p.reportAttachment.upsert({
    where: { reportId_sha256: { reportId: report.id, sha256: sha } },
    create: { reportId: report.id, fileKey, fileName, mimeType, fileSize: buf.length, sha256: sha, audience },
    update: { audience, fileKey },
  });
}
await attach(rAtt, "Mo-hinh-dinh-gia-VCB-MAU.csv", "text/csv", "CLIENT", "Chỉ tiêu,2024,2025\nLợi nhuận (tỷ),100,120\nP/E,12,11\n");
await attach(rAtt, "Ghi-chu-noi-bo-VCB-MAU.csv", "text/csv", "INTERNAL", "Ghi chú nội bộ,Giá trị\nKhuyến nghị nội bộ,MUA mạnh\nGiá mục tiêu nội bộ,120000\n");

console.log(JSON.stringify({
  watchlist: await p.watchlistItem.count({ where: { userId: MINHANH } }),
  attachments: await p.reportAttachment.count({ where: { reportId: rAtt.id } }),
  ids: { rInternal: rInternal.id, rMine: rMine.id, rOther: rOther.id, rAtt: rAtt.id },
}, null, 2));
await p.$disconnect();
