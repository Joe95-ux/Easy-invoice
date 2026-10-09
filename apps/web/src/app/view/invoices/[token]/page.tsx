import Link from "next/link";
import { notFound } from "next/navigation";
import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvoicePayButton } from "@/features/public/components/invoice-pay-button";
import { PublicDocumentFrame } from "@/features/public/components/public-document-frame";
import { renderInvoiceHtmlForInvoice } from "@/lib/invoice-html";
import { buildInvoicePaymentSummary } from "@/lib/invoice-payments";
import { MIN_PLAN_BALANCE } from "@/lib/collections/advice";
import { formatDate, formatMoney } from "@/lib/invoices";
import { getInvoiceByPublicToken, markInvoiceViewed } from "@/lib/public-documents";
import { getPortalSession } from "@/lib/portal/session";

type PageProps = { params: Promise<{ token: string }> };

export default async function PublicInvoicePage({ params }: PageProps) {
  const { token } = await params;
  const [invoice, portalSession] = await Promise.all([
    getInvoiceByPublicToken(token),
    getPortalSession(),
  ]);
  if (!invoice) notFound();

  if (!invoice.viewedAt) {
    await markInvoiceViewed(invoice.id, invoice.status);
  }

  const html = await renderInvoiceHtmlForInvoice(invoice, {
    inlineLogo: false,
    ensureTemplates: false,
  });

  const summary = buildInvoicePaymentSummary(invoice);
  const canPayOnline =
    Boolean(invoice.company.stripeConnectedAccountId) &&
    invoice.company.stripeConnectChargesEnabled &&
    invoice.company.stripeConnectDetailsSubmitted &&
    !["DRAFT", "CANCELLED", "PAID"].includes(invoice.status) &&
    summary.balanceDue > 0.001;

  // Self-serve split only when the company turned on the policy.
  const canOfferPlan =
    canPayOnline &&
    invoice.company.clientPaymentPlansEnabled &&
    summary.amountPaid <= 0.001 &&
    summary.installments.length === 0 &&
    summary.balanceDue >= MIN_PLAN_BALANCE;

  const alreadyPaid = invoice.status === "PAID" || summary.balanceDue <= 0.001;
  const isOverdue = invoice.status === "OVERDUE";
  const dueLabel = invoice.dueDate ? formatDate(invoice.dueDate) : null;

  const stickyPay = canPayOnline && !alreadyPaid;

  return (
    <div className={stickyPay ? "space-y-6 max-sm:pb-28" : "space-y-6"}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Invoice</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{invoice.number}</h1>
          <p className="text-sm text-muted-foreground">
            From {invoice.company.name}
            {invoice.issueDate && ` · Issued ${formatDate(invoice.issueDate)}`}
          </p>
          {dueLabel && !alreadyPaid ? (
            <p
              className={
                isOverdue
                  ? "text-sm font-medium text-destructive"
                  : "text-sm font-medium text-foreground"
              }
            >
              {isOverdue ? `Overdue · was due ${dueLabel}` : `Due ${dueLabel}`}
            </p>
          ) : null}
          <p className="text-lg font-semibold tabular-nums">
            {alreadyPaid
              ? formatMoney(invoice.total, invoice.currency)
              : formatMoney(
                  summary.installments.length > 0 &&
                    summary.nextDueAmount != null &&
                    summary.nextDueAmount < summary.balanceDue - 0.001
                    ? summary.nextDueAmount
                    : summary.balanceDue > 0.001
                      ? summary.balanceDue
                      : invoice.total,
                  invoice.currency,
                )}
            {invoice.status !== "PAID" && summary.balanceDue > 0.001 ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {summary.installments.length > 0 &&
                summary.nextDueAmount != null &&
                summary.nextDueAmount < summary.balanceDue - 0.001
                  ? `due now · ${formatMoney(summary.balanceDue, invoice.currency)} remaining`
                  : summary.amountPaid > 0
                    ? `remaining of ${formatMoney(invoice.total, invoice.currency)}`
                    : `due`}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
          <div
            className={
              stickyPay
                ? "max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-20 max-sm:border-t max-sm:border-border max-sm:bg-background/95 max-sm:px-4 max-sm:py-3 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-sm:backdrop-blur-sm"
                : undefined
            }
          >
            <InvoicePayButton
              token={token}
              balanceDue={summary.balanceDue}
              currency={invoice.currency}
              canPayOnline={canPayOnline}
              alreadyPaid={alreadyPaid}
              nextDueAmount={summary.nextDueAmount}
              canOfferPlan={canOfferPlan}
              returnToPortal={Boolean(portalSession)}
            />
          </div>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            render={<Link href={`/api/public/invoices/${token}/pdf`} target="_blank" />}
          >
            <DownloadIcon className="size-4" />
            Download PDF
          </Button>
        </div>
      </div>

      <div className="flex justify-center overflow-x-auto">
        <PublicDocumentFrame html={html} title={`Invoice ${invoice.number}`} />
      </div>
    </div>
  );
}
