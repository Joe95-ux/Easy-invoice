import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "crypto";

export const PORTAL_SESSION_COOKIE = "id_portal_session";
export const PORTAL_MAGIC_LINK_TTL_MS = 30 * 60 * 1000;
export const PORTAL_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function generatePortalToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashPortalToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function portalTokensEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function normalizePortalEmail(email: string): string {
  return email.trim().toLowerCase();
}
