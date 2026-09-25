import "server-only";

import { differenceInCalendarDays, format, startOfDay } from "date-fns";
import type { EstimateStatus, InvoiceStatus } from "@easy-invoice/db";
import { prisma } from "@/lib/db";
import { buildInvoicePaymentSummary } from "@/lib/invoice-payments";
import {
  buildPeriodDelta,
  buildRevenueMonthBucketsForRange,
  previousAnalyticsRange,
  type ResolvedAnalyticsRange,
} from "@/lib/analytics/period";
import type {
  AgingBucket,
  AgingBucketKey,
  AgingInvoiceRow,
  AnalyticsData,
  PipelineSegment,
} from "@/features/analytics/types";
import {
  invoiceAmountInHomeCurrency,
  paymentAmountInHomeCurrency,
} from "@/lib/home-currency";

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : parseFloat(value.toString());
}

const AGING_ORDER: AgingBucketKey[] = ["current", "1-30", "31-60", "61-90", "90+"];
/** Cap drill-down rows per bucket so every non-empty bucket can expand. */
const MAX_AGING_PER_BUCKET = 12;

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

function emptyAgingBuckets(): Record<
  AgingBucketKey,
  { amount: number; count: number; invoices: AgingInvoiceRow[] }
> {
  return {
    current: { amount: 0, count: 0, invoices: [] },
    "1-30": { amount: 0, count: 0, invoices: [] },
    "31-60": { amount: 0, count: 0, invoices: [] },
    "61-90": { amount: 0, count: 0, invoices: [] },
    "90+": { amount: 0, count: 0, invoices: [] },
  };
}

function agingKeyForDaysPastDue(daysPastDue: number): AgingBucketKey {
  if (daysPastDue <= 0) return "current";
  if (daysPastDue <= 30) return "1-30";
  if (daysPastDue <= 60) return "31-60";
  if (daysPastDue <= 90) return "61-90";
  return "90+";
}

async function sumPaymentsInRange(
  companyId: string,
  homeCurrency: string,
  start: Date,
  end: Date,
) {
  const payments = await prisma.invoicePayment.findMany({
    where: {
      paidAt: { gte: start, lte: end },
      invoice: { companyId },
    },
    select: {
      amount: true,
      invoice: { select: { currency: true, exchangeRate: true } },
    },
  });
  return payments.reduce((sum, payment) => {
    const converted = paymentAmountInHomeCurrency({
      amount: payment.amount,
      invoiceCurrency: payment.invoice.currency,
      homeCurrency,
      exchangeRate: payment.invoice.exchangeRate,
    });
    return converted == null ? sum : sum + converted;
  }, 0);
}

async function sumInvoicedInRange(
  companyId: string,
  homeCurrency: string,
  start: Date,
  end: Date,
) {
  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      status: { notIn: ["DRAFT", "CANCELLED"] },
      issueDate: { gte: start, lte: end },
    },
    select: {
      total: true,
      currency: true,
      homeCurrencyTotal: true,
      exchangeRate: true,
    },
  });
  return invoices.reduce((sum, invoice) => {
    const converted = invoiceAmountInHomeCurrency({
      total: invoice.total,
      currency: invoice.currency,
      homeCurrency,
      homeCurrencyTotal: invoice.homeCurrencyTotal,
      exchangeRate: invoice.exchangeRate,
    });
    return converted == null ? sum : sum + converted;
  }, 0);
}

export async function getAnalyticsData(
  companyId: string,
  resolved: ResolvedAnalyticsRange,
): Promise<AnalyticsData> {
  const { start: periodStart, end: periodEnd } = resolved;
  const previous = previousAnalyticsRange(periodStart, periodEnd);
  const today = startOfDay(new Date());

  const [
    company,
    statusGroups,
    estimateGroups,
    openInvoices,
    periodPayments,
    periodInvoices,
    periodExpenses,
    paidInPeriod,
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
        id: true,
        number: true,
        status: true,
        total: true,
        currency: true,
        homeCurrencyTotal: true,
        exchangeRate: true,
        dueDate: true,
        issueDate: true,
        client: { select: { name: true } },
        payments: { select: { amount: true } },
      },
    }),
    prisma.invoicePayment.findMany({
      where: {
        paidAt: { gte: periodStart, lte: periodEnd },
        invoice: { companyId },
      },
      select: {
        amount: true,
        paidAt: true,
        invoice: {
          select: {
            id: true,
            clientId: true,
            currency: true,
            exchangeRate: true,
            client: { select: { name: true } },
          },
        },
      },
    }),
    prisma.invoice.findMany({
      where: {
        companyId,
        status: { notIn: ["DRAFT", "CANCELLED"] },
        issueDate: { gte: periodStart, lte: periodEnd },
      },
      select: {
        total: true,
        issueDate: true,
        currency: true,
        homeCurrencyTotal: true,
        exchangeRate: true,
      },
    }),
    prisma.projectExpense.findMany({
      where: {
        companyId,
        date: { gte: periodStart, lte: periodEnd },
      },
      select: { amount: true, currency: true },
    }),
    prisma.invoice.findMany({
      where: {
        companyId,
        status: "PAID",
        paidAt: { gte: periodStart, lte: periodEnd },
        sentAt: { not: null },
      },
      select: { sentAt: true, paidAt: true },
    }),
    prisma.invoice.count({
      where: {
        companyId,
        sourceEstimateId: { not: null },
        issueDate: { gte: periodStart, lte: periodEnd },
      },
    }),
  ]);

  const [previousCollected, previousInvoiced] = await Promise.all([
    sumPaymentsInRange(companyId, company.currency, previous.start, previous.end),
    sumInvoicedInRange(companyId, company.currency, previous.start, previous.end),
  ]);

  const homeCurrency = company.currency;
  const revenueByMonth = buildRevenueMonthBucketsForRange(periodStart, periodEnd);
  const monthIndex = new Map(revenueByMonth.map((row, index) => [row.month, index]));

  let revenueCollected = 0;
  for (const payment of periodPayments) {
    const amount = paymentAmountInHomeCurrency({
      amount: payment.amount,
      invoiceCurrency: payment.invoice.currency,
      homeCurrency,
      exchangeRate: payment.invoice.exchangeRate,
    });
    if (amount == null) continue;
    revenueCollected += amount;
    const key = format(payment.paidAt, "yyyy-MM");
    const index = monthIndex.get(key);
    if (index !== undefined) {
      revenueByMonth[index]!.collected += amount;
    }
  }

  let invoicedTotal = 0;
  for (const invoice of periodInvoices) {
    const amount = invoiceAmountInHomeCurrency({
      total: invoice.total,
      currency: invoice.currency,
      homeCurrency,
      homeCurrencyTotal: invoice.homeCurrencyTotal,
      exchangeRate: invoice.exchangeRate,
    });
    if (amount == null) continue;
    invoicedTotal += amount;
    const key = format(invoice.issueDate, "yyyy-MM");
    const index = monthIndex.get(key);
    if (index !== undefined) {
      revenueByMonth[index]!.invoiced += amount;
    }
  }

  const matchingExpenses = periodExpenses.filter((row) => row.currency === company.currency);
  const expensesTotal = matchingExpenses.reduce((sum, row) => sum + toNumber(row.amount), 0);
  const collectionRate =
    invoicedTotal > 0 ? Math.round((revenueCollected / invoicedTotal) * 1000) / 10 : null;

  const agingTotals = emptyAgingBuckets();
  let outstandingAr = 0;
  let overdueAr = 0;
  let overdueCount = 0;

  for (const invoice of openInvoices) {
    const balanceDueDoc = buildInvoicePaymentSummary({
      total: invoice.total,
      payments: invoice.payments,
    }).balanceDue;
    if (balanceDueDoc <= 0) continue;

    const balanceDue = paymentAmountInHomeCurrency({
      amount: balanceDueDoc,
      invoiceCurrency: invoice.currency,
      homeCurrency,
      exchangeRate: invoice.exchangeRate,
    });
    if (balanceDue == null) continue;

    outstandingAr += balanceDue;

    const due = invoice.dueDate ?? invoice.issueDate;
    const daysPastDue = Math.max(0, differenceInCalendarDays(today, startOfDay(due)));
    const key = agingKeyForDaysPastDue(daysPastDue);
    agingTotals[key].amount += balanceDue;
    agingTotals[key].count += 1;
    agingTotals[key].invoices.push({
      id: invoice.id,
      number: invoice.number,
      clientName: invoice.client?.name ?? "No client",
      balanceDue,
      daysPastDue,
      dueDate: invoice.dueDate ? format(invoice.dueDate, "yyyy-MM-dd") : null,
      status: invoice.status,
      bucket: key,
    });

    if (daysPastDue > 0) {
      overdueAr += balanceDue;
      overdueCount += 1;
    }
  }

  const agingInvoices: AgingInvoiceRow[] = [];
  for (const key of AGING_ORDER) {
    const bucket = agingTotals[key];
    bucket.invoices.sort(
      (a, b) => b.daysPastDue - a.daysPastDue || b.balanceDue - a.balanceDue,
    );
    agingInvoices.push(...bucket.invoices.slice(0, MAX_AGING_PER_BUCKET));
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

  const closedEstimates =
    acceptedCount + (estimateCountMap.DECLINED ?? 0) + (estimateCountMap.EXPIRED ?? 0);
  const estimateWinRate =
    closedEstimates > 0 ? Math.round((acceptedCount / closedEstimates) * 100) : null;

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
    const revenue = paymentAmountInHomeCurrency({
      amount: payment.amount,
      invoiceCurrency: payment.invoice.currency,
      homeCurrency,
      exchangeRate: payment.invoice.exchangeRate,
    });
    if (revenue == null) continue;
    existing.revenue += revenue;
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

  const daysToPay = paidInPeriod
    .map((invoice) => {
      if (!invoice.sentAt || !invoice.paidAt) return null;
      return Math.max(
        0,
        Math.round((invoice.paidAt.getTime() - invoice.sentAt.getTime()) / (1000 * 60 * 60 * 24)),
      );
    })
    .filter((days): days is number => days != null && Number.isFinite(days));

  const avgDaysToPay =
    daysToPay.length > 0
      ? Math.round(daysToPay.reduce((sum, days) => sum + days, 0) / daysToPay.length)
      : null;

  return {
    currency: company.currency,
    preset: resolved.preset,
    from: resolved.from,
    to: resolved.to,
    periodLabel: resolved.label,
    previousPeriodLabel: previous.label,
    summary: {
      revenueCollected,
      invoicedTotal,
      invoiceCount: periodInvoices.length,
      paymentCount: periodPayments.length,
      collectionRate,
      expensesTotal,
      expenseCount: matchingExpenses.length,
      netCollected: revenueCollected - expensesTotal,
      outstandingAr,
      overdueAr,
      overdueCount,
      avgDaysToPay,
      estimateWinRate,
      convertedEstimates,
      revenueDelta: buildPeriodDelta(revenueCollected, previousCollected),
      invoicedDelta: buildPeriodDelta(invoicedTotal, previousInvoiced),
    },
    revenueByMonth,
    aging,
    agingInvoices,
    invoicePipeline,
    totalInvoices,
    estimatePipeline,
    totalEstimates,
    topClients,
  };
}
