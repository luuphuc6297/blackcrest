import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { getEmailTokenSecret } from "@/lib/env";

/**
 * Email-verification tokens (blueprint §F3 — registration). A short-lived signed
 * JWT carrying the user id, purpose-tagged so it can't be used as any other token.
 * Stateless (no DB row): verification is idempotent — re-clicking a still-valid
 * link just re-confirms. The signing key is fail-closed in production (@/lib/env).
 */
const PURPOSE = "email-verify";
const TTL = "24h";

export async function mintEmailVerifyToken(userId: string): Promise<string> {
  return new SignJWT({ purpose: PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(TTL)
    .sign(getEmailTokenSecret());
}

/** Verify a token. Returns the userId, or null if invalid / expired / wrong purpose. */
export async function verifyEmailToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getEmailTokenSecret());
    if (payload.purpose !== PURPOSE || typeof payload.sub !== "string") return null;
    return payload.sub;
  } catch {
    return null;
  }
}

/* ── Admin-invite tokens (set-password link) — longer-lived, admin-initiated ── */
const INVITE_PURPOSE = "invite";
const INVITE_TTL = "7d";

export async function mintInviteToken(userId: string): Promise<string> {
  return new SignJWT({ purpose: INVITE_PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(INVITE_TTL)
    .sign(getEmailTokenSecret());
}

export async function verifyInviteToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getEmailTokenSecret());
    if (payload.purpose !== INVITE_PURPOSE || typeof payload.sub !== "string") {
      return null;
    }
    return payload.sub;
  } catch {
    return null;
  }
}
