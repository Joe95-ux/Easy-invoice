"use client";

import { Separator } from "@/components/ui/separator";
import type { InvoiceTotals } from "@/lib/calculator";
import { formatTaxPercent } from "@/lib/tax-rates";

type InvoiceTotalsSummaryProps = {
  currency: string;
  totals: InvoiceTotals;
  discount?: number;
  taxInclusive?: boolean;
};

export function InvoiceTotalsSummary({
  currency,
  totals,
  discount = 0,
  taxInclusive = false,
}: InvoiceTotalsSummaryProps) {
  const breakdown = totals.taxBreakdown ?? [];
  const showBreakdown = breakdown.length > 1;

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
        {discount > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discount</span>
            <span>
              -{currency} {discount.toFixed(2)}
            </span>
          </div>
        )}
        {showBreakdown ? (
          breakdown.map((line) => (
            <div key={`${line.name}-${line.rate}`} className="flex justify-between">
              <span className="text-muted-foreground">
                {line.name} ({formatTaxPercent(line.rate)}%)
              </span>
              <span>
                {currency} {line.amount.toFixed(2)}
              </span>
            </div>
          ))
        ) : (
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {taxInclusive ? "Tax (included)" : "Tax"}
            </span>
            <span>
              {currency} {totals.taxAmount.toFixed(2)}
            </span>
          </div>
        )}
        {taxInclusive && showBreakdown ? (
          <p className="text-xs text-muted-foreground">Line prices include tax</p>
        ) : null}
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
