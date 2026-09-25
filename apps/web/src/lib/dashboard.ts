import { prisma } from "@/lib/db";
import {
  getActionableFollowUpPreviews,
  getFollowUpActionCounts,
} from "@/lib/follow-ups/service";
import { paymentAmountInHomeCurrency } from "@/lib/home-currency";
import { buildInvoicePaymentSummary } from "@/lib/invoice-payments";
import {
  getCompanyUnbilledTimeStats,
  getUnbilledTimePreviews,
} from "@/lib/time-tracking/unbilled-stats";

const ATTENTION_PREVIEW_TAKE = 5;

export async function getDashboardStats(companyId: string) {
  const [
    company,
    statusGroups,
    clientCount,
    recentInvoices,
    openInvoices,
    unbilledTime,
    followUps,
    followUpPreviews,
    unbilledPreviews,
  ] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { currency: true },
    }),
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
    prisma.invoice.findMany({
      where: {
        companyId,
        status: { in: ["SENT", "VIEWED", "OVERDUE", "PARTIALLY_PAID"] },
      },
      select: {
        total: true,
        currency: true,
        exchangeRate: true,
        payments: { select: { amount: true } },
      },
    }),
    getCompanyUnbilledTimeStats(companyId),
    getFollowUpActionCounts(companyId),
    getActionableFollowUpPreviews(companyId, ATTENTION_PREVIEW_TAKE),
    getUnbilledTimePreviews(companyId, ATTENTION_PREVIEW_TAKE),
  ]);

  const countByStatus = Object.fromEntries(
    statusGroups.map((group) => [group.status, group._count._all]),
  ) as Record<string, number>;

  const totalInvoices = statusGroups.reduce((sum, group) => sum + group._count._all, 0);
  const homeCurrency = company.currency;
  const outstandingTotal = openInvoices.reduce((sum, invoice) => {
    const balanceDueDoc = buildInvoicePaymentSummary({
      total: invoice.total,
      payments: invoice.payments,
    }).balanceDue;
    if (balanceDueDoc <= 0) return sum;
    const balanceDue = paymentAmountInHomeCurrency({
      amount: balanceDueDoc,
      invoiceCurrency: invoice.currency,
      homeCurrency,
      exchangeRate: invoice.exchangeRate,
    });
    return balanceDue == null ? sum : sum + balanceDue;
  }, 0);

  return {
    totalInvoices,
    draftCount: countByStatus.DRAFT ?? 0,
    paidCount: countByStatus.PAID ?? 0,
    overdueCount: countByStatus.OVERDUE ?? 0,
    clientCount,
    recentInvoices,
    outstandingTotal,
    outstandingCount: openInvoices.length,
    unbilledTime: {
      ...unbilledTime,
      previews: unbilledPreviews,
    },
    followUps: {
      ...followUps,
      previews: followUpPreviews,
    },
  };
}
