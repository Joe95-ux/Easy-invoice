/**
 * Lightweight in-memory rate limiter for public QR unlock attempts.
 * Resets on server restart — fine for single-node; swap for Redis later if needed.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function prune(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number };

export function consumeUnlockAttempt(key: string): RateLimitResult {
  const now = Date.now();
  prune(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, remaining: MAX_ATTEMPTS - 1 };
  }

  if (existing.count >= MAX_ATTEMPTS) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { ok: true, remaining: MAX_ATTEMPTS - existing.count };
}

/** Clear attempts after a successful unlock so legitimate users aren't punished. */
export function clearUnlockAttempts(key: string): void {
  buckets.delete(key);
}

export function unlockRateLimitKey(token: string, ip: string): string {
  return `${token}:${ip || "unknown"}`;
}
