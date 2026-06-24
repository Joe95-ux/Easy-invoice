"use client";

import { Separator } from "@/components/ui/separator";
import type { InvoiceTotals } from "@/lib/calculator";

type InvoiceTotalsSummaryProps = {
  currency: string;
  totals: InvoiceTotals;
};

export function InvoiceTotalsSummary({ currency, totals }: InvoiceTotalsSummaryProps) {
  return (
    <>
      <Separator />
      <div className="ml-auto max-w-xs space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>
            {currency} {totals.subtotal.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax</span>
          <span>
            {currency} {totals.taxAmount.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between border-t pt-2 font-semibold">
          <span>Total</span>
          <span>
            {currency} {totals.total.toFixed(2)}
          </span>
        </div>
      </div>
    </>
  );
}
