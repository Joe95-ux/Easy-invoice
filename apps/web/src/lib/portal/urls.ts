/** Public portal paths (safe for server or client). */

export function portalLoginPath(email?: string | null): string {
  const trimmed = email?.trim();
  if (!trimmed) return "/portal/login";
  return `/portal/login?email=${encodeURIComponent(trimmed.toLowerCase())}`;
}

export function portalLoginUrl(origin: string, email?: string | null): string {
  return `${origin.replace(/\/$/, "")}${portalLoginPath(email)}`;
}
