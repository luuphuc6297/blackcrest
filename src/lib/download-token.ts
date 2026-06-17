import "server-only";
import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { getDownloadTokenSecret } from "@/lib/env";

/**
 * One-time, short-lived download tokens (blueprint §F1, §6.2). The jti is
 * persisted; verification consumes it atomically so a token works exactly once.
 * The signing key is fail-closed in production (see @/lib/env) — no insecure
 * fallback is baked in.
 */
const TTL_SECONDS = 60;

export async function mintDownloadToken(opts: {
  userId: string;
  reportId: string;
}): Promise<string> {
  const jti = randomUUID();
  const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000);

  await prisma.downloadToken.create({
    data: { jti, userId: opts.userId, reportId: opts.reportId, expiresAt },
  });

  return new SignJWT({ rid: opts.reportId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(opts.userId)
    .setJti(jti)
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(getDownloadTokenSecret());
}

export type DownloadClaim = { userId: string; reportId: string };

/** Verify + CONSUME a token. Returns the claim, or null if invalid/expired/used. */
export async function consumeDownloadToken(
  token: string,
): Promise<DownloadClaim | null> {
  let payload: { sub?: string; jti?: string; rid?: unknown };
  try {
    ({ payload } = await jwtVerify(token, getDownloadTokenSecret()));
  } catch {
    return null;
  }
  const { sub, jti, rid } = payload;
  if (!sub || !jti || typeof rid !== "string") return null;

  // Atomic single-use: only the first updateMany that flips consumedAt wins.
  const res = await prisma.downloadToken.updateMany({
    where: { jti, consumedAt: null, expiresAt: { gt: new Date() } },
    data: { consumedAt: new Date() },
  });
  if (res.count !== 1) return null;

  return { userId: sub, reportId: rid };
}
