import { prisma } from "@/lib/db";

type ResolveHourlyRateInput = {
  clientId?: string | null;
  explicitRate?: number | null;
};

/** Client rate → company default → 0. Explicit positive rate always wins. */
export async function resolveHourlyRate(
  companyId: string,
  input: ResolveHourlyRateInput,
): Promise<number> {
  if (input.explicitRate != null && input.explicitRate > 0) {
    return input.explicitRate;
  }

  if (input.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: input.clientId, companyId },
      select: {
        defaultHourlyRate: true,
        company: { select: { defaultHourlyRate: true } },
      },
    });

    if (client?.defaultHourlyRate != null && Number(client.defaultHourlyRate) > 0) {
      return Number(client.defaultHourlyRate);
    }

    if (client?.company.defaultHourlyRate != null && Number(client.company.defaultHourlyRate) > 0) {
      return Number(client.company.defaultHourlyRate);
    }
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { defaultHourlyRate: true },
  });

  return company?.defaultHourlyRate ? Number(company.defaultHourlyRate) : 0;
}

/** Sync helper when client + company defaults are already loaded. */
export function resolveHourlyRateFromDefaults(
  options: {
    explicitRate?: number | null;
    clientDefaultHourlyRate?: number | null;
    companyDefaultHourlyRate?: number | null;
  },
): number {
  if (options.explicitRate != null && options.explicitRate > 0) {
    return options.explicitRate;
  }
  if (options.clientDefaultHourlyRate != null && options.clientDefaultHourlyRate > 0) {
    return options.clientDefaultHourlyRate;
  }
  if (options.companyDefaultHourlyRate != null && options.companyDefaultHourlyRate > 0) {
    return options.companyDefaultHourlyRate;
  }
  return 0;
}
