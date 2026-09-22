/**
 * Production env guards. Called from instrumentation on boot.
 * Missing values fail the deploy/process instead of silent runtime breakage.
 */

const PROD_REQUIRED = [
  "DATABASE_URL",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CRON_SECRET",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "AI_DOCS_SERVICE_SECRET",
  "QR_UNLOCK_SECRET",
] as const;

function hasAppUrl(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_URL?.trim(),
  );
}

/** Throws if production essentials are missing or still using placeholder secrets. */
export function assertProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") return;

  const missing: string[] = [];
  for (const key of PROD_REQUIRED) {
    const value = process.env[key]?.trim();
    if (!value) missing.push(key);
  }
  if (!hasAppUrl()) missing.push("NEXT_PUBLIC_APP_URL (or APP_URL)");

  const weakSecrets: string[] = [];
  const aiSecret = process.env.AI_DOCS_SERVICE_SECRET?.trim() ?? "";
  if (aiSecret === "change-me-in-production" || aiSecret.length < 16) {
    weakSecrets.push("AI_DOCS_SERVICE_SECRET (set a long random value)");
  }
  const cron = process.env.CRON_SECRET?.trim() ?? "";
  if (cron.length < 16) {
    weakSecrets.push("CRON_SECRET (set a long random value)");
  }

  if (missing.length === 0 && weakSecrets.length === 0) return;

  const parts: string[] = [];
  if (missing.length > 0) {
    parts.push(`Missing required env: ${missing.join(", ")}`);
  }
  if (weakSecrets.length > 0) {
    parts.push(`Weak/placeholder env: ${weakSecrets.join(", ")}`);
  }
  throw new Error(`[env] Production config invalid. ${parts.join(" ")}`);
}
