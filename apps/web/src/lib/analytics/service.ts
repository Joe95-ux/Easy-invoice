import "server-only";

import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import type { EstimateStatus, InvoiceStatus } from "@easy-invoice/db";
import { prisma } from "@/lib/db";
import { buildInvoicePaymentSummary } from "@/lib/invoice-payments";
import type { AnalyticsData, PipelineSegment } from "@/features/analytics/types";

const REVENUE_MONTHS = 6;

function toNumber(value: { toString(): string } | number): number {
  return typeof value === "number" ? value : parseFloat(value.toString());
}

function buildRevenueMonthBuckets() {
  const now = new Date();
  return Array.from({ length: REVENUE_MONTHS }, (_, index) => {
    const monthDate = startOfMonth(subMonths(now, REVENUE_MONTHS - 1 - index));
    return {
      month: format(monthDate, "yyyy-MM"),
      label: format(monthDate, "MMM"),
      amount: 0,
    };
  });
}

export async function getAnalyticsData(companyId: string): Promise<AnalyticsData> {
  const periodStart = startOfMonth(subMonths(new Date(), REVENUE_MONTHS - 1));
  const periodEnd = endOfMonth(new Date());

  const [
    company,
    statusGroups,
    estimateGroups,
    openInvoices,
    overdueInvoices,
    periodPayments,
    allPayments,
    paidInvoices,
    convertedEstimates,
  ] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { currency: true },
    }),
    prisma.invoice.groupBy({
      by: ["status"],
      where: { companyId, status: { not: "CANCELLED" } },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.estimate.groupBy({
      by: ["status"],
      where: { companyId, status: { not: "CANCELLED" } },
      _count: { _all: true },
    }),
    prisma.invoice.findMany({
      where: {
        companyId,
        status: { in: ["SENT", "VIEWED", "OVERDUE", "PARTIALLY_PAID"] },
      },
      select: {
        total: true,
        payments: { select: { amount: true } },
      },
    }),
    prisma.invoice.findMany({
      where: { companyId, status: "OVERDUE" },
      select: {
        total: true,
        payments: { select: { amount: true } },
      },
    }),
    prisma.invoicePayment.findMany({
      where: {
        paidAt: { gte: periodStart, lte: periodEnd },
        invoice: { companyId },
      },
      select: { amount: true, paidAt: true },
    }),
    prisma.invoicePayment.findMany({
      where: { invoice: { companyId } },
      select: {
        amount: true,
        invoice: {
          select: {
            id: true,
            clientId: true,
            client: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.invoice.findMany({
      where: {
        companyId,
        status: "PAID",
        paidAt: { not: null },
        sentAt: { not: null },
      },
      select: { sentAt: true, paidAt: true },
    }),
    prisma.invoice.count({
      where: { companyId, sourceEstimateId: { not: null } },
    }),
  ]);

  const revenueByMonth = buildRevenueMonthBuckets();
  const monthIndex = new Map(revenueByMonth.map((row, index) => [row.month, index]));

  let revenueCollected = 0;
  for (const payment of periodPayments) {
    const amount = toNumber(payment.amount);
    revenueCollected += amount;
    const key = format(payment.paidAt, "yyyy-MM");
    const index = monthIndex.get(key);
    if (index !== undefined) {
      revenueByMonth[index]!.amount += amount;
    }
  }

  const outstandingAr = openInvoices.reduce((sum, invoice) => {
    return (
      sum +
      buildInvoicePaymentSummary({
        total: invoice.total,
        payments: invoice.payments,
      }).balanceDue
    );
  }, 0);

  const overdueAr = overdueInvoices.reduce((sum, invoice) => {
    return (
      sum +
      buildInvoicePaymentSummary({
        total: invoice.total,
        payments: invoice.payments,
      }).balanceDue
    );
  }, 0);

  const statusCountMap = Object.fromEntries(
    statusGroups.map((group) => [group.status, group._count._all]),
  ) as Partial<Record<InvoiceStatus, number>>;

  const estimateCountMap = Object.fromEntries(
    estimateGroups.map((group) => [group.status, group._count._all]),
  ) as Partial<Record<EstimateStatus, number>>;

  const totalInvoices = statusGroups.reduce((sum, group) => sum + group._count._all, 0);
  const draftCount = statusCountMap.DRAFT ?? 0;
  const paidCount = statusCountMap.PAID ?? 0;
  const outstandingCount =
    (statusCountMap.SENT ?? 0) +
    (statusCountMap.VIEWED ?? 0) +
    (statusCountMap.OVERDUE ?? 0) +
    (statusCountMap.PARTIALLY_PAID ?? 0);

  const invoicePipeline: PipelineSegment[] = [
    { label: "Drafts", value: draftCount, tone: "muted" },
    { label: "Outstanding", value: outstandingCount, tone: "warning" },
    { label: "Paid", value: paidCount, tone: "success" },
  ];

  const totalEstimates = estimateGroups.reduce((sum, group) => sum + group._count._all, 0);
  const openEstimateCount =
    (estimateCountMap.DRAFT ?? 0) +
    (estimateCountMap.SENT ?? 0) +
    (estimateCountMap.VIEWED ?? 0);
  const acceptedCount = estimateCountMap.ACCEPTED ?? 0;
  const lostEstimateCount =
    (estimateCountMap.DECLINED ?? 0) + (estimateCountMap.EXPIRED ?? 0);

  const estimatePipeline: PipelineSegment[] = [
    { label: "Open", value: openEstimateCount, tone: "muted" },
    { label: "Accepted", value: acceptedCount, tone: "success" },
    { label: "Declined", value: lostEstimateCount, tone: "warning" },
  ];

  const accepted = estimateCountMap.ACCEPTED ?? 0;
  const declined = estimateCountMap.DECLINED ?? 0;
  const expired = estimateCountMap.EXPIRED ?? 0;
  const closedEstimates = accepted + declined + expired;
  const estimateWinRate = closedEstimates > 0 ? Math.round((accepted / closedEstimates) * 100) : null;

  const clientTotals = new Map<
    string,
    { name: string; revenue: number; invoiceIds: Set<string> }
  >();

  for (const payment of allPayments) {
    const clientId = payment.invoice.clientId ?? "__none__";
    const name = payment.invoice.client?.name ?? "No client";
    const existing = clientTotals.get(clientId) ?? {
      name,
      revenue: 0,
      invoiceIds: new Set<string>(),
    };
    existing.revenue += toNumber(payment.amount);
    existing.invoiceIds.add(payment.invoice.id);
    clientTotals.set(clientId, existing);
  }

  const topClients = [...clientTotals.entries()]
    .map(([id, row]) => ({
      id,
      name: row.name,
      revenue: row.revenue,
      invoiceCount: row.invoiceIds.size,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const daysToPay = paidInvoices
    .map((invoice) => {
      const sent = invoice.sentAt!.getTime();
      const paid = invoice.paidAt!.getTime();
      return Math.max(0, Math.round((paid - sent) / (1000 * 60 * 60 * 24)));
    })
    .filter((days) => Number.isFinite(days));

  const avgDaysToPay =
    daysToPay.length > 0
      ? Math.round(daysToPay.reduce((sum, days) => sum + days, 0) / daysToPay.length)
      : null;

  return {
    currency: company.currency,
    periodLabel: `Last ${REVENUE_MONTHS} months`,
    summary: {
      revenueCollected,
      outstandingAr,
      overdueAr,
      overdueCount: overdueInvoices.length,
      avgDaysToPay,
      estimateWinRate,
      convertedEstimates,
    },
    revenueByMonth,
    invoicePipeline,
    totalInvoices,
    estimatePipeline,
    totalEstimates,
    topClients,
  };
}
