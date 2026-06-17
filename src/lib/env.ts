import "server-only";

/**
 * Centralised secret access (blueprint §6 — fail closed). In production a
 * missing/weak secret THROWS rather than silently using an insecure default.
 * Reads are lazy (functions, not module-load constants) so `next build` — which
 * runs without runtime secrets — stays green; the throw only fires when a
 * secret is actually used at runtime, or via assertRequiredSecrets() at boot.
 */

const IS_PROD = process.env.NODE_ENV === "production";

class MissingSecretError extends Error {}

function readSecret(name: string, minLength = 16): string {
  const value = process.env[name];
  if (value && value.length >= minLength) return value;

  if (IS_PROD) {
    throw new MissingSecretError(
      `[env] ${name} is missing or shorter than ${minLength} chars. ` +
        `Refusing to run in production (fail-closed). Set ${name} to a strong random value.`,
    );
  }
  // Development only — never reached in production. Loud on purpose.
  console.warn(
    `[env] ${name} is unset/weak — using an INSECURE development value. ` +
      `Set ${name} before deploying.`,
  );
  return value && value.length > 0 ? value : `dev-insecure-${name.toLowerCase()}`;
}

let _downloadTokenSecret: Uint8Array | undefined;
/** HMAC key for one-time download tokens (jose). Fail-closed in production. */
export function getDownloadTokenSecret(): Uint8Array {
  if (!_downloadTokenSecret) {
    _downloadTokenSecret = new TextEncoder().encode(
      readSecret("DOWNLOAD_TOKEN_SECRET"),
    );
  }
  return _downloadTokenSecret;
}

/**
 * Fail-fast at process start (called from instrumentation). Validates every
 * required secret so a misconfigured production deploy crashes immediately
 * instead of at the first download request.
 */
export function assertRequiredSecrets(): void {
  if (!IS_PROD) return;
  const required = ["DOWNLOAD_TOKEN_SECRET", "AUTH_SECRET", "DATABASE_URL"];
  const missing: string[] = [];
  for (const name of required) {
    const v = process.env[name];
    const minLength = name === "DATABASE_URL" ? 1 : 16;
    if (!v || v.length < minLength) missing.push(name);
  }
  if (missing.length) {
    throw new MissingSecretError(
      `[env] Missing required production secrets: ${missing.join(", ")} (fail-closed).`,
    );
  }
}
