import { describe, it, expect, vi, beforeEach } from "vitest";

// listWatchersToNotify is the entitlement gate for the F2 fan-out: it must select
// the SAME users visibleWhere would let view the report. Mock prisma to capture
// the WHERE it builds and assert the security-relevant shape.
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findMany: vi.fn(async () => []) } },
}));
vi.mock("@/lib/search", () => ({ searchReportIds: vi.fn() }));
vi.mock("@/lib/rbac", () => ({
  isStaff: (r: string) => ["SUPER_ADMIN", "APPROVER", "EDITOR"].includes(r),
  STAFF_ROLES: ["SUPER_ADMIN", "APPROVER", "EDITOR"],
}));

import { listWatchersToNotify } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const whereOf = () => vi.mocked(prisma.user.findMany).mock.calls.at(-1)![0]!.where as Record<string, unknown>;

describe("listWatchersToNotify — entitlement fan-out filter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns [] (no query) when the report has no symbols", async () => {
    const out = await listWatchersToNotify(
      { id: "r1", categoryId: "c1", accessLevel: "PUBLIC", audience: "CLIENT" },
      [],
    );
    expect(out).toEqual([]);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it("always requires APPROVED + opted-in + not-already-notified", async () => {
    await listWatchersToNotify({ id: "r1", categoryId: "c1", accessLevel: "PUBLIC", audience: "CLIENT" }, ["s1"]);
    const where = whereOf();
    expect(where.status).toBe("APPROVED");
    expect(where.watchlistEmails).toBe(true);
    expect(where.watchlistItems).toEqual({ some: { symbolId: { in: ["s1"] } } });
    expect(where.notifications).toEqual({ none: { reportId: "r1", channel: "EMAIL" } });
  });

  it("INTERNAL report → returns [] without querying (staff-only; never fan out to clients)", async () => {
    const out = await listWatchersToNotify(
      { id: "r1", categoryId: "c1", accessLevel: "PUBLIC", audience: "INTERNAL" },
      ["s1"],
    );
    expect(out).toEqual([]);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it("PUBLIC report → no entitlement OR clause (every approved watcher qualifies)", async () => {
    await listWatchersToNotify({ id: "r1", categoryId: "c1", accessLevel: "PUBLIC", audience: "CLIENT" }, ["s1"]);
    expect(whereOf().OR).toBeUndefined();
  });

  it("RESTRICTED report → staff-bypass OR group entitlement at report/category", async () => {
    await listWatchersToNotify({ id: "r1", categoryId: "c1", accessLevel: "RESTRICTED", audience: "CLIENT" }, ["s1"]);
    const or = whereOf().OR as Array<Record<string, unknown>>;
    expect(or).toHaveLength(2);
    // 1) staff bypass
    expect(or[0]).toEqual({ role: { in: ["SUPER_ADMIN", "APPROVER", "EDITOR"] } });
    // 2) a group the user belongs to holds an entitlement at the report OR its category
    expect(or[1]).toEqual({
      memberships: {
        some: {
          group: {
            entitlements: {
              some: { OR: [{ reportId: "r1" }, { categoryId: "c1" }] },
            },
          },
        },
      },
    });
  });
});
