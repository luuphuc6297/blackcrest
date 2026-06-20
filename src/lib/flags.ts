import "server-only";

/**
 * Runtime feature flags — env-driven, SAFE DEFAULTS, read lazily so a flag can be
 * flipped per-deploy without a code change. Add new flags here as one-liners
 * (additive registry, mirrors the permissions/capability pattern).
 */

/**
 * Per-user PDF watermark on the view/download streams.
 * DEFAULT: OFF. Enable with `WATERMARK_ENABLED=true`.
 * When off, the base PDF is streamed as-is (no per-user stamp, no watermark cache).
 */
export function watermarkEnabled(): boolean {
  return process.env.WATERMARK_ENABLED === "true";
}

/**
 * Watchlist email notifications fired when a report is PUBLISHED (F2).
 * DEFAULT: OFF — enable with `WATCHLIST_EMAILS_ENABLED=true`. Off by default so a
 * preview/staging deploy that happens to have real SMTP credentials never sends
 * surprise mail when staff publish there; watchlist rows still record, just no send.
 */
export function watchlistEmailsEnabled(): boolean {
  return process.env.WATCHLIST_EMAILS_ENABLED === "true";
}
