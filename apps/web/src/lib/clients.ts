import { prisma } from "@/lib/db";
import type { InvoiceStatus } from "@easy-invoice/db";
import { clientArchiveWhere, type ClientArchiveFilter } from "@/lib/schemas/client";

export type { ClientArchiveFilter };

export type ClientListItem = Awaited<ReturnType<typeof getClientsForMember>>[number];

type ClientForMember = NonNullable<Awaited<ReturnType<typeof getClientForMember>>>;

export type ClientInvoiceSummary = {
  id: string;
  number: string;
  status: InvoiceStatus;
  total: number;
  currency: string;
  createdAt: Date;
};

export type ClientDetailData = Omit<ClientForMember, "invoices"> & {
  invoices: ClientInvoiceSummary[];
};

export function serializeClientForDetail(client: ClientForMember): ClientDetailData {
  return {
    ...client,
    invoices: client.invoices.map((invoice) => ({
      ...invoice,
      total: Number(invoice.total),
    })),
  };
}

type AddressFields = Pick<ClientListItem, "address" | "city" | "state" | "zip" | "country">;

export function formatClientAddress(client: AddressFields): string {
  return [client.address, client.city, client.state, client.zip, client.country]
    .filter(Boolean)
    .join(", ");
}

export async function getClientForMember(clientId: string, companyId: string) {
  return prisma.client.findFirst({
    where: { id: clientId, companyId },
    include: {
      _count: { select: { invoices: true } },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          number: true,
          status: true,
          total: true,
          currency: true,
          createdAt: true,
        },
      },
    },
  });
}

const OPEN_INVOICE_STATUSES: InvoiceStatus[] = [
  "SENT",
  "VIEWED",
  "OVERDUE",
  "PARTIALLY_PAID",
];

export class ClientNotArchivedError extends Error {
  constructor() {
    super("Archive this client before deleting it");
    this.name = "ClientNotArchivedError";
  }
}

export class ClientHasOpenWorkError extends Error {
  constructor() {
    super(
      "This client has open invoices or an active recurring schedule. Settle or pause that work before archiving.",
    );
    this.name = "ClientHasOpenWorkError";
  }
}

export class ClientArchivedError extends Error {
  constructor() {
    super("This client is archived. Restore them before creating new work.");
    this.name = "ClientArchivedError";
  }
}

export class ClientEmailTakenError extends Error {
  constructor() {
    super("An active client already uses this email. Change it or merge before restoring.");
    this.name = "ClientEmailTakenError";
  }
}

export async function getClientsForMember(
  companyId: string,
  archived: ClientArchiveFilter = "all",
  options?: { includeIds?: Array<string | null | undefined> },
) {
  const includeIds = [
    ...new Set((options?.includeIds ?? []).filter((id): id is string => Boolean(id))),
  ];
  const archiveClause = clientArchiveWhere(archived);
  return prisma.client.findMany({
    where:
      includeIds.length > 0 && archived !== "all"
        ? { companyId, OR: [{ ...archiveClause }, { id: { in: includeIds } }] }
        : { companyId, ...archiveClause },
    include: { _count: { select: { invoices: true } } },
    orderBy: { name: "asc" },
  });
}

export async function ensureClientsInList(
  companyId: string,
  clients: ClientListItem[],
  includeIds: Array<string | null | undefined>,
): Promise<ClientListItem[]> {
  const missing = [
    ...new Set(includeIds.filter((id): id is string => Boolean(id))),
  ].filter((id) => !clients.some((client) => client.id === id));
  if (missing.length === 0) return clients;
  const extra = await prisma.client.findMany({
    where: { companyId, id: { in: missing } },
    include: { _count: { select: { invoices: true } } },
  });
  return extra.length === 0 ? clients : [...extra, ...clients];
}

export async function setClientArchived(
  companyId: string,
  id: string,
  archived: boolean,
) {
  const existing = await prisma.client.findFirst({
    where: { id, companyId },
    select: { id: true, email: true },
  });
  if (!existing) return null;

  if (!archived && existing.email) {
    const twin = await prisma.client.findFirst({
      where: {
        companyId,
        archivedAt: null,
        id: { not: id },
        email: { equals: existing.email, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (twin) throw new ClientEmailTakenError();
  }

  if (archived) {
    const [openInvoices, activeRecurring] = await Promise.all([
      prisma.invoice.count({
        where: {
          clientId: id,
          companyId,
          status: { in: OPEN_INVOICE_STATUSES },
        },
      }),
      prisma.recurringInvoice.count({
        where: { clientId: id, companyId, status: "ACTIVE" },
      }),
    ]);
    if (openInvoices > 0 || activeRecurring > 0) {
      throw new ClientHasOpenWorkError();
    }
  }

  return prisma.client.update({
    where: { id },
    data: { archivedAt: archived ? new Date() : null },
  });
}

export async function deleteClientIfArchived(companyId: string, id: string) {
  const existing = await prisma.client.findFirst({
    where: { id, companyId },
  });
  if (!existing) return null;
  if (!existing.archivedAt) {
    throw new ClientNotArchivedError();
  }
  await prisma.client.delete({ where: { id } });
  return existing;
}
