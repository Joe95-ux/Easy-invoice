export type AnalyticsPreset = "7d" | "30d" | "90d" | "1y" | "custom";

export type PeriodDelta = {
  current: number;
  previous: number;
  /** Absolute change (current − previous). */
  change: number;
  /** Percent change vs previous; null when previous is 0. */
  changePct: number | null;
};

export type AnalyticsSummary = {
  revenueCollected: number;
  invoicedTotal: number;
  invoiceCount: number;
  paymentCount: number;
  collectionRate: number | null;
  expensesTotal: number;
  expenseCount: number;
  netCollected: number;
  outstandingAr: number;
  overdueAr: number;
  overdueCount: number;
  avgDaysToPay: number | null;
  estimateWinRate: number | null;
  convertedEstimates: number;
  revenueDelta: PeriodDelta;
  invoicedDelta: PeriodDelta;
};

export type PipelineSegment = {
  label: string;
  value: number;
  tone: "muted" | "warning" | "success";
};

export type ClientRevenueRow = {
  id: string;
  name: string;
  revenue: number;
  invoiceCount: number;
};

export type AgingBucketKey = "current" | "1-30" | "31-60" | "61-90" | "90+";

export type AgingBucket = {
  key: AgingBucketKey;
  label: string;
  amount: number;
  count: number;
  tone: "muted" | "warning" | "destructive";
};

export type AgingInvoiceRow = {
  id: string;
  number: string;
  clientName: string;
  balanceDue: number;
  daysPastDue: number;
  dueDate: string | null;
  status: string;
  bucket: AgingBucketKey;
};

export type RevenueMonthRow = {
  month: string;
  label: string;
  collected: number;
  invoiced: number;
};

export type AnalyticsData = {
  currency: string;
  preset: AnalyticsPreset;
  /** ISO date yyyy-MM-dd */
  from: string;
  /** ISO date yyyy-MM-dd */
  to: string;
  periodLabel: string;
  previousPeriodLabel: string;
  summary: AnalyticsSummary;
  revenueByMonth: RevenueMonthRow[];
  aging: AgingBucket[];
  agingInvoices: AgingInvoiceRow[];
  invoicePipeline: PipelineSegment[];
  totalInvoices: number;
  estimatePipeline: PipelineSegment[];
  totalEstimates: number;
  topClients: ClientRevenueRow[];
};
