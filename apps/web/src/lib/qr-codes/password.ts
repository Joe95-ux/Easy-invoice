import { createHmac, randomBytes, scrypt, timingSafeEqual } from "crypto";

const KEY_LENGTH = 32;
/** scrypt cost — strong enough for access codes, not password-manager grade. */
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export const QR_ACCESS_PASSWORD_MIN_LENGTH = 8;

function unlockSecret(): string {
  return (
    process.env.QR_UNLOCK_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    process.env.AI_DOCS_SERVICE_SECRET ||
    "dev-insecure-qr-unlock"
  );
}

function scryptAsync(
  password: string,
  salt: string,
  keylen: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, SCRYPT_OPTIONS, (error, derived) => {
      if (error) reject(error);
      else resolve(derived as Buffer);
    });
  });
}

/** Hash a QR access password as "salt:derivedKey" using async scrypt. */
export async function hashQrPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(plain, salt, KEY_LENGTH);
  return `${salt}:${derived.toString("hex")}`;
}

/** Constant-time verification of a plaintext password against a stored hash. */
export async function verifyQrPassword(
  plain: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored) return false;
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const derived = await scryptAsync(plain, salt, KEY_LENGTH);
  const expected = Buffer.from(key, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}

/**
 * Opaque cookie value proving a visitor unlocked this code.
 * HMAC'd with a server secret so a leaked passwordHash alone is not enough to forge.
 */
export function qrUnlockToken(qrId: string, passwordHash: string): string {
  return createHmac("sha256", unlockSecret())
    .update(`${qrId}:${passwordHash}`)
    .digest("hex");
}

export function qrUnlockCookieName(id: string): string {
  return `qr_pw_${id}`;
}

export function isQrAccessPasswordStrong(password: string): boolean {
  return password.trim().length >= QR_ACCESS_PASSWORD_MIN_LENGTH;
}
