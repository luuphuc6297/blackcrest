import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Only the Auth.js instance pulls `next-auth` → `next/server`, which doesn't
// resolve in vitest's node env and is unused by canViewReport (it uses isStaff +
// the real prisma). Stub it so the import chain loads; everything else is REAL.
vi.mock("@/auth", () => ({ auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { canViewReport } from "@/lib/authz";
import { searchReportIds } from "@/lib/search";

/**
 * REAL-Postgres integration tests — they exercise the SQL the mock-based unit
 * tests can't: the audience + entitlement visibility gate (this would have caught
 * the INTERNAL-leak) and the FTS searchTsv path. Gated on INTEGRATION=1, which CI
 * sets AFTER `prisma migrate deploy` against its ephemeral Postgres; locally
 * `pnpm test` skips them (no throwaway DB — the real env points at Supabase).
 */
const P = `itest-${Date.now()}`;
const made = { reports: [] as string[], users: [] as string[], groups: [] as string[], cats: [] as string[] };

describe.skipIf(!process.env.INTEGRATION)("authz + FTS (real Postgres)", () => {
  let userId = "";
  let adminId = "";
  const r: Record<string, string> = {};

  beforeAll(async () => {
    const cat = await prisma.category.create({
      data: { slug: `${P}-cat`, kind: "DAILY", nameVi: "IT", nameEn: "IT", nameZh: "IT" },
    });
    made.cats.push(cat.id);
    const gA = await prisma.group.create({ data: { slug: `${P}-ga`, name: "IT A" } });
    const gB = await prisma.group.create({ data: { slug: `${P}-gb`, name: "IT B" } });
    made.groups.push(gA.id, gB.id);

    const user = await prisma.user.create({
      data: { email: `${P}-u@x.test`, name: "IT U", role: "CLIENT", status: "APPROVED", memberships: { create: { groupId: gA.id } } },
    });
    const admin = await prisma.user.create({
      data: { email: `${P}-a@x.test`, name: "IT A", role: "SUPER_ADMIN", status: "APPROVED" },
    });
    made.users.push(user.id, admin.id);
    userId = user.id;
    adminId = admin.id;

    const mk = async (key: string, accessLevel: "PUBLIC" | "RESTRICTED", audience: "CLIENT" | "INTERNAL", title: string) => {
      const rep = await prisma.report.create({
        data: {
          slug: `${P}-${key}`, categoryId: cat.id, status: "PUBLISHED", accessLevel, audience,
          publishedAt: new Date(), translations: { create: { locale: "vi", title } },
        },
      });
      made.reports.push(rep.id);
      r[key] = rep.id;
    };
    await mk("pub", "PUBLIC", "CLIENT", `${P} zfindme pub`);
    await mk("internal", "PUBLIC", "INTERNAL", `${P} noibo`);
    await mk("mine", "RESTRICTED", "CLIENT", `${P} mine`);
    await mk("other", "RESTRICTED", "CLIENT", `${P} other`);
    await prisma.entitlement.create({ data: { groupId: gA.id, reportId: r.mine } });
    await prisma.entitlement.create({ data: { groupId: gB.id, reportId: r.other } });
  });

  afterAll(async () => {
    await prisma.report.deleteMany({ where: { id: { in: made.reports } } });
    await prisma.user.deleteMany({ where: { id: { in: made.users } } });
    await prisma.group.deleteMany({ where: { id: { in: made.groups } } });
    await prisma.category.deleteMany({ where: { id: { in: made.cats } } });
    await prisma.$disconnect();
  });

  it("client sees PUBLIC but NOT INTERNAL (audience gate)", async () => {
    expect(await canViewReport(userId, "CLIENT", r.pub)).toBe(true);
    expect(await canViewReport(userId, "CLIENT", r.internal)).toBe(false);
  });

  it("client sees an entitled RESTRICTED report but not another group's", async () => {
    expect(await canViewReport(userId, "CLIENT", r.mine)).toBe(true);
    expect(await canViewReport(userId, "CLIENT", r.other)).toBe(false);
  });

  it("staff bypasses both audience and entitlement", async () => {
    expect(await canViewReport(adminId, "SUPER_ADMIN", r.internal)).toBe(true);
    expect(await canViewReport(adminId, "SUPER_ADMIN", r.other)).toBe(true);
  });

  it("FTS (searchTsv) finds a report by a title token", async () => {
    const hits = await searchReportIds("zfindme", 50);
    expect(hits).toContain(r.pub);
  });
});
