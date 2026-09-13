import "server-only";

import { differenceInCalendarDays, format, startOfDay } from "date-fns";
import type { EstimateStatus, InvoiceStatus } from "@easy-invoice/db";
import { prisma } from "@/lib/db";
import { buildInvoicePaymentSummary } from "@/lib/invoice-payments";
import {
  buildRevenueMonthBuckets,
  resolveAnalyticsPeriod,
} from "@/lib/analytics/period";
import type {
  AgingBucket,
  AgingBucketKey,
  AnalyticsData,
  AnalyticsPeriod,
  PipelineSegment,
} from "@/features/analytics/types";

function toNumber(value: { toString(): string } | number): number {
  return typeof value === "number" ? value : parseFloat(value.toString());
}

const AGING_ORDER: AgingBucketKey[] = ["current", "1-30", "31-60", "61-90", "90+"];

const AGING_META: Record<
  AgingBucketKey,
  { label: string; tone: AgingBucket["tone"] }
> = {
  current: { label: "Current", tone: "muted" },
  "1-30": { label: "1–30 days", tone: "warning" },
  "31-60": { label: "31–60 days", tone: "warning" },
  "61-90": { label: "61–90 days", tone: "destructive" },
  "90+": { label: "90+ days", tone: "destructive" },
};

function emptyAgingBuckets(): Record<AgingBucketKey, { amount: number; count: number }> {
  return {
    current: { amount: 0, count: 0 },
    "1-30": { amount: 0, count: 0 },
    "31-60": { amount: 0, count: 0 },
    "61-90": { amount: 0, count: 0 },
    "90+": { amount: 0, count: 0 },
  };
}

function agingKeyForDaysPastDue(daysPastDue: number): AgingBucketKey {
  if (daysPastDue <= 0) return "current";
  if (daysPastDue <= 30) return "1-30";
  if (daysPastDue <= 60) return "31-60";
  if (daysPastDue <= 90) return "61-90";
  return "90+";
}

export async function getAnalyticsData(
  companyId: string,
  period: AnalyticsPeriod = "6m",
): Promise<AnalyticsData> {
  const resolved = resolveAnalyticsPeriod(period);
  const { start: periodStart, end: periodEnd, monthCount } = resolved;
  const today = startOfDay(new Date());

  const paymentPaidAtFilter =
    periodStart != null
      ? { paidAt: { gte: periodStart, lte: periodEnd } }
      : { paidAt: { lte: periodEnd } };

  const invoiceIssueFilter =
    periodStart != null
      ? { issueDate: { gte: periodStart, lte: periodEnd } }
      : { issueDate: { lte: periodEnd } };

  const [
    company,
    statusGroups,
    estimateGroups,
    openInvoices,
    overdueInvoices,
    periodPayments,
    periodInvoices,
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
        dueDate: true,
        issueDate: true,
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
        ...paymentPaidAtFilter,
        invoice: { companyId },
      },
      select: {
        amount: true,
        paidAt: true,
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
        status: { notIn: ["DRAFT", "CANCELLED"] },
        ...invoiceIssueFilter,
      },
      select: { total: true },
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

  const revenueByMonth = buildRevenueMonthBuckets(monthCount);
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

  const invoicedTotal = periodInvoices.reduce((sum, invoice) => sum + toNumber(invoice.total), 0);

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

  const agingTotals = emptyAgingBuckets();
  for (const invoice of openInvoices) {
    const balanceDue = buildInvoicePaymentSummary({
      total: invoice.total,
      payments: invoice.payments,
    }).balanceDue;
    if (balanceDue <= 0) continue;

    const due = invoice.dueDate ?? invoice.issueDate;
    const daysPastDue = Math.max(0, differenceInCalendarDays(today, startOfDay(due)));
    const key = agingKeyForDaysPastDue(daysPastDue);
    agingTotals[key].amount += balanceDue;
    agingTotals[key].count += 1;
  }

  const aging: AgingBucket[] = AGING_ORDER.map((key) => ({
    key,
    label: AGING_META[key].label,
    amount: agingTotals[key].amount,
    count: agingTotals[key].count,
    tone: AGING_META[key].tone,
  }));

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

  for (const payment of periodPayments) {
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
    period: resolved.period,
    periodLabel: resolved.label,
    summary: {
      revenueCollected,
      invoicedTotal,
      invoiceCount: periodInvoices.length,
      paymentCount: periodPayments.length,
      outstandingAr,
      overdueAr,
      overdueCount: overdueInvoices.length,
      avgDaysToPay,
      estimateWinRate,
      convertedEstimates,
    },
    revenueByMonth,
    aging,
    invoicePipeline,
    totalInvoices,
    estimatePipeline,
    totalEstimates,
    topClients,
  };
}

