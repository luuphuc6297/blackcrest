"use server";

import { unsubscribeByToken } from "@/lib/unsubscribe";

export type UnsubResult = { ok: boolean };

/**
 * Turn off watchlist emails for the token's owner (F2). The token itself is the
 * authorization — no session required, since the recipient clicks from an email.
 * Invoked from the confirm form on /[locale]/unsubscribe (a POST, never a bare
 * GET, so email link-scanners can't unsubscribe a user by prefetching).
 */
export async function confirmUnsubscribe(token: string): Promise<UnsubResult> {
  return { ok: await unsubscribeByToken(token) };
}
