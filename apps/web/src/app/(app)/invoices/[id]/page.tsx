import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageScroll } from "@/components/app-shell/app-shell";
import { PageBackLink, PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoiceActions } from "@/features/invoices/components/invoice-actions";
import { InvoiceAutoDownload } from "@/features/invoices/components/invoice-auto-download";
import { DocumentTemplateManager } from "@/features/invoices/components/document-template-manager";
import { requireMember } from "@/lib/auth";
import {
  formatDate,
  formatMoney,
  getInvoiceForMember,
  invoiceStatusLabel,
  invoiceStatusVariant,
} from "@/lib/invoices";
import { getTemplatesForCompany } from "@/lib/templates";

type PageProps = { params: Promise<{ id: string }> };

export default async function InvoiceDetailPage({ params }: PageProps) {
  const member = await requireMember();

  const { id } = await params;
  const [invoice, templates] = await Promise.all([
    getInvoiceForMember(id, member.companyId),
    getTemplatesForCompany(member.companyId),
  ]);
  if (!invoice) notFound();

  return (
    <PageScroll>
      <Suspense>
        <InvoiceAutoDownload invoiceId={invoice.id} invoiceNumber={invoice.number} />
      </Suspense>

      <PageBackLink href="/invoices">Back to invoices</PageBackLink>

      <PageHeader
        title={invoice.number}
        titleAddon={
          <Badge variant={invoiceStatusVariant(invoice.status)}>
            {invoiceStatusLabel(invoice.status)}
          </Badge>
        }
        description={
          <>
            Created {formatDate(invoice.createdAt)}
            {invoice.sentAt && ` · Sent ${formatDate(invoice.sentAt)}`}
            {invoice.viewedAt && ` · Viewed ${formatDate(invoice.viewedAt)}`}
            {invoice.paidAt && ` · Paid ${formatDate(invoice.paidAt)}`}
          </>
        }
        actions={
          <InvoiceActions
            invoiceId={invoice.id}
            invoiceNumber={invoice.number}
            status={invoice.status}
            clientEmail={invoice.client?.email}
          />
        }
      />

      <Card id="invoice-template" className="mb-6 scroll-mt-20">
        <CardContent className="pt-6">
          <DocumentTemplateManager
            kind="invoice"
            templates={templates}
            value={invoice.templateId ?? templates.find((t) => t.isDefault)?.id ?? templates[0]?.id ?? ""}
            invoiceId={invoice.id}
            company={{
              name: invoice.company.name,
              logoUrl: invoice.company.logoUrl,
              email: invoice.company.email,
              phone: invoice.company.phone,
              address: invoice.company.address,
              city: invoice.company.city,
              state: invoice.company.state,
              zip: invoice.company.zip,
              country: invoice.company.country,
            }}
            preview={{
              number: invoice.number,
              client: {
                name: invoice.client?.name ?? "",
                email: invoice.client?.email,
                phone: invoice.client?.phone,
                address: invoice.client?.address,
              },
              issueDate: invoice.issueDate.toISOString(),
              expiryDate: invoice.dueDate?.toISOString(),
              currency: invoice.currency,
              notes: invoice.notes ?? undefined,
              items: invoice.items.map((item) => ({
                description: item.description,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
              })),
              totals: {
                subtotal: Number(invoice.subtotal),
                taxAmount: Number(invoice.taxAmount),
                total: Number(invoice.total),
              },
              taxRate: Number(invoice.taxRate) * 100,
              discount: Number(invoice.discount),
            }}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">From</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {invoice.company.logoUrl && (
              <img
                src={invoice.company.logoUrl}
                alt={`${invoice.company.name} logo`}
                className="mb-3 h-12 w-auto max-w-[160px] object-contain"
              />
            )}
            <p className="font-semibold">{invoice.company.name}</p>
            {invoice.company.email && <p>{invoice.company.email}</p>}
            {invoice.company.phone && <p>{invoice.company.phone}</p>}
            {invoice.company.address && <p>{invoice.company.address}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Bill to</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-semibold">{invoice.client?.name ?? "—"}</p>
            {invoice.client?.email && <p>{invoice.client.email}</p>}
            {invoice.client?.phone && <p>{invoice.client.phone}</p>}
            {invoice.client?.address && <p>{invoice.client.address}</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Line items</CardTitle>
          <div className="text-sm text-muted-foreground">
            Issue: {formatDate(invoice.issueDate)}
            {invoice.dueDate && ` · Due: ${formatDate(invoice.dueDate)}`}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{Number(item.quantity)}</TableCell>
                  <TableCell className="text-right">
                    {formatMoney(item.unitPrice, invoice.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoney(item.amount, invoice.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Separator className="my-4" />

          <div className="ml-auto w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(invoice.subtotal, invoice.currency)}</span>
            </div>
            {Number(invoice.discount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>-{formatMoney(invoice.discount, invoice.currency)}</span>
              </div>
            )}
            {Number(invoice.taxAmount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Tax ({(Number(invoice.taxRate) * 100).toFixed(1)}%)
                </span>
                <span>{formatMoney(invoice.taxAmount, invoice.currency)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <span>Total</span>
              <span>{formatMoney(invoice.total, invoice.currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {invoice.notes && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Terms &amp; notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </PageScroll>
  );
}
