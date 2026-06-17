import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// env.ts decides fail-closed behaviour from NODE_ENV at module load, so each
// case stubs the env then re-imports a fresh module instance.
describe("env — fail-closed secrets (SEC-02)", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("non-prod: returns a Uint8Array dev key even when the secret is missing", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DOWNLOAD_TOKEN_SECRET", "");
    const { getDownloadTokenSecret } = await import("../env");
    expect(getDownloadTokenSecret()).toBeInstanceOf(Uint8Array);
  });

  it("non-prod: uses the provided secret when >= 16 chars", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DOWNLOAD_TOKEN_SECRET", "x".repeat(32));
    const { getDownloadTokenSecret } = await import("../env");
    expect(new TextDecoder().decode(getDownloadTokenSecret())).toBe("x".repeat(32));
  });

  it("production: THROWS when the secret is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DOWNLOAD_TOKEN_SECRET", "");
    const { getDownloadTokenSecret } = await import("../env");
    expect(() => getDownloadTokenSecret()).toThrow();
  });

  it("production: THROWS when the secret is too short", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DOWNLOAD_TOKEN_SECRET", "short");
    const { getDownloadTokenSecret } = await import("../env");
    expect(() => getDownloadTokenSecret()).toThrow();
  });

  it("assertRequiredSecrets: no-op outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const { assertRequiredSecrets } = await import("../env");
    expect(() => assertRequiredSecrets()).not.toThrow();
  });
});
