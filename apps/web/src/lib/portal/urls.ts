/** Public portal paths (safe for server or client). */

export function portalLoginPath(email?: string | null): string {
  const trimmed = email?.trim();
  if (!trimmed) return "/portal/login";
  return `/portal/login?email=${encodeURIComponent(trimmed.toLowerCase())}`;
}

export function portalLoginUrl(origin: string, email?: string | null): string {
  return `${origin.replace(/\/$/, "")}${portalLoginPath(email)}`;
}

/** Append `from=portal` so public document flows can return to the portal. */
export function withPortalReturn(path: string): string {
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("from", "portal");
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function portalHomePath(flash?: {
  paid?: boolean;
  canceled?: boolean;
  estimateAccepted?: boolean;
  estimateDeclined?: boolean;
}): string {
  const params = new URLSearchParams();
  if (flash?.paid) params.set("paid", "1");
  if (flash?.canceled) params.set("canceled", "1");
  if (flash?.estimateAccepted) params.set("estimateAccepted", "1");
  if (flash?.estimateDeclined) params.set("estimateDeclined", "1");
  const qs = params.toString();
  return qs ? `/portal?${qs}` : "/portal";
}
