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

type PageProps = { params: Promise<{ token: string }> };

export default async function PublicInvoicePage({ params }: PageProps) {
  const { token } = await params;
  const invoice = await getInvoiceByPublicToken(token);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Invoice</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{invoice.number}</h1>
          <p className="text-sm text-muted-foreground">
            From {invoice.company.name}
            {invoice.issueDate && ` · Issued ${formatDate(invoice.issueDate)}`}
            {invoice.dueDate && ` · Due ${formatDate(invoice.dueDate)}`}
          </p>
          <p className="text-lg font-semibold tabular-nums">
            {formatMoney(invoice.total, invoice.currency)}
            {invoice.status !== "PAID" && summary.balanceDue > 0.001 ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {summary.installments.length > 0 &&
                summary.nextDueAmount != null &&
                summary.nextDueAmount < summary.balanceDue - 0.001
                  ? `· ${formatMoney(summary.nextDueAmount, invoice.currency)} due now · ${formatMoney(summary.balanceDue, invoice.currency)} remaining`
                  : summary.amountPaid > 0
                    ? `· ${formatMoney(summary.balanceDue, invoice.currency)} due`
                    : null}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
          <InvoicePayButton
            token={token}
            balanceDue={summary.balanceDue}
            currency={invoice.currency}
            canPayOnline={canPayOnline}
            alreadyPaid={invoice.status === "PAID" || summary.balanceDue <= 0.001}
            nextDueAmount={summary.nextDueAmount}
            canOfferPlan={canOfferPlan}
          />
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

      <div className="flex justify-center">
        <PublicDocumentFrame html={html} title={`Invoice ${invoice.number}`} />
      </div>
    </div>
  );
}
