import { prisma } from "@/lib/db";
import { buildUnpaidAttention } from "@/lib/dashboard-unpaid";
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
        id: true,
        number: true,
        total: true,
        currency: true,
        dueDate: true,
        exchangeRate: true,
        client: { select: { name: true } },
        payments: { select: { amount: true, kind: true } },
        creditNotes: {
          where: { status: "ISSUED" },
          select: { total: true, status: true },
        },
        lateFees: { select: { amount: true } },
        installments: {
          select: { id: true, dueDate: true, amount: true, label: true, sortOrder: true },
        },
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
  const unpaidForAttention = openInvoices.map((invoice) => {
    const summary = buildInvoicePaymentSummary({
      total: invoice.total,
      dueDate: invoice.dueDate,
      payments: invoice.payments,
      creditNotes: invoice.creditNotes,
      lateFees: invoice.lateFees,
      installments: invoice.installments,
    });
    return {
      invoice,
      summary,
    };
  });

  const outstandingTotal = unpaidForAttention.reduce((sum, { invoice, summary }) => {
    if (summary.balanceDue <= 0) return sum;
    const balanceDue = paymentAmountInHomeCurrency({
      amount: summary.balanceDue,
      invoiceCurrency: invoice.currency,
      homeCurrency,
      exchangeRate: invoice.exchangeRate,
    });
    return balanceDue == null ? sum : sum + balanceDue;
  }, 0);

  const unpaid = buildUnpaidAttention(
    unpaidForAttention.map(({ invoice, summary }) => ({
      id: invoice.id,
      number: invoice.number,
      currency: invoice.currency,
      clientName: invoice.client?.name ?? null,
      balanceDue: summary.balanceDue,
      dueDate: summary.nextDueDate ?? invoice.dueDate,
    })),
    new Date(),
    ATTENTION_PREVIEW_TAKE,
  );

  return {
    totalInvoices,
    draftCount: countByStatus.DRAFT ?? 0,
    paidCount: countByStatus.PAID ?? 0,
    overdueCount: countByStatus.OVERDUE ?? 0,
    clientCount,
    recentInvoices,
    outstandingTotal,
    outstandingCount: openInvoices.length,
    unpaid,
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
