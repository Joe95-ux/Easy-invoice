"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDownIcon } from "lucide-react";
import type { AgingBucket, AgingInvoiceRow } from "@/features/analytics/types";
import { formatMoney } from "@/lib/invoices";
import { cn } from "@/lib/utils";

type AgingSectionProps = {
  aging: AgingBucket[];
  invoices: AgingInvoiceRow[];
  currency: string;
};

export function AgingSection({ aging, invoices, currency }: AgingSectionProps) {
  const [openBucket, setOpenBucket] = useState<string | null>(null);
  const agingTotal = aging.reduce((sum, row) => sum + row.amount, 0);

  const byBucket = useMemo(() => {
    const map = new Map<string, AgingInvoiceRow[]>();
    for (const invoice of invoices) {
      const list = map.get(invoice.bucket) ?? [];
      list.push(invoice);
      map.set(invoice.bucket, list);
    }
    return map;
  }, [invoices]);

  if (agingTotal === 0) {
    return (
      <section className="rounded-lg border border-border p-4 sm:p-5">
        <h2 className="text-sm font-medium">Outstanding aging</h2>
        <p className="mt-1 text-xs text-muted-foreground">Open balances by days past due</p>
        <p className="py-8 text-center text-sm text-muted-foreground">No outstanding balances</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium">Outstanding aging</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Open balances by days past due — expand a bucket to review invoices
          </p>
        </div>
        <p className="text-sm font-semibold tabular-nums">{formatMoney(agingTotal, currency)}</p>
      </div>

      <div className="mt-4 space-y-1">
        {aging.map((row) => {
          const pct = Math.round((row.amount / agingTotal) * 100);
          const barTone = {
            muted: "bg-muted-foreground/40",
            warning: "bg-warning",
            destructive: "bg-destructive",
          }[row.tone];
          const expanded = openBucket === row.key;
          const bucketInvoices = byBucket.get(row.key) ?? [];
          const canExpand = row.count > 0;
          const truncated = row.count > bucketInvoices.length;

          return (
            <div key={row.key} className="rounded-md">
              <button
                type="button"
                disabled={!canExpand}
                aria-expanded={canExpand ? expanded : undefined}
                onClick={() =>
                  setOpenBucket((current) => (current === row.key ? null : row.key))
                }
                className={cn(
                  "flex w-full flex-col gap-1.5 py-2 text-left",
                  canExpand && "cursor-pointer rounded-md px-1 hover:bg-muted/40",
                  !canExpand && "cursor-default px-1 opacity-70",
                )}
              >
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-muted-foreground">{row.label}</span>
                    {row.count > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {row.count} invoice{row.count === 1 ? "" : "s"}
                      </span>
                    )}
                    {canExpand && (
                      <ChevronDownIcon
                        className={cn(
                          "size-3.5 text-muted-foreground transition-transform",
                          expanded && "rotate-180",
                        )}
                      />
                    )}
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatMoney(row.amount, currency)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${barTone}`} style={{ width: `${pct}%` }} />
                </div>
              </button>

              {expanded && (
                <div className="mb-2 ml-1 space-y-1 border-l border-border pl-3">
                  {bucketInvoices.map((invoice) => (
                    <Link
                      key={invoice.id}
                      href={`/invoices/${invoice.id}`}
                      className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {invoice.number}
                          <span className="ml-2 font-normal text-muted-foreground">
                            {invoice.clientName}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {invoice.daysPastDue === 0
                            ? "Not due yet"
                            : `${invoice.daysPastDue} day${invoice.daysPastDue === 1 ? "" : "s"} past due`}
                        </p>
                      </div>
                      <span className="shrink-0 tabular-nums">
                        {formatMoney(invoice.balanceDue, currency)}
                      </span>
                    </Link>
                  ))}
                  {truncated && (
                    <p className="px-2 py-1.5 text-xs text-muted-foreground">
                      Showing {bucketInvoices.length} of {row.count}. Open Invoices for the rest.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
