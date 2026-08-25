"use client";

import { useEffect, useState } from "react";
import { ExternalLinkIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { openBillingPortal } from "@/features/settings/lib/open-billing-portal";
import { billingButtonClassName } from "@/features/settings/lib/billing-ui";
import type { BillingInvoiceSummary } from "@/lib/stripe-billing";
import { cn } from "@/lib/utils";

function formatMoney(amountCents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function formatDate(unixSeconds: number) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(unixSeconds * 1000));
}

type BillingInvoicesCardProps = {
  hasCustomer: boolean;
};

export function BillingInvoicesCard({ hasCustomer }: BillingInvoicesCardProps) {
  const [invoices, setInvoices] = useState<BillingInvoiceSummary[]>([]);
  const [loading, setLoading] = useState(hasCustomer);
  const [error, setError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!hasCustomer) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/stripe/billing/invoices");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Could not load invoices");
        }
        if (!cancelled) {
          setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load invoices");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasCustomer]);

  async function openPortal() {
    setPortalLoading(true);
    try {
      await openBillingPortal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open billing portal");
      setPortalLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">Recent invoices</CardTitle>
          <p className="text-sm text-muted-foreground">
            Invoice Desk subscription charges from Stripe.
          </p>
        </div>
        {hasCustomer ? (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "shrink-0 cursor-pointer text-muted-foreground hover:text-foreground",
              billingButtonClassName,
            )}
            disabled={portalLoading}
            onClick={() => void openPortal()}
          >
            {portalLoading ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
            Billing portal
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {!hasCustomer ? (
          <p className="text-sm text-muted-foreground">
            Invoices appear here after you upgrade to Pro.
          </p>
        ) : loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Loading…
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {invoices.map((invoice) => {
              const href = invoice.hostedInvoiceUrl ?? invoice.invoicePdf;
              return (
                <li key={invoice.id}>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted/40"
                    >
                      <InvoiceRow invoice={invoice} />
                      <ExternalLinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    </a>
                  ) : (
                    <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                      <InvoiceRow invoice={invoice} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function InvoiceRow({ invoice }: { invoice: BillingInvoiceSummary }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate font-medium text-foreground">
        {invoice.number ?? invoice.id}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {formatDate(invoice.created)}
        <span className="mx-1">·</span>
        <span className={cn(invoice.status === "paid" && "text-foreground")}>
          {invoice.status ?? "unknown"}
        </span>
        <span className="mx-1">·</span>
        {formatMoney(invoice.amountPaid, invoice.currency)}
      </p>
    </div>
  );
}
