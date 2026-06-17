/**
 * Multi-account entitlement isolation test (blueprint §6.14). Replicates the
 * `visibleWhere` fragment from src/lib/authz.ts and asserts that group A cannot
 * see group B's restricted reports. Run: pnpm tsx scripts/verify-entitlements.ts
 * Exits non-zero on any violation.
 */
import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();

function visibleWhere(userId: string): Prisma.ReportWhereInput {
  const memberOf = { group: { members: { some: { userId } } } };
  return {
    status: "PUBLISHED",
    OR: [
      { accessLevel: "PUBLIC" },
      { entitlements: { some: memberOf } },
      { category: { entitlements: { some: memberOf } } },
    ],
  };
}

async function visibleSlugs(email: string): Promise<Set<string>> {
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const rows = await prisma.report.findMany({
    where: visibleWhere(user.id),
    select: { slug: true },
  });
  return new Set(rows.map((r) => r.slug));
}

let failures = 0;
function assert(cond: boolean, msg: string) {
  console.log(`${cond ? "✓" : "✗ FAIL"}  ${msg}`);
  if (!cond) failures++;
}

async function main() {
  const minhanh = await visibleSlugs("minhanh@gia-an.vn"); // Quỹ Gia An
  const trung = await visibleSlugs("trung@tran-family.vn"); // Gia tộc Trần

  console.log("Gia An  sees:", [...minhanh].sort().join(", "));
  console.log("Trần    sees:", [...trung].sort().join(", "));
  console.log("");

  // PUBLIC reports visible to both.
  assert(minhanh.has("ban-tin-17-06"), "Gia An sees PUBLIC bản tin");
  assert(trung.has("tong-quan-tuan-24"), "Trần sees PUBLIC tổng quan tuần");

  // Category inheritance + direct grant for Gia An.
  assert(minhanh.has("trien-vong-vi-mo-2026"), "Gia An sees MONTHLY (category grant)");
  assert(minhanh.has("danh-muc-phong-thu-q3"), "Gia An sees its directly-granted thematic");

  // ISOLATION — the core security property.
  assert(!minhanh.has("co-hoi-nganh-cong-nghe"), "Gia An CANNOT see Trần's thematic");
  assert(!trung.has("danh-muc-phong-thu-q3"), "Trần CANNOT see Gia An's thematic");
  assert(!trung.has("trien-vong-vi-mo-2026"), "Trần CANNOT see MONTHLY (no monthly grant)");

  // Non-published never leaks to clients.
  assert(!minhanh.has("bao-cao-thang-05"), "REVIEW report hidden from clients");
  assert(!minhanh.has("chien-luoc-2027-nhap"), "DRAFT report hidden from clients");

  console.log("");
  if (failures) {
    console.error(`${failures} ENTITLEMENT VIOLATION(S) — SECURITY REGRESSION`);
    process.exit(1);
  }
  console.log("All entitlement isolation checks passed.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
