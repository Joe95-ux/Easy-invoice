"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { ProFeatureGate } from "@/components/billing/pro-feature-gate";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatDateTime } from "@/lib/invoices";
import type { QrScanHistory } from "@/lib/qr-codes/scans";

const chartConfig = {
  count: {
    label: "Scans",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

type QrScanHistoryCardProps = {
  isPro: boolean;
  history: QrScanHistory | null;
};

export function QrScanHistoryCard({ isPro, history }: QrScanHistoryCardProps) {
  if (!isPro) {
    return (
      <div id="scans" className="mt-8">
        <ProFeatureGate
          title="See how this code is used"
          description="Pro unlocks a 30-day scan chart and a list of recent scans — useful for posters, events, and invoice QR codes."
        />
      </div>
    );
  }

  if (!history) return null;

  const hasChartData = history.days.some((day) => day.count > 0);
  const periodTotal = history.days.reduce((sum, day) => sum + day.count, 0);

  return (
    <section id="scans" className="mt-8 space-y-4 rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold tracking-tight">Scan history</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Last 30 days</p>
        </div>
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">All time</p>
            <p className="tabular-nums font-semibold">{history.total}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">This period</p>
            <p className="tabular-nums font-semibold">{periodTotal}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last scan</p>
            <p className="font-medium">{formatDateTime(history.lastScannedAt)}</p>
          </div>
        </div>
      </div>

      {hasChartData ? (
        <ChartContainer config={chartConfig} className="aspect-auto h-40 w-full">
          <BarChart data={history.days} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={28}
              tickFormatter={(value: string) =>
                new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                })
              }
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    typeof value === "string"
                      ? new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          timeZone: "UTC",
                        })
                      : String(value)
                  }
                />
              }
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={4} />
          </BarChart>
        </ChartContainer>
      ) : (
        <p className="rounded-lg bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
          No scans in the last 30 days.
        </p>
      )}

      {history.recent.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium">Recent scans</h3>
          <ul className="mt-2 divide-y">
            {history.recent.map((scan) => (
              <li key={scan.id} className="py-2 text-sm tabular-nums">
                {formatDateTime(scan.scannedAt)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
