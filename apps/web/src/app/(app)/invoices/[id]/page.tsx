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
import { InvoiceRemindersSection } from "@/features/invoices/components/invoice-reminders-section";
import { InvoicePaymentsSection } from "@/features/invoices/components/invoice-payments-section";
import { DocumentHistorySection } from "@/components/document-history-section";
import { DocumentTemplateManager } from "@/features/invoices/components/document-template-manager";
import { requireMember } from "@/lib/auth";
import {
  companyBrandingFields,
  logoPreviewClassName,
  normalizeLogoBg,
} from "@/lib/company-branding";
import { cn } from "@/lib/utils";
import {
  formatDate,
  formatMoney,
  getInvoiceForMember,
  getInvoiceRemindersForMember,
  invoiceStatusLabel,
  invoiceStatusVariant,
} from "@/lib/invoices";
import { getTemplatesForCompany } from "@/lib/templates";
import { buildInvoicePaymentSummary } from "@/lib/invoice-payments";

type PageProps = { params: Promise<{ id: string }> };

export default async function InvoiceDetailPage({ params }: PageProps) {
  const member = await requireMember();

  const { id } = await params;
  const [invoice, templates, reminders] = await Promise.all([
    getInvoiceForMember(id, member.companyId),
    getTemplatesForCompany(member.companyId),
    getInvoiceRemindersForMember(id, member.companyId),
  ]);
  if (!invoice) notFound();

  const paymentSummary = buildInvoicePaymentSummary(invoice);

  return (
    <PageScroll>
      <Suspense>
        <InvoiceAutoDownload
          invoiceId={invoice.id}
          invoiceNumber={invoice.number}
          companyName={invoice.company.name}
        />
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
            companyName={invoice.company.name}
            status={invoice.status}
            currency={invoice.currency}
            balanceDue={paymentSummary.balanceDue}
            clientEmail={invoice.client?.email}
            dueDate={invoice.dueDate?.toISOString() ?? null}
            sentAt={invoice.sentAt?.toISOString() ?? null}
            celebrateInvoicePaid={member.celebrateInvoicePaid}
          />
        }
      />

      <Card id="invoice-template" className="mb-6 scroll-mt-20">
        <CardContent>
          <DocumentTemplateManager
            kind="invoice"
            templates={templates}
            value={invoice.templateId ?? templates.find((t) => t.isDefault)?.id ?? templates[0]?.id ?? ""}
            invoiceId={invoice.id}
            company={{
              name: invoice.company.name,
              logoUrl: invoice.company.logoUrl,
              ...companyBrandingFields(invoice.company),
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
              amountPaid: paymentSummary.amountPaid,
              balanceDue: paymentSummary.balanceDue,
              installments: paymentSummary.installments.map((row) => ({
                dueDate: row.dueDate.toISOString(),
                amount: row.amount,
                label: row.label,
                paidAmount: row.paidAmount,
                balanceDue: row.balanceDue,
                isPaid: row.isPaid,
              })),
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
                className={cn(
                  "mb-3 h-12 w-auto max-w-[160px] rounded-md object-contain p-1.5 ring-1",
                  logoPreviewClassName(normalizeLogoBg(invoice.company.logoBg)),
                )}
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
          <Table stickyColumnWidths={["11rem", "4rem"]}>
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

      <InvoicePaymentsSection
        invoiceId={invoice.id}
        invoiceNumber={invoice.number}
        status={invoice.status}
        currency={invoice.currency}
        total={Number(invoice.total)}
        amountPaid={paymentSummary.amountPaid}
        balanceDue={paymentSummary.balanceDue}
        clientEmail={invoice.client?.email}
        installments={paymentSummary.installments.map((row) => ({
          id: row.id,
          dueDate: row.dueDate.toISOString(),
          amount: row.amount,
          label: row.label,
          paidAmount: row.paidAmount,
          balanceDue: row.balanceDue,
          isPaid: row.isPaid,
          isOverdue: row.isOverdue,
        }))}
        payments={invoice.payments.map((payment) => ({
          id: payment.id,
          amount: Number(payment.amount),
          paidAt: payment.paidAt.toISOString(),
          method: payment.method,
          reference: payment.reference,
          note: payment.note,
          receiptNumber: payment.receiptNumber,
        }))}
        celebrateInvoicePaid={member.celebrateInvoicePaid}
      />

      <InvoiceRemindersSection
        invoiceId={invoice.id}
        status={invoice.status}
        clientEmail={invoice.client?.email}
        dueDate={invoice.dueDate?.toISOString() ?? null}
        sentAt={invoice.sentAt?.toISOString() ?? null}
        remindersPaused={invoice.remindersPaused}
        reminders={(reminders ?? []).map((row) => ({
          id: row.id,
          kind: row.kind,
          status: row.status,
          toEmail: row.toEmail,
          createdAt: row.createdAt.toISOString(),
          error: row.error,
        }))}
      />

      <DocumentHistorySection
        kind="invoice"
        documentId={invoice.id}
        company={{
          name: invoice.company.name,
          logoUrl: invoice.company.logoUrl,
          ...companyBrandingFields(invoice.company),
          email: invoice.company.email,
          phone: invoice.company.phone,
          address: invoice.company.address,
          city: invoice.company.city,
          state: invoice.company.state,
          zip: invoice.company.zip,
          country: invoice.company.country,
        }}
        client={{
          name: invoice.client?.name ?? "",
          email: invoice.client?.email,
          phone: invoice.client?.phone,
          address: invoice.client?.address,
        }}
        templates={templates}
      />
    </PageScroll>
  );
}
