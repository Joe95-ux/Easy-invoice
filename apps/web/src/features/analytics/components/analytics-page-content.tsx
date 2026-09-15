"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { InfoIcon, TrendingUpIcon } from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { AnalyticsData, PeriodDelta } from "@/features/analytics/types";
import { AgingSection } from "@/features/analytics/components/analytics-aging-section";
import { AnalyticsDateRangePicker } from "@/features/analytics/components/analytics-date-range-picker";
import { AnalyticsExportMenu } from "@/features/analytics/components/analytics-export-menu";
import { TopClientsTable } from "@/features/analytics/components/top-clients-table";
import { formatDeltaHint } from "@/features/analytics/lib/format-delta";
import { formatMoney } from "@/lib/invoices";
import { cn } from "@/lib/utils";

export const ANALYTICS_INFO =
  "Collected, invoiced, expenses, and avg. days to pay follow the selected range (vs the prior period of the same length). Outstanding aging and pipelines are always current.";

const revenueChartConfig = {
  collected: {
    label: "Collected",
    color: "var(--chart-1)",
  },
  invoiced: {
    label: "Invoiced",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function AnalyticsInfoPopover() {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="About analytics"
          />
        }
      >
        <InfoIcon className="size-4" />
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" sideOffset={6} className="w-80 gap-0">
        <p className="text-sm text-muted-foreground">{ANALYTICS_INFO}</p>
      </PopoverContent>
    </Popover>
  );
}

type AnalyticsPageContentProps = {
  data: AnalyticsData;
};

export function AnalyticsPageContent({ data }: AnalyticsPageContentProps) {
  const { currency, summary } = data;
  const chartHasData = data.revenueByMonth.some(
    (row) => row.collected > 0 || row.invoiced > 0,
  );

  return (
    <>
      <PageHeader
        title="Analytics"
        titleAddon={
          <span className="hidden sm:inline-flex">
            <AnalyticsInfoPopover />
          </span>
        }
        description={<span className="sm:hidden">{ANALYTICS_INFO}</span>}
        actions={
          <div className="flex items-center justify-end gap-1 sm:gap-2">
            <AnalyticsExportMenu data={data} />
            <AnalyticsDateRangePicker
              preset={data.preset}
              from={data.from}
              to={data.to}
              label={data.periodLabel}
            />
          </div>
        }
      />

      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Collected"
            value={formatMoney(summary.revenueCollected, currency)}
            hint={
              summary.paymentCount > 0
                ? `${summary.paymentCount} payment${summary.paymentCount === 1 ? "" : "s"}`
                : "No payments in range"
            }
            delta={summary.revenueDelta}
            deltaLabel={formatDeltaHint(
              summary.revenueDelta.change,
              summary.revenueDelta.changePct,
              currency,
            )}
          />
          <SummaryCard
            label="Invoiced"
            value={formatMoney(summary.invoicedTotal, currency)}
            hint={
              summary.invoiceCount > 0
                ? `${summary.invoiceCount} invoice${summary.invoiceCount === 1 ? "" : "s"} issued`
                : "No invoices in range"
            }
            delta={summary.invoicedDelta}
            deltaLabel={formatDeltaHint(
              summary.invoicedDelta.change,
              summary.invoicedDelta.changePct,
              currency,
            )}
          />
          <SummaryCard
            label="Collection rate"
            value={summary.collectionRate !== null ? `${summary.collectionRate}%` : "—"}
            hint={
              summary.collectionRate !== null
                ? "Collected ÷ invoiced in range"
                : "No invoices in range"
            }
          />
          <SummaryCard
            label="Outstanding"
            value={formatMoney(summary.outstandingAr, currency)}
            hint={
              summary.overdueCount > 0
                ? `${formatMoney(summary.overdueAr, currency)} past due`
                : "Awaiting payment"
            }
            tone={summary.overdueCount > 0 ? "warning" : "neutral"}
          />
        </section>

        <section className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <MetricChip
            label="Net"
            value={formatMoney(summary.netCollected, currency)}
            hint="Collected − project expenses (company currency)"
          />
          <MetricChip
            label="Expenses"
            value={formatMoney(summary.expensesTotal, currency)}
            hint={
              summary.expenseCount > 0
                ? `${summary.expenseCount} in ${currency}`
                : `No ${currency} expenses in range`
            }
          />
          <MetricChip
            label="Avg. days to pay"
            value={summary.avgDaysToPay !== null ? `${summary.avgDaysToPay}d` : "—"}
            hint="Invoices paid in this range"
          />
          <MetricChip
            label="Estimate win rate"
            value={
              summary.estimateWinRate !== null ? `${summary.estimateWinRate}%` : "—"
            }
            hint="All-time closed estimates"
          />
          {summary.convertedEstimates > 0 && (
            <MetricChip
              label="Converted"
              value={`${summary.convertedEstimates} estimate${summary.convertedEstimates === 1 ? "" : "s"}`}
              hint="Issued from estimates in this range"
            />
          )}
        </section>

        <section className="rounded-lg border border-border p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <TrendingUpIcon className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">Collected vs invoiced</h2>
            <span className="text-xs text-muted-foreground">{data.periodLabel}</span>
          </div>
          {chartHasData ? (
            <ChartContainer config={revenueChartConfig} className="aspect-auto h-[240px] w-full">
              <BarChart
                data={data.revenueByMonth}
                margin={{ top: 8, right: 4, left: 4, bottom: 0 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatMoney(Number(value), currency)}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="collected"
                  fill="var(--color-collected)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="invoiced"
                  fill="var(--color-invoiced)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No collected or invoiced amounts in this range
            </p>
          )}
        </section>

        <AgingSection
          aging={data.aging}
          invoices={data.agingInvoices}
          currency={currency}
        />

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border p-4 sm:p-5">
            <h2 className="text-sm font-medium">Invoice pipeline</h2>
            <p className="mt-1 text-xs text-muted-foreground">Current status breakdown</p>
            {data.totalInvoices === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No invoices yet</p>
            ) : (
              <div className="mt-4 space-y-1">
                {data.invoicePipeline.map((row) => (
                  <PipelineRow
                    key={row.label}
                    label={row.label}
                    value={row.value}
                    total={data.totalInvoices}
                    tone={row.tone}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-medium">Estimates</h2>
                <p className="mt-1 text-xs text-muted-foreground">Current status breakdown</p>
              </div>
              {summary.estimateWinRate !== null && (
                <Badge variant="secondary">{summary.estimateWinRate}% win rate</Badge>
              )}
            </div>
            {data.totalEstimates === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No estimates yet</p>
            ) : (
              <div className="mt-4 space-y-1">
                {data.estimatePipeline.map((row) => (
                  <PipelineRow
                    key={row.label}
                    label={row.label}
                    value={row.value}
                    total={data.totalEstimates}
                    tone={row.tone}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-border p-4 sm:p-5">
          <h2 className="text-sm font-medium">Top clients by revenue</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Payments received · {data.periodLabel}
          </p>
          <div className="mt-4">
            <TopClientsTable clients={data.topClients} currency={currency} />
          </div>
        </section>
      </div>
    </>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  tone = "neutral",
  delta,
  deltaLabel,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "warning" | "destructive";
  delta?: PeriodDelta;
  deltaLabel?: string;
}) {
  const hintClass =
    tone === "destructive"
      ? "text-destructive"
      : tone === "warning"
        ? "text-warning-foreground dark:text-warning"
        : "text-muted-foreground";

  const deltaTone =
    delta && delta.change > 0
      ? "text-success"
      : delta && delta.change < 0
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-heading text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className={cn("mt-1 text-xs", hintClass)}>{hint}</p>
      {deltaLabel ? <p className={cn("mt-0.5 text-xs", deltaTone)}>{deltaLabel}</p> : null}
    </div>
  );
}

function MetricChip({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <span className="inline-flex items-baseline gap-1.5" title={hint}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums text-foreground">{value}</span>
    </span>
  );
}

function PipelineRow({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "muted" | "warning" | "success";
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const barTone = {
    muted: "bg-muted-foreground/40",
    warning: "bg-warning",
    success: "bg-success",
  }[tone];

  return (
    <div className="py-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{value}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${barTone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
