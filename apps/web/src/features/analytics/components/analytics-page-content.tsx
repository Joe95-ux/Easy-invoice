"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  InfoIcon,
  ScrollTextIcon,
  SettingsIcon,
  TrendingUpIcon,
} from "lucide-react";
import { PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { AnalyticsData } from "@/features/analytics/types";
import { TopClientsTable } from "@/features/analytics/components/top-clients-table";
import { formatMoney } from "@/lib/invoices";

export const ANALYTICS_INFO =
  "Revenue collected, outstanding balances, invoice pipeline, estimate outcomes, and top clients — based on payments and invoice statuses for your company.";

const revenueChartConfig = {
  amount: {
    label: "Revenue",
    color: "var(--chart-1)",
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
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              variant="outline"
              className={pageHeaderActionClass}
              render={<Link href="/settings/activity" />}
            >
              <ScrollTextIcon className="size-4" />
              Activity log
            </Button>
            <Button
              variant="outline"
              className={pageHeaderActionClass}
              render={<Link href="/settings" />}
            >
              <SettingsIcon className="size-4" />
              Settings
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Revenue collected"
            value={formatMoney(summary.revenueCollected, currency)}
            hint={data.periodLabel}
          />
          <SummaryCard
            label="Outstanding"
            value={formatMoney(summary.outstandingAr, currency)}
            hint="Awaiting payment"
            tone="warning"
          />
          <SummaryCard
            label="Overdue"
            value={formatMoney(summary.overdueAr, currency)}
            hint={
              summary.overdueCount > 0
                ? `${summary.overdueCount} invoice${summary.overdueCount === 1 ? "" : "s"}`
                : "None overdue"
            }
            tone={summary.overdueCount > 0 ? "destructive" : "neutral"}
          />
          <SummaryCard
            label="Avg. days to pay"
            value={summary.avgDaysToPay !== null ? `${summary.avgDaysToPay} days` : "—"}
            hint={
              summary.estimateWinRate !== null
                ? `${summary.estimateWinRate}% estimate win rate`
                : "No closed estimates yet"
            }
          />
        </section>

        <section className="rounded-lg border border-border p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUpIcon className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">Revenue collected</h2>
            <span className="text-xs text-muted-foreground">{data.periodLabel}</span>
          </div>
          <ChartContainer config={revenueChartConfig} className="aspect-auto h-[220px] w-full">
            <BarChart data={data.revenueByMonth} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatMoney(Number(value), currency)}
                  />
                }
              />
              <Bar dataKey="amount" fill="var(--color-amount)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border p-4 sm:p-5">
            <h2 className="text-sm font-medium">Invoice pipeline</h2>
            <p className="mt-1 text-xs text-muted-foreground">Invoice status breakdown</p>
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
                <p className="mt-1 text-xs text-muted-foreground">Estimate status breakdown</p>
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
            {summary.convertedEstimates > 0 && (
              <p className="mt-4 text-xs text-muted-foreground">
                {summary.convertedEstimates} estimate
                {summary.convertedEstimates === 1 ? "" : "s"} converted to invoice
              </p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-border p-4 sm:p-5">
          <h2 className="text-sm font-medium">Top clients by revenue</h2>
          <p className="mt-1 text-xs text-muted-foreground">All-time payments received</p>
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
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "warning" | "destructive";
}) {
  const hintClass =
    tone === "destructive"
      ? "text-destructive"
      : tone === "warning"
        ? "text-warning-foreground dark:text-warning"
        : "text-muted-foreground";

  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-heading text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className={`mt-1 text-xs ${hintClass}`}>{hint}</p>
    </div>
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
