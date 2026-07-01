import { prisma } from "@/lib/db";
import type { TimeEntryInput } from "@/lib/schemas/time-entry";
import { hoursToMinutes } from "@/lib/time-tracking/format";

export async function getTimeEntriesForCompany(
  companyId: string,
  options?: {
    clientId?: string;
    ids?: string[];
    unbilledOnly?: boolean;
    billableOnly?: boolean;
    limit?: number;
  },
) {
  return prisma.timeEntry.findMany({
    where: {
      companyId,
      ...(options?.clientId && { clientId: options.clientId }),
      ...(options?.ids?.length && { id: { in: options.ids } }),
      ...(options?.unbilledOnly && { invoicedAt: null, billable: true }),
      ...(options?.billableOnly && { billable: true }),
    },
    include: {
      client: { select: { id: true, name: true } },
      invoice: { select: { id: true, number: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: options?.limit ?? 200,
  });
}

export async function getUnbilledTimeEntriesForClient(companyId: string, clientId: string) {
  return getTimeEntriesForCompany(companyId, {
    clientId,
    unbilledOnly: true,
    billableOnly: true,
  });
}

export async function createTimeEntry(
  companyId: string,
  memberId: string,
  input: TimeEntryInput,
  defaultHourlyRate?: number | null,
) {
  const hourlyRate =
    input.hourlyRate > 0 ? input.hourlyRate : Number(defaultHourlyRate ?? 0);

  if (input.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: input.clientId, companyId },
      select: { id: true },
    });
    if (!client) {
      throw new Error("Client not found");
    }
  }

  return prisma.timeEntry.create({
    data: {
      companyId,
      memberId,
      clientId: input.clientId || null,
      description: input.description.trim(),
      date: new Date(input.date),
      durationMinutes: hoursToMinutes(input.hours),
      hourlyRate,
      billable: input.billable,
    },
    include: {
      client: { select: { id: true, name: true } },
      invoice: { select: { id: true, number: true } },
    },
  });
}

type LineItemTimeLink = {
  sortOrder: number;
  timeEntryIds?: string[];
};

export async function linkTimeEntriesToInvoice(
  companyId: string,
  invoiceId: string,
  lineItems: LineItemTimeLink[],
) {
  const links = lineItems
    .map((item, index) => ({
      sortOrder: item.sortOrder ?? index,
      timeEntryIds: item.timeEntryIds ?? [],
    }))
    .filter((item) => item.timeEntryIds.length > 0);

  if (links.length === 0) return;

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    select: { clientId: true },
  });
  if (!invoice) throw new Error("Invoice not found");

  const allEntryIds = [...new Set(links.flatMap((item) => item.timeEntryIds))];
  const entries = await prisma.timeEntry.findMany({
    where: {
      id: { in: allEntryIds },
      companyId,
      invoicedAt: null,
      billable: true,
      ...(invoice.clientId ? { clientId: invoice.clientId } : {}),
    },
    select: { id: true },
  });

  if (entries.length !== allEntryIds.length) {
    throw new Error("One or more time entries are no longer available to bill");
  }

  const invoiceItems = await prisma.invoiceLineItem.findMany({
    where: { invoiceId },
    orderBy: { sortOrder: "asc" },
    select: { id: true, sortOrder: true },
  });

  const now = new Date();

  for (const link of links) {
    const lineItem = invoiceItems.find((item) => item.sortOrder === link.sortOrder);
    if (!lineItem) continue;

    await prisma.timeEntry.updateMany({
      where: {
        id: { in: link.timeEntryIds },
        companyId,
        invoicedAt: null,
      },
      data: {
        invoiceId,
        invoiceLineItemId: lineItem.id,
        invoicedAt: now,
      },
    });
  }
}

export async function releaseTimeEntriesForInvoice(invoiceId: string) {
  await prisma.timeEntry.updateMany({
    where: { invoiceId },
    data: {
      invoiceId: null,
      invoiceLineItemId: null,
      invoicedAt: null,
    },
  });
}

export function serializeTimeEntry(
  entry: Awaited<ReturnType<typeof getTimeEntriesForCompany>>[number],
) {
  return {
    id: entry.id,
    clientId: entry.clientId,
    clientName: entry.client?.name ?? null,
    description: entry.description,
    date: entry.date.toISOString(),
    durationMinutes: entry.durationMinutes,
    hours: Math.round((entry.durationMinutes / 60) * 100) / 100,
    hourlyRate: Number(entry.hourlyRate),
    billable: entry.billable,
    invoicedAt: entry.invoicedAt?.toISOString() ?? null,
    invoiceId: entry.invoiceId,
    invoiceNumber: entry.invoice?.number ?? null,
    createdAt: entry.createdAt.toISOString(),
  };
}
