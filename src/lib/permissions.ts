import type { Role } from "@prisma/client";

/**
 * SINGLE SOURCE OF TRUTH for role → action authorization (the RBAC axis;
 * data-level entitlement lives separately in @/lib/authz). Both the server
 * gates (`requireCapability` in @/lib/rbac) and the UI affordances (`can`)
 * read this one map, so a button can never be shown to a role the server
 * would reject, and changing who-can-do-X is a one-line edit here.
 *
 * Edge-safe: only a type-only import + plain arrays, so `STAFF` can be used in
 * middleware (no Prisma/argon2 runtime is pulled in).
 */

/** Staff roles — everyone except CLIENT. Bypass entitlement explicitly (authz). */
export const STAFF: Role[] = ["SUPER_ADMIN", "EDITOR", "APPROVER"];

/** Every gated action in the app, named once. */
export const PERMISSIONS = {
  // Reports
  "report.upload": STAFF, // create a DRAFT from an uploaded PDF
  "report.setAccess": STAFF, // toggle PUBLIC ↔ RESTRICTED
  "report.tag": STAFF, // tag tickers (symbols) on a report
  "report.review": ["SUPER_ADMIN", "APPROVER"], // submit/approve/reject/publish
  "report.delete": ["SUPER_ADMIN"], // destructive
  // Accounts
  "account.manage": ["SUPER_ADMIN", "APPROVER"], // approve/reject/suspend/reinstate
  "account.invite": ["SUPER_ADMIN"],
  "account.setRole": ["SUPER_ADMIN"], // change an existing account's role
  // Entitlements + admin reads
  "entitlement.manage": ["SUPER_ADMIN", "APPROVER"],
  "admin.viewData": ["SUPER_ADMIN", "APPROVER"], // accounts/groups/audit lists
} as const satisfies Record<string, Role[]>;

export type Capability = keyof typeof PERMISSIONS;

/** Pure predicate — usable in RSC, client components, and tests. */
export function can(role: Role | undefined | null, cap: Capability): boolean {
  return !!role && (PERMISSIONS[cap] as readonly Role[]).includes(role);
}

/** Is this role staff (any non-CLIENT)? Kept here so STAFF has one home. */
export function isStaffRole(role: Role | undefined | null): boolean {
  return !!role && STAFF.includes(role);
}
