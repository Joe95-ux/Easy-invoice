import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 32;

/** Hash a QR access password as "salt:derivedKey" using scrypt. */
export function hashQrPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(plain, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${derived}`;
}

/** Constant-time verification of a plaintext password against a stored hash. */
export function verifyQrPassword(plain: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const derived = scryptSync(plain, salt, KEY_LENGTH);
  const expected = Buffer.from(key, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}

/** Opaque cookie value proving a visitor unlocked this code (never the hash itself). */
export function qrUnlockToken(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("hex");
}

export function qrUnlockCookieName(id: string): string {
  return `qr_pw_${id}`;
}
