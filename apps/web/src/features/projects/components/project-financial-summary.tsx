import type { ReactNode } from "react";
import Link from "next/link";
import {
  ChartColumnIcon,
  FileTextIcon,
  ReceiptIcon,
  TargetIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/invoices";
import { formatDuration } from "@/lib/time-tracking/format";
import { invoiceFromTimeUrl } from "@/lib/time-tracking/invoice-from-time";
import { invoiceFromExpensesUrl } from "@/lib/project-expenses/invoice-from-expenses";
import { cn } from "@/lib/utils";

type ProjectFinancialSummaryProps = {
  currency: string;
  revenue: number;
  costs: number;
  profit: number;
  marginPercent: number | null;
  invoiced: number;
  remaining: number;
  budget: number | null;
  unbilledMinutes: number;
  unbilledAmount: number;
  unbilledTimeIds: string[];
  expensesBillableUninvoiced: number;
  unbilledExpenseIds: string[];
  clientId: string | null;
  projectId: string;
};

type MetricTone = "revenue" | "costs" | "profit" | "loss";

function MetricCard({
  label,
  value,
  meta,
  icon,
  tone,
  valueClassName,
}: {
  label: string;
  value: string;
  meta: string;
  icon: ReactNode;
  tone: MetricTone;
  valueClassName?: string;
}) {
  return (
    <div
      className={cn(
        "group flex min-w-0 items-center gap-3 rounded-xl border border-border/80 p-3.5 transition-colors",
        "bg-gradient-to-br from-background/80 to-muted/30",
        "hover:border-border hover:from-background hover:to-muted/50",
      )}
    >
      <div
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl",
          tone === "revenue" && "bg-primary/12 text-primary",
          tone === "costs" && "bg-warning/15 text-warning-foreground dark:text-warning",
          tone === "profit" && "bg-success/12 text-success",
          tone === "loss" && "bg-destructive/10 text-destructive",
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <span className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
          {label}
        </span>
        <strong
          className={cn(
            "mt-1 block font-heading text-xl leading-none font-semibold tracking-tight tabular-nums",
            valueClassName,
          )}
        >
          {value}
        </strong>
        <span className="mt-1.5 block text-xs text-muted-foreground">{meta}</span>
      </div>
    </div>
  );
}

export function ProjectFinancialSummary({
  currency,
  revenue,
  costs,
  profit,
  marginPercent,
  invoiced,
  remaining,
  budget,
  unbilledMinutes,
  unbilledAmount,
  unbilledTimeIds,
  expensesBillableUninvoiced,
  unbilledExpenseIds,
  clientId,
  projectId,
}: ProjectFinancialSummaryProps) {
  const canInvoiceUnbilled = Boolean(clientId) && unbilledTimeIds.length > 0;
  const hasBillableExpenses = Boolean(clientId) && unbilledExpenseIds.length > 0;
  const budgetUsedPercent =
    budget != null && budget > 0
      ? Math.round((costs / budget) * 1000) / 10
      : null;
  const progressWidth =
    budgetUsedPercent == null ? 0 : Math.min(Math.max(budgetUsedPercent, 0), 100);
  const overBudget = budgetUsedPercent != null && budgetUsedPercent > 100;
  const marginHint =
    marginPercent == null
      ? revenue <= 0
        ? "Margin after payments land"
        : "—"
      : `${marginPercent}% margin`;

  return (
    <div className="mb-6 space-y-4">
      <div className="grid gap-3 lg:grid-cols-3">
        <MetricCard
          label="Revenue"
          value={formatMoney(revenue, currency)}
          meta="Paid to date"
          tone="revenue"
          icon={<ChartColumnIcon className="size-5" strokeWidth={1.75} />}
        />
        <MetricCard
          label="Costs"
          value={formatMoney(costs, currency)}
          meta="Project expenses"
          tone="costs"
          icon={<WalletIcon className="size-5" strokeWidth={1.75} />}
        />
        <MetricCard
          label="Profit"
          value={formatMoney(profit, currency)}
          meta={marginHint}
          tone={profit < 0 ? "loss" : "profit"}
          valueClassName={
            profit < 0 ? "text-destructive" : profit > 0 ? "text-success" : undefined
          }
          icon={<TrendingUpIcon className="size-5" strokeWidth={1.75} />}
        />
      </div>

      <div
        className={cn(
          "grid items-center gap-4 rounded-xl border border-border/80 bg-muted/20 px-3.5 py-3 sm:gap-6 sm:px-4",
          "lg:grid-cols-[auto_minmax(10rem,1fr)_auto]",
        )}
      >
        <div className="flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-background text-muted-foreground ring-1 ring-border/60">
            <TargetIcon className="size-4" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <span className="block text-xs text-muted-foreground">Budget</span>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
              <strong className="font-heading text-lg font-semibold tracking-tight tabular-nums">
                {budget == null ? "—" : formatMoney(budget, currency)}
              </strong>
              {budgetUsedPercent != null ? (
                <span
                  className={cn(
                    "text-sm tabular-nums text-muted-foreground",
                    overBudget && "text-destructive",
                  )}
                >
                  · {budgetUsedPercent}% spent
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-300",
                overBudget
                  ? "bg-destructive"
                  : "bg-[linear-gradient(90deg,var(--primary),color-mix(in_oklch,var(--success)_70%,var(--primary)))]",
              )}
              style={{ width: `${progressWidth}%` }}
            />
          </div>
          {budget == null ? (
            <p className="mt-1.5 text-xs text-muted-foreground">No budget set for this project</p>
          ) : null}
        </div>

        <div className="flex items-stretch gap-4 sm:gap-5">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-none sm:min-w-[5.5rem]">
            <span className="text-xs text-muted-foreground">Invoiced</span>
            <strong className="text-base font-semibold tracking-tight tabular-nums sm:text-lg">
              {formatMoney(invoiced, currency)}
            </strong>
          </div>
          <div className="w-px self-stretch bg-border/80" aria-hidden />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-none sm:min-w-[5.5rem]">
            <span className="text-xs text-muted-foreground">Remaining</span>
            <strong className="text-base font-semibold tracking-tight tabular-nums sm:text-lg">
              {formatMoney(remaining, currency)}
            </strong>
          </div>
        </div>
      </div>

      {canInvoiceUnbilled || hasBillableExpenses ? (
        <div className="space-y-3">
          {canInvoiceUnbilled ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0">
                <p className="font-medium">
                  {formatDuration(unbilledMinutes)} unbilled ·{" "}
                  {formatMoney(unbilledAmount, currency)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Billable time on this project that is not on an invoice yet.
                </p>
              </div>
              <Button
                className="h-8 min-h-8 shrink-0"
                render={
                  <Link
                    href={invoiceFromTimeUrl({
                      clientId: clientId!,
                      timeEntryIds: unbilledTimeIds,
                      projectId,
                    })}
                  />
                }
              >
                <FileTextIcon className="size-4" />
                Invoice unbilled time
              </Button>
            </div>
          ) : null}

          {hasBillableExpenses ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0">
                <p className="font-medium">
                  {formatMoney(expensesBillableUninvoiced, currency)} billable expenses
                </p>
                <p className="text-sm text-muted-foreground">
                  Pass-through costs ready to add on the next client invoice.
                </p>
              </div>
              <Button
                className="h-8 min-h-8 shrink-0"
                render={
                  <Link
                    href={invoiceFromExpensesUrl({
                      clientId: clientId!,
                      expenseIds: unbilledExpenseIds,
                      projectId,
                    })}
                  />
                }
              >
                <ReceiptIcon className="size-4" />
                Invoice expenses
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
