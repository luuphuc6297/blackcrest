import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

import {
  isStaff,
  STAFF_ROLES,
  AuthError,
  ForbiddenError,
  requireFreshUser,
  requireFreshRole,
} from "../rbac";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = vi.mocked(auth);
const mockFind = vi.mocked(prisma.user.findUnique);

describe("rbac", () => {
  beforeEach(() => vi.clearAllMocks());

  it("isStaff + STAFF_ROLES", () => {
    expect(isStaff("SUPER_ADMIN")).toBe(true);
    expect(isStaff("EDITOR")).toBe(true);
    expect(isStaff("CLIENT")).toBe(false);
    expect(isStaff(null)).toBe(false);
    expect(STAFF_ROLES).toEqual(["SUPER_ADMIN", "EDITOR", "APPROVER"]);
  });

  describe("requireFreshUser — SEC-12 revocation", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: "u1", tokenVersion: 5 } } as never);
    });

    it("throws when the account is no longer APPROVED", async () => {
      mockFind.mockResolvedValue({
        id: "u1",
        role: "CLIENT",
        status: "SUSPENDED",
        tokenVersion: 5,
      } as never);
      await expect(requireFreshUser()).rejects.toBeInstanceOf(AuthError);
    });

    it("throws 'Session revoked' when DB tokenVersion was bumped past the JWT", async () => {
      mockFind.mockResolvedValue({
        id: "u1",
        role: "CLIENT",
        status: "APPROVED",
        tokenVersion: 6, // bumped; JWT still carries 5
      } as never);
      await expect(requireFreshUser()).rejects.toThrow(/revoked/i);
    });

    it("returns the DB user when approved + version matches", async () => {
      const u = { id: "u1", role: "APPROVER", status: "APPROVED", tokenVersion: 5 };
      mockFind.mockResolvedValue(u as never);
      await expect(requireFreshUser()).resolves.toEqual(u);
    });
  });

  describe("requireFreshRole — fresh DB check + role gate", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: "u1", tokenVersion: 2 } } as never);
    });

    it("forbids a role not in the allow-list (even if fresh)", async () => {
      mockFind.mockResolvedValue({
        id: "u1",
        role: "CLIENT",
        status: "APPROVED",
        tokenVersion: 2,
      } as never);
      await expect(requireFreshRole("EDITOR", "APPROVER")).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it("allows an in-list role when fresh", async () => {
      const u = { id: "u1", role: "APPROVER", status: "APPROVED", tokenVersion: 2 };
      mockFind.mockResolvedValue(u as never);
      await expect(requireFreshRole("APPROVER", "SUPER_ADMIN")).resolves.toEqual(u);
    });
  });
});
