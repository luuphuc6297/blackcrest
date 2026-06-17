import type { Role } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Staff roles bypass entitlement EXPLICITLY (blueprint §4, §F2). */
export const STAFF_ROLES: Role[] = ["SUPER_ADMIN", "EDITOR", "APPROVER"];

export function isStaff(role: Role | undefined | null): boolean {
  return !!role && STAFF_ROLES.includes(role);
}

export class AuthError extends Error {}
export class ForbiddenError extends Error {}

/**
 * Resolve the current session user at the data layer. Use at the top of every
 * Server Action / Route Handler — never trust the middleware (blueprint §6.1).
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new AuthError("Unauthorized");
  return session.user;
}

/** Require one of the given roles. */
export async function requireRole(...roles: Role[]) {
  const user = await requireAuth();
  if (!roles.includes(user.role)) throw new ForbiddenError("Forbidden");
  return user;
}

/**
 * For sensitive actions (download, admin writes): re-validate status +
 * tokenVersion against the DB so suspensions / forced re-logins take effect
 * immediately rather than waiting for the JWT to expire (blueprint §F3, §6.4).
 */
export async function requireFreshUser() {
  const sessionUser = await requireAuth();
  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, role: true, status: true, tokenVersion: true },
  });
  if (!dbUser || dbUser.status !== "APPROVED") {
    throw new AuthError("Account no longer active");
  }
  // Forced re-login: if tokenVersion was bumped (suspend / password change /
  // "log out everywhere") the outstanding JWT is now stale — reject it. This is
  // the comparison the audit (SEC-12) flagged as missing.
  if (dbUser.tokenVersion !== sessionUser.tokenVersion) {
    throw new AuthError("Session revoked");
  }
  return dbUser;
}

/**
 * Like requireRole, but re-validates status + tokenVersion against the DB
 * (requireFreshUser) so a suspended / demoted / revoked user is blocked
 * IMMEDIATELY rather than within the JWT window. Use on sensitive writes
 * (uploads, lifecycle actions) — blueprint §6.4.
 */
export async function requireFreshRole(...roles: Role[]) {
  const dbUser = await requireFreshUser();
  if (!roles.includes(dbUser.role)) throw new ForbiddenError("Forbidden");
  return dbUser;
}
