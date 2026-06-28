import Link from "next/link";
import { notFound } from "next/navigation";
import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicDocumentFrame } from "@/features/public/components/public-document-frame";
import { renderInvoiceHtmlForInvoice } from "@/lib/invoice-html";
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

  const html = await renderInvoiceHtmlForInvoice(invoice);

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
          </p>
        </div>
        <Button variant="outline" className="w-full sm:w-auto" render={<Link href={`/api/public/invoices/${token}/pdf`} target="_blank" />}>
          <DownloadIcon className="size-4" />
          Download PDF
        </Button>
      </div>

      <div className="flex justify-center">
        <PublicDocumentFrame html={html} title={`Invoice ${invoice.number}`} />
      </div>
    </div>
  );
}
