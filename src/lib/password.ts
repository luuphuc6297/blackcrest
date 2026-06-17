import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id password hashing — OWASP 2026 parameters (blueprint §1, §6.3).
 * Node runtime only (native binding).
 */
const ARGON2_OPTS = {
  // Argon2id
  algorithm: 2 as const,
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 1,
};

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTS);
}

export async function verifyPassword(
  storedHash: string,
  plain: string,
): Promise<boolean> {
  try {
    return await verify(storedHash, plain);
  } catch {
    return false;
  }
}
