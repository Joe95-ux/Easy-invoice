import { prisma } from "@/lib/db";

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
