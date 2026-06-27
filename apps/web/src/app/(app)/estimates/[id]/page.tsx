import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { PageScroll } from "@/components/app-shell/app-shell";
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
import { EstimateActions } from "@/features/estimates/components/estimate-actions";
import { EstimateAutoDownload } from "@/features/estimates/components/estimate-auto-download";
import { DocumentTemplateManager } from "@/features/invoices/components/document-template-manager";
import { requireMember } from "@/lib/auth";
import {
  formatDate,
  formatMoney,
  getEstimateForMember,
  estimateStatusLabel,
  estimateStatusVariant,
} from "@/lib/estimates";
import { getTemplatesForCompany } from "@/lib/templates";

type PageProps = { params: Promise<{ id: string }> };

export default async function EstimateDetailPage({ params }: PageProps) {
  const member = await requireMember();

  const { id } = await params;
  const [estimate, templates] = await Promise.all([
    getEstimateForMember(id, member.companyId),
    getTemplatesForCompany(member.companyId),
  ]);
  if (!estimate) notFound();

  return (
    <PageScroll>
      <Suspense>
        <EstimateAutoDownload estimateId={estimate.id} estimateNumber={estimate.number} />
      </Suspense>

      <div className="mb-6">
        <Button variant="ghost" size="sm" render={<Link href="/estimates" />}>
          <ArrowLeftIcon className="size-4" />
          Back to estimates
        </Button>
      </div>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">{estimate.number}</h1>
            <Badge variant={estimateStatusVariant(estimate.status)}>
              {estimateStatusLabel(estimate.status)}
            </Badge>
          </div>
          <p className="mt-1 text-muted-foreground">
            Created {formatDate(estimate.createdAt)}
            {estimate.sentAt && ` · Sent ${formatDate(estimate.sentAt)}`}
            {estimate.acceptedAt && ` · Accepted ${formatDate(estimate.acceptedAt)}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" render={<Link href={`/estimates/${estimate.id}/edit`} />}>
            Edit
          </Button>
          <EstimateActions
            estimateId={estimate.id}
            estimateNumber={estimate.number}
            status={estimate.status}
            clientEmail={estimate.client?.email}
          />
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <DocumentTemplateManager
            kind="estimate"
            templates={templates}
            value={estimate.templateId ?? templates.find((t) => t.isDefault)?.id ?? templates[0]?.id ?? ""}
            estimateId={estimate.id}
            company={{
              name: estimate.company.name,
              logoUrl: estimate.company.logoUrl,
              email: estimate.company.email,
              phone: estimate.company.phone,
              address: estimate.company.address,
              city: estimate.company.city,
              state: estimate.company.state,
              zip: estimate.company.zip,
              country: estimate.company.country,
            }}
            preview={{
              number: estimate.number,
              client: {
                name: estimate.client?.name ?? "",
                email: estimate.client?.email,
                phone: estimate.client?.phone,
                address: estimate.client?.address,
              },
              issueDate: estimate.issueDate.toISOString(),
              expiryDate: estimate.validUntil?.toISOString(),
              currency: estimate.currency,
              notes: estimate.notes ?? undefined,
              items: estimate.items.map((item) => ({
                description: item.description,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
              })),
              totals: {
                subtotal: Number(estimate.subtotal),
                taxAmount: Number(estimate.taxAmount),
                total: Number(estimate.total),
              },
              taxRate: Number(estimate.taxRate) * 100,
              discount: Number(estimate.discount),
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
            {estimate.company.logoUrl && (
              <img
                src={estimate.company.logoUrl}
                alt={`${estimate.company.name} logo`}
                className="mb-3 h-12 w-auto max-w-[160px] object-contain"
              />
            )}
            <p className="font-semibold">{estimate.company.name}</p>
            {estimate.company.email && <p>{estimate.company.email}</p>}
            {estimate.company.phone && <p>{estimate.company.phone}</p>}
            {estimate.company.address && <p>{estimate.company.address}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Bill to</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-semibold">{estimate.client?.name ?? "—"}</p>
            {estimate.client?.email && <p>{estimate.client.email}</p>}
            {estimate.client?.phone && <p>{estimate.client.phone}</p>}
            {estimate.client?.address && <p>{estimate.client.address}</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Line items</CardTitle>
          <div className="text-sm text-muted-foreground">
            Issue: {formatDate(estimate.issueDate)}
            {estimate.validUntil && ` · Valid until: ${formatDate(estimate.validUntil)}`}
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
              {estimate.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{Number(item.quantity)}</TableCell>
                  <TableCell className="text-right">
                    {formatMoney(item.unitPrice, estimate.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoney(item.amount, estimate.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Separator className="my-4" />

          <div className="ml-auto w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(estimate.subtotal, estimate.currency)}</span>
            </div>
            {Number(estimate.discount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>-{formatMoney(estimate.discount, estimate.currency)}</span>
              </div>
            )}
            {Number(estimate.taxAmount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Tax ({(Number(estimate.taxRate) * 100).toFixed(1)}%)
                </span>
                <span>{formatMoney(estimate.taxAmount, estimate.currency)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <span>Total</span>
              <span>{formatMoney(estimate.total, estimate.currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {estimate.notes && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Terms &amp; notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{estimate.notes}</p>
          </CardContent>
        </Card>
      )}
    </PageScroll>
  );
}
