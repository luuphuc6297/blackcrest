import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/mailer";

/**
 * One-click unsubscribe for watchlist emails (F2). The token is a stable, random
 * per-user secret stored in User.unsubscribeToken — minted lazily the first time
 * a user is emailed, then reused. (Stable, not one-time, because an unsubscribe
 * link must keep working across every alert; the action is idempotent.)
 */

/** Get the user's unsubscribe token, minting + persisting it on first use. */
export async function getOrCreateUnsubscribeToken(userId: string): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { unsubscribeToken: true },
  });
  if (existing?.unsubscribeToken) return existing.unsubscribeToken;

  const token = randomBytes(32).toString("base64url");
  // Atomic "set only if still null" so two concurrent first-alerts can't each
  // mint a different token and leave one email pointing at a stale link.
  const res = await prisma.user.updateMany({
    where: { id: userId, unsubscribeToken: null },
    data: { unsubscribeToken: token },
  });
  if (res.count === 1) return token;
  const again = await prisma.user.findUnique({
    where: { id: userId },
    select: { unsubscribeToken: true },
  });
  return again?.unsubscribeToken ?? token;
}

/** Absolute, localized unsubscribe link for an email footer. */
export function unsubscribeUrl(token: string, locale = "vi"): string {
  return `${getAppUrl()}/${locale}/unsubscribe?token=${encodeURIComponent(token)}`;
}

/** Resolve the user behind a presented unsubscribe token (null if unknown). */
export async function findUserByUnsubscribeToken(token: string) {
  if (!token) return null;
  return prisma.user.findUnique({
    where: { unsubscribeToken: token },
    select: { id: true, email: true, watchlistEmails: true },
  });
}

/** Idempotently turn watchlist emails OFF for the token's owner. */
export async function unsubscribeByToken(token: string): Promise<boolean> {
  if (!token) return false;
  const res = await prisma.user.updateMany({
    where: { unsubscribeToken: token },
    data: { watchlistEmails: false },
  });
  return res.count === 1;
}
