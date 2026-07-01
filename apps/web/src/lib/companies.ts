import type { Plan } from "@prisma/client";

export type CompanySummary = {
  id: string;
  name: string;
  logoUrl: string | null;
  plan: Plan;
};

export function toCompanySummary(company: {
  id: string;
  name: string;
  logoUrl: string | null;
  plan: Plan;
}): CompanySummary {
  return {
    id: company.id,
    name: company.name,
    logoUrl: company.logoUrl,
    plan: company.plan,
  };
}

export function membershipsToCompanySummaries(
  memberships: Array<{ company: { id: string; name: string; logoUrl: string | null; plan: Plan } }>,
): CompanySummary[] {
  return memberships.map((membership) => toCompanySummary(membership.company));
}

/** First letter of the first two words, e.g. "Rapid Co" → "RC". */
export function getCompanyInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0]![0] ?? ""}${words[1]![0] ?? ""}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}
