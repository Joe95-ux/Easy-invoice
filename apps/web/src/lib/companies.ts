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
