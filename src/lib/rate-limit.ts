import "server-only";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

/**
 * Per-account login throttle + lockout (blueprint §F3). DB-backed so it
 * survives restarts and works without any external service (data-localization).
 * After MAX_FAILED_ATTEMPTS wrong passwords the account is locked for
 * LOCKOUT_MINUTES; a successful login clears the counter.
 */
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export function isLocked(user: { lockedUntil: Date | null }): boolean {
  return !!user.lockedUntil && user.lockedUntil.getTime() > Date.now();
}

/** Record a failed attempt; lock the account once the threshold is crossed. */
export async function registerFailedLogin(userId: string): Promise<void> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: { increment: 1 } },
    select: { failedLoginCount: true },
  });

  if (updated.failedLoginCount >= MAX_FAILED_ATTEMPTS) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60_000),
        failedLoginCount: 0,
      },
    });
    await logAudit({
      actorId: userId,
      action: "ACCOUNT_LOCKED",
      targetType: "User",
      targetId: userId,
      metadata: { reason: "too_many_failed_logins", lockoutMinutes: LOCKOUT_MINUTES },
    });
  }
}

/** Clear the throttle after a successful authentication. */
export async function clearFailedLogins(userId: string): Promise<void> {
  // Only write when there is something to reset (avoid needless updates).
  await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [{ failedLoginCount: { gt: 0 } }, { lockedUntil: { not: null } }],
    },
    data: { failedLoginCount: 0, lockedUntil: null },
  });
}
