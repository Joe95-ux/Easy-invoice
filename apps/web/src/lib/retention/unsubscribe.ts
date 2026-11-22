import { createHmac, timingSafeEqual } from "crypto";

function unsubscribeSecret(): string {
  const dedicated = process.env.RETENTION_UNSUBSCRIBE_SECRET?.trim();
  if (dedicated) return dedicated;

  if (process.env.NODE_ENV === "production") {
    // Fall back to QR secret rather than failing email send in prod if unset.
    const fallback =
      process.env.QR_UNLOCK_SECRET?.trim() || process.env.CLERK_SECRET_KEY?.trim();
    if (fallback) return fallback;
    throw new Error("RETENTION_UNSUBSCRIBE_SECRET is required in production");
  }

  return (
    process.env.QR_UNLOCK_SECRET?.trim() ||
    process.env.CLERK_SECRET_KEY?.trim() ||
    "dev-insecure-retention-unsub"
  );
}

/** Opaque token proving a client may opt out of marketing for this company. */
export function retentionUnsubscribeToken(clientId: string, companyId: string): string {
  const sig = createHmac("sha256", unsubscribeSecret())
    .update(`${clientId}:${companyId}`)
    .digest("base64url");
  return Buffer.from(`${clientId}.${companyId}.${sig}`).toString("base64url");
}

export function parseRetentionUnsubscribeToken(
  token: string,
): { clientId: string; companyId: string } | null {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const [clientId, companyId, sig] = raw.split(".");
    if (!clientId || !companyId || !sig) return null;

    const expected = createHmac("sha256", unsubscribeSecret())
      .update(`${clientId}:${companyId}`)
      .digest("base64url");

    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    return { clientId, companyId };
  } catch {
    return null;
  }
}
