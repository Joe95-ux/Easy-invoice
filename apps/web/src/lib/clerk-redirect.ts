/**
 * Clerk puts absolute URLs in `redirect_url` (e.g. http://localhost:3000/dashboard).
 * Prefer a same-origin path so SignIn/SignUp redirects stay on this app.
 */
export function normalizeClerkRedirectUrl(
  value: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!value?.trim()) return fallback;
  const raw = value.trim();
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  try {
    const url = new URL(raw);
    return `${url.pathname}${url.search}${url.hash}` || fallback;
  } catch {
    return fallback;
  }
}
