export type AnalyticsPeriod = "3m" | "6m" | "12m" | "ytd" | "all";

export type AnalyticsSummary = {
  revenueCollected: number;
  invoicedTotal: number;
  invoiceCount: number;
  paymentCount: number;
  outstandingAr: number;
  overdueAr: number;
  overdueCount: number;
  avgDaysToPay: number | null;
  estimateWinRate: number | null;
  convertedEstimates: number;
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

export type AnalyticsData = {
  currency: string;
  period: AnalyticsPeriod;
  periodLabel: string;
  summary: AnalyticsSummary;
  revenueByMonth: { month: string; label: string; amount: number }[];
  aging: AgingBucket[];
  invoicePipeline: PipelineSegment[];
  totalInvoices: number;
  estimatePipeline: PipelineSegment[];
  totalEstimates: number;
  topClients: ClientRevenueRow[];
};
