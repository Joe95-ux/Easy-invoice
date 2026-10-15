import { notFound } from "next/navigation";
import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { canDeleteDocuments, canWriteDocuments } from "@/lib/team";
import { getCreditNoteForMember, creditNoteStatusLabel, creditNoteStatusVariant } from "@/lib/credit-notes";
import { formatDate, formatMoney } from "@/lib/invoices";
import { PageScroll } from "@/components/app-shell/app-shell";
import { PageBackLink, PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DocumentLineItemsTable } from "@/components/document-line-items-table";
import { DocumentHistorySection } from "@/components/document-history-section";
import { CreditNoteActions } from "@/features/credit-notes/components/credit-note-actions";
import { buildTaxDisplayRows } from "@/lib/tax-rates";
import { companyBrandingFields } from "@/lib/company-branding";
import { normalizeCustomFieldsPdfPlacement } from "@/lib/custom-fields";
import { getTemplatesForCompany } from "@/lib/templates";

type PageProps = { params: Promise<{ id: string }> };

export default async function CreditNoteDetailPage({ params }: PageProps) {
  const member = await requireMember();
  const { id } = await params;
  const [creditNote, templates] = await Promise.all([
    getCreditNoteForMember(id, member.companyId),
    getTemplatesForCompany(member.companyId),
  ]);
  if (!creditNote) notFound();

  return (
    <PageScroll>
      <PageBackLink href="/credit-notes">Back to credit notes</PageBackLink>
      <PageHeader
        title={creditNote.number}
        titleAddon={
          <Badge variant={creditNoteStatusVariant(creditNote.status)}>
            {creditNoteStatusLabel(creditNote.status)}
          </Badge>
        }
        description={
          <>
            Applied to{" "}
            <Link href={`/invoices/${creditNote.invoiceId}`} className="underline-offset-2 hover:underline">
              invoice {creditNote.invoice.number}
            </Link>
            {creditNote.client?.name ? ` · ${creditNote.client.name}` : ""}
            {` · ${formatDate(creditNote.issueDate)}`}
            {creditNote.kind === "VOID" ? " · Void" : ""}
          </>
        }
        actions={
          <CreditNoteActions
            creditNoteId={creditNote.id}
            creditNoteNumber={creditNote.number}
            companyName={creditNote.company.name}
            invoiceId={creditNote.invoiceId}
            status={creditNote.status}
            clientEmail={creditNote.client?.email}
            canWrite={canWriteDocuments(member.role)}
            canDelete={canDeleteDocuments(member.role)}
          />
        }
      />

      {creditNote.reason ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Reason</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{creditNote.reason}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentLineItemsTable
            currency={creditNote.currency}
            items={creditNote.items.map((item) => ({
              id: item.id,
              description: item.description,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              amount: Number(item.amount),
              sectionTitle: item.sectionTitle,
              sectionSortOrder: item.sectionSortOrder,
              sortOrder: item.sortOrder,
            }))}
          />
          <Separator className="my-4" />
          <div className="ml-auto w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(creditNote.subtotal, creditNote.currency)}</span>
            </div>
            {buildTaxDisplayRows({
              taxes: creditNote.taxes,
              taxRate: Number(creditNote.taxRate),
              taxAmount: Number(creditNote.taxAmount),
              taxInclusive: creditNote.taxInclusive,
            }).map((row) => (
              <div key={row.label} className="flex justify-between">
                <span className="text-muted-foreground">{row.label}</span>
                <span>{formatMoney(row.amount, creditNote.currency)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <span>Credit total</span>
              <span>{formatMoney(creditNote.total, creditNote.currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {creditNote.notes ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{creditNote.notes}</p>
          </CardContent>
        </Card>
      ) : null}

      <DocumentHistorySection
        kind="credit_note"
        documentId={creditNote.id}
        company={{
          name: creditNote.company.name,
          logoUrl: creditNote.company.logoUrl,
          ...companyBrandingFields(creditNote.company),
          email: creditNote.company.email,
          phone: creditNote.company.phone,
          address: creditNote.company.address,
          city: creditNote.company.city,
          state: creditNote.company.state,
          zip: creditNote.company.zip,
          country: creditNote.company.country,
          customFieldsPdfPlacement: normalizeCustomFieldsPdfPlacement(
            creditNote.company.customFieldsPdfPlacement,
          ),
        }}
        client={{
          name: creditNote.client?.name ?? "",
          email: creditNote.client?.email,
          phone: creditNote.client?.phone,
          address: creditNote.client?.address,
        }}
        templates={templates}
      />
    </PageScroll>
  );
}
