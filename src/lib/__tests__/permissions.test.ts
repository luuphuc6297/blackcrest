import { describe, it, expect } from "vitest";
import type { Role } from "@prisma/client";
import { can, PERMISSIONS, STAFF, type Capability } from "../permissions";

// The central PERMISSIONS map is the SINGLE source both the server gates
// (requireCapability) and the UI (can) read — this locks the role→action matrix
// so a change can't silently drift one surface from the other.
const ALL_ROLES: Role[] = ["SUPER_ADMIN", "EDITOR", "APPROVER", "CLIENT"];

describe("permission registry", () => {
  it("STAFF = everyone except CLIENT", () => {
    expect([...STAFF].sort()).toEqual(["APPROVER", "EDITOR", "SUPER_ADMIN"]);
    expect(STAFF).not.toContain("CLIENT");
  });

  it("encodes the intended capability matrix", () => {
    const matrix: Record<Capability, Role[]> = {
      "report.upload": ["SUPER_ADMIN", "EDITOR", "APPROVER"],
      "report.setAccess": ["SUPER_ADMIN", "EDITOR", "APPROVER"],
      "report.review": ["SUPER_ADMIN", "APPROVER"],
      "report.delete": ["SUPER_ADMIN"],
      "account.manage": ["SUPER_ADMIN", "APPROVER"],
      "account.invite": ["SUPER_ADMIN"],
      "account.setRole": ["SUPER_ADMIN"],
      "entitlement.manage": ["SUPER_ADMIN", "APPROVER"],
      "admin.viewData": ["SUPER_ADMIN", "APPROVER"],
    };
    for (const cap of Object.keys(matrix) as Capability[]) {
      for (const role of ALL_ROLES) {
        expect(can(role, cap)).toBe(matrix[cap].includes(role));
      }
    }
  });

  it("CLIENT has NO gated capability (read/download is entitlement-based, not RBAC)", () => {
    for (const cap of Object.keys(PERMISSIONS) as Capability[]) {
      expect(can("CLIENT", cap)).toBe(false);
    }
  });

  it("EDITOR can upload + set access but not review/delete/manage", () => {
    expect(can("EDITOR", "report.upload")).toBe(true);
    expect(can("EDITOR", "report.setAccess")).toBe(true);
    expect(can("EDITOR", "report.review")).toBe(false);
    expect(can("EDITOR", "report.delete")).toBe(false);
    expect(can("EDITOR", "account.manage")).toBe(false);
  });

  it("null/undefined role is denied everything", () => {
    expect(can(null, "report.upload")).toBe(false);
    expect(can(undefined, "admin.viewData")).toBe(false);
  });
});
