import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { TemplatePicker } from "@/features/invoices/components/template-picker";
import { getCurrentMember } from "@/lib/auth";
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
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");

  const { id } = await params;
  const [invoice, templates] = await Promise.all([
    getInvoiceForMember(id, member.companyId),
    getTemplatesForCompany(member.companyId),
  ]);
  if (!invoice) notFound();

  return (
    <div>
      <div className="mb-6">
        <Link href="/invoices">
          <Button variant="ghost" size="sm">← Back to invoices</Button>
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{invoice.number}</h1>
            <Badge variant={invoiceStatusVariant(invoice.status)}>
              {invoiceStatusLabel(invoice.status)}
            </Badge>
          </div>
          <p className="mt-1 text-muted-foreground">
            Created {formatDate(invoice.createdAt)}
            {invoice.sentAt && ` · Sent ${formatDate(invoice.sentAt)}`}
            {invoice.paidAt && ` · Paid ${formatDate(invoice.paidAt)}`}
          </p>
        </div>
        <InvoiceActions
          invoiceId={invoice.id}
          invoiceNumber={invoice.number}
          status={invoice.status}
          clientEmail={invoice.client?.email}
        />
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <TemplatePicker
            templates={templates}
            value={invoice.templateId ?? templates.find((t) => t.isDefault)?.id ?? templates[0]?.id ?? ""}
            invoiceId={invoice.id}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">From</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
