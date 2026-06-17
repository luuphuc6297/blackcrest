/**
 * Seed — realistic Vietnamese private-wealth sample data.
 * Idempotent (upserts). Run: pnpm db:seed
 *
 * Sets up two independent client groups with DIFFERENT entitlements so the
 * cross-group isolation test (blueprint §6.14) is exercisable out of the box.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

const DEV_PASSWORD = "Blackcrest@2026";

async function main() {
  const passwordHash = await hashPassword(DEV_PASSWORD);

  // ── Staff + clients ────────────────────────────────────────────────────────
  const users = [
    { email: "admin@blackcrest.vn", name: "Lê Quốc Bảo", role: "SUPER_ADMIN", status: "APPROVED", organization: "Blackcrest" },
    { email: "editor@blackcrest.vn", name: "Phạm Thu Hà", role: "EDITOR", status: "APPROVED", organization: "Blackcrest" },
    { email: "approver@blackcrest.vn", name: "Đặng Minh Khoa", role: "APPROVER", status: "APPROVED", organization: "Blackcrest" },
    { email: "minhanh@gia-an.vn", name: "Nguyễn Minh Anh", role: "CLIENT", status: "APPROVED", organization: "Quỹ Gia An" },
    { email: "trung@tran-family.vn", name: "Trần Quang Trung", role: "CLIENT", status: "APPROVED", organization: "VP Gia tộc Trần" },
    { email: "pending@khach-moi.vn", name: "Vũ Hải Đăng", role: "CLIENT", status: "PENDING", organization: "Khách mời" },
  ] as const;

  const userByEmail: Record<string, string> = {};
  for (const u of users) {
    const created = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, status: u.status, organization: u.organization, passwordHash },
      create: { email: u.email, name: u.name, role: u.role, status: u.status, organization: u.organization, passwordHash },
    });
    userByEmail[u.email] = created.id;
  }

  // ── Client groups (tệp khách hàng) ──────────────────────────────────────────
  const giaAn = await prisma.group.upsert({
    where: { slug: "quy-gia-an" },
    update: {},
    create: { slug: "quy-gia-an", name: "Quỹ Gia An", description: "Quỹ đầu tư gia đình Gia An" },
  });
  const tran = await prisma.group.upsert({
    where: { slug: "gia-toc-tran" },
    update: {},
    create: { slug: "gia-toc-tran", name: "Văn phòng Gia tộc Trần", description: "Family office họ Trần" },
  });

  async function addMember(userId: string, groupId: string) {
    await prisma.groupMembership.upsert({
      where: { userId_groupId: { userId, groupId } },
      update: {},
      create: { userId, groupId },
    });
  }
  await addMember(userByEmail["minhanh@gia-an.vn"], giaAn.id);
  await addMember(userByEmail["trung@tran-family.vn"], tran.id);

  // ── Categories ──────────────────────────────────────────────────────────────
  const categories = [
    { slug: "ban-tin-ngay", kind: "DAILY", nameVi: "Bản tin hàng ngày", nameEn: "Daily Briefing", nameZh: "每日简报", sortOrder: 1 },
    { slug: "tong-quan-tuan", kind: "WEEKLY", nameVi: "Tổng quan tuần", nameEn: "Weekly Review", nameZh: "每周回顾", sortOrder: 2 },
    { slug: "bao-cao-thang", kind: "MONTHLY", nameVi: "Báo cáo tháng", nameEn: "Monthly Report", nameZh: "月度报告", sortOrder: 3 },
    { slug: "chuyen-de", kind: "THEMATIC", nameVi: "Chuyên đề", nameEn: "Thematic", nameZh: "专题研究", sortOrder: 4 },
  ] as const;
  const catBySlug: Record<string, string> = {};
  for (const c of categories) {
    const created = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { nameVi: c.nameVi, nameEn: c.nameEn, nameZh: c.nameZh, sortOrder: c.sortOrder },
      create: c,
    });
    catBySlug[c.slug] = created.id;
  }

  // ── Reports + translations ──────────────────────────────────────────────────
  const editorId = userByEmail["editor@blackcrest.vn"];
  const reports = [
    {
      slug: "trien-vong-vi-mo-2026", cat: "bao-cao-thang", status: "PUBLISHED", accessLevel: "RESTRICTED",
      publishedAt: "2026-06-02", pageCount: 24, coverLabel: "BÁO CÁO THÁNG · 06/2026",
      vi: { title: "Triển vọng vĩ mô Việt Nam 2026", summary: "Phân tích chính sách tiền tệ, tỷ giá và dòng vốn FDI nửa cuối năm.", author: "Khối Nghiên cứu Blackcrest" },
      en: { title: "Vietnam Macro Outlook 2026", summary: "Monetary policy, FX and FDI flows for H2.", author: "Blackcrest Research" },
      zh: { title: "2026 越南宏观展望", summary: "下半年货币政策、汇率与外资流向分析。", author: "Blackcrest 研究部" },
    },
    {
      slug: "danh-muc-phong-thu-q3", cat: "chuyen-de", status: "PUBLISHED", accessLevel: "RESTRICTED",
      publishedAt: "2026-05-20", pageCount: 18, coverLabel: "CHUYÊN ĐỀ",
      vi: { title: "Chiến lược danh mục phòng thủ Quý III", summary: "Tái cân bằng sang tài sản phòng thủ trước biến động lãi suất.", author: "Đặng Minh Khoa" },
      en: { title: "Defensive Portfolio Strategy Q3", summary: "Rebalancing toward defensive assets amid rate volatility.", author: "Khoa Dang" },
      zh: { title: "第三季度防御性组合策略", summary: "在利率波动中转向防御性资产。", author: "邓明科" },
    },
    {
      slug: "tong-quan-tuan-24", cat: "tong-quan-tuan", status: "PUBLISHED", accessLevel: "PUBLIC",
      publishedAt: "2026-06-14", pageCount: 8, coverLabel: "TUẦN 24",
      vi: { title: "Tổng quan thị trường tuần 24", summary: "VN-Index, thanh khoản và khối ngoại tuần qua.", author: "Phạm Thu Hà" },
      en: { title: "Weekly Market Review — Week 24", summary: "VN-Index, liquidity and foreign flows.", author: "Ha Pham" },
      zh: { title: "第 24 周市场回顾", summary: "VN 指数、流动性与外资动向。", author: "范秋河" },
    },
    {
      slug: "ban-tin-17-06", cat: "ban-tin-ngay", status: "PUBLISHED", accessLevel: "PUBLIC",
      publishedAt: "2026-06-17", pageCount: 4, coverLabel: "17/06/2026",
      vi: { title: "Bản tin sáng 17/06", summary: "Điểm tin vĩ mô và doanh nghiệp trước giờ giao dịch.", author: "Khối Nghiên cứu" },
      en: { title: "Morning Briefing — Jun 17", summary: "Pre-market macro and corporate headlines.", author: "Research" },
      zh: { title: "6 月 17 日早间简报", summary: "盘前宏观与企业要闻。", author: "研究部" },
    },
    {
      slug: "co-hoi-nganh-cong-nghe", cat: "chuyen-de", status: "PUBLISHED", accessLevel: "RESTRICTED",
      publishedAt: "2026-04-28", pageCount: 32, coverLabel: "CHUYÊN ĐỀ",
      vi: { title: "Cơ hội đầu tư ngành công nghệ & bán dẫn", summary: "Chuỗi cung ứng bán dẫn và cơ hội cho doanh nghiệp Việt.", author: "Khối Nghiên cứu" },
      en: { title: "Tech & Semiconductor Opportunities", summary: "Semiconductor supply chain and Vietnamese plays.", author: "Research" },
      zh: { title: "科技与半导体投资机会", summary: "半导体供应链与越南企业机会。", author: "研究部" },
    },
    {
      slug: "bao-cao-thang-05", cat: "bao-cao-thang", status: "REVIEW", accessLevel: "RESTRICTED",
      publishedAt: null, pageCount: 22, coverLabel: "BÁO CÁO THÁNG · 05/2026",
      vi: { title: "Báo cáo hiệu suất danh mục tháng 05", summary: "NAV, phân bổ tài sản và đóng góp hiệu suất.", author: "Phạm Thu Hà" },
      en: { title: "Portfolio Performance — May", summary: "NAV, allocation and performance attribution.", author: "Ha Pham" },
      zh: { title: "5 月组合业绩报告", summary: "净值、资产配置与业绩归因。", author: "范秋河" },
    },
    {
      slug: "chien-luoc-2027-nhap", cat: "chuyen-de", status: "DRAFT", accessLevel: "RESTRICTED",
      publishedAt: null, pageCount: 0, coverLabel: "NHÁP",
      vi: { title: "Định hướng chiến lược 2027", summary: "Bản nháp đang biên tập.", author: "Khối Nghiên cứu" },
      en: { title: "2027 Strategy Direction", summary: "Draft in editing.", author: "Research" },
      zh: { title: "2027 战略方向", summary: "编辑中的草稿。", author: "研究部" },
    },
  ] as const;

  const reportBySlug: Record<string, string> = {};
  for (const r of reports) {
    const data = {
      categoryId: catBySlug[r.cat],
      status: r.status,
      accessLevel: r.accessLevel,
      publishedAt: r.publishedAt ? new Date(r.publishedAt + "T01:00:00+07:00") : null,
      pageCount: r.pageCount,
      coverLabel: r.coverLabel,
      fileKey: r.status === "DRAFT" ? null : `reports/${r.slug}.pdf`,
      fileSize: r.status === "DRAFT" ? null : 240_000 + r.pageCount * 8_000,
      uploadedById: editorId,
    };
    const created = await prisma.report.upsert({
      where: { slug: r.slug },
      update: data,
      create: { slug: r.slug, ...data },
    });
    reportBySlug[r.slug] = created.id;

    for (const locale of ["vi", "en", "zh"] as const) {
      const tr = r[locale];
      await prisma.reportTranslation.upsert({
        where: { reportId_locale: { reportId: created.id, locale } },
        update: tr,
        create: { reportId: created.id, locale, ...tr },
      });
    }
  }

  // ── Entitlements ─────────────────────────────────────────────────────────────
  // Gia An: whole MONTHLY category + one thematic report.
  // Trần: only the tech thematic report. (PUBLIC reports are visible to all.)
  const approverId = userByEmail["approver@blackcrest.vn"];
  async function grantCategory(groupId: string, categoryId: string) {
    const existing = await prisma.entitlement.findFirst({ where: { groupId, categoryId } });
    if (!existing) await prisma.entitlement.create({ data: { groupId, categoryId, grantedById: approverId } });
  }
  async function grantReport(groupId: string, reportId: string) {
    const existing = await prisma.entitlement.findFirst({ where: { groupId, reportId } });
    if (!existing) await prisma.entitlement.create({ data: { groupId, reportId, grantedById: approverId } });
  }
  await grantCategory(giaAn.id, catBySlug["bao-cao-thang"]);
  await grantReport(giaAn.id, reportBySlug["danh-muc-phong-thu-q3"]);
  await grantReport(tran.id, reportBySlug["co-hoi-nganh-cong-nghe"]);

  console.log("Seed complete.");
  console.log(`  Users: ${users.length} (password for all: ${DEV_PASSWORD})`);
  console.log("  Groups: Quỹ Gia An, Văn phòng Gia tộc Trần");
  console.log(`  Categories: ${categories.length} · Reports: ${reports.length}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
