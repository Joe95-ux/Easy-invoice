export type AnalyticsSummary = {
  revenueCollected: number;
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

export type AnalyticsData = {
  currency: string;
  periodLabel: string;
  summary: AnalyticsSummary;
  revenueByMonth: { month: string; label: string; amount: number }[];
  invoicePipeline: PipelineSegment[];
  totalInvoices: number;
  estimatePipeline: PipelineSegment[];
  totalEstimates: number;
  topClients: ClientRevenueRow[];
};
