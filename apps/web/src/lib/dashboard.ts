import { prisma } from "@/lib/db";

export async function getDashboardStats(companyId: string) {
  const [statusGroups, clientCount, recentInvoices, outstanding] = await Promise.all([
    prisma.invoice.groupBy({
      by: ["status"],
      where: { companyId },
      _count: { _all: true },
    }),
    prisma.client.count({ where: { companyId } }),
    prisma.invoice.findMany({
      where: { companyId },
      include: { client: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.invoice.aggregate({
      where: {
        companyId,
        status: { in: ["SENT", "VIEWED", "OVERDUE"] },
      },
      _sum: { total: true },
      _count: { _all: true },
    }),
  ]);

  const countByStatus = Object.fromEntries(
    statusGroups.map((group) => [group.status, group._count._all]),
  ) as Record<string, number>;

  const totalInvoices = statusGroups.reduce((sum, group) => sum + group._count._all, 0);

  return {
    totalInvoices,
    draftCount: countByStatus.DRAFT ?? 0,
    paidCount: countByStatus.PAID ?? 0,
    overdueCount: countByStatus.OVERDUE ?? 0,
    clientCount,
    recentInvoices,
    outstandingTotal: Number(outstanding._sum.total ?? 0),
    outstandingCount: outstanding._count._all,
  };
}
