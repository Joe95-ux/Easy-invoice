import { prisma } from "@/lib/db";
import type { InvoiceStatus } from "@easy-invoice/db";

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

export async function getClientsForMember(companyId: string) {
  return prisma.client.findMany({
    where: { companyId },
    include: { _count: { select: { invoices: true } } },
    orderBy: { name: "asc" },
  });
}
