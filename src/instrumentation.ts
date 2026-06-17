/**
 * Next.js boot hook. In production we validate required secrets here so a
 * misconfigured deploy fails fast at startup (fail-closed) rather than at the
 * first request that needs a secret. Only runs in the Node.js server runtime.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertRequiredSecrets } = await import("@/lib/env");
    assertRequiredSecrets();
  }
}
