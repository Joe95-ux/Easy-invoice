import Link from "next/link";
import { notFound } from "next/navigation";
import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicDocumentFrame } from "@/features/public/components/public-document-frame";
import { getAppOrigin } from "@/lib/app-url";
import { publicDocumentUrl } from "@/lib/document-tokens";
import { formatDate, formatMoney } from "@/lib/invoices";
import { getStatementByToken } from "@/lib/statements";
import { renderStatementHtml, type StatementInvoiceRow } from "@/lib/statement-html";

type PageProps = { params: Promise<{ token: string }> };

export default async function PublicStatementPage({ params }: PageProps) {
  const { token } = await params;
  const statement = await getStatementByToken(token);
  if (!statement) notFound();

  const snapshot = statement.snapshot as {
    current: number;
    days1to30: number;
    days31to60: number;
    days61plus: number;
    invoices: StatementInvoiceRow[];
  };
  const origin = await getAppOrigin();
  const html = renderStatementHtml({
    company: statement.company,
    client: statement.client,
    statement: {
      number: statement.number,
      issuedAt: statement.issuedAt,
      currency: statement.currency,
      totalDue: Number(statement.totalDue),
      current: snapshot.current,
      days1to30: snapshot.days1to30,
      days31to60: snapshot.days31to60,
      days61plus: snapshot.days61plus,
    },
    invoices: snapshot.invoices,
    viewUrl: publicDocumentUrl(origin, "statement", token),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            Statement
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{statement.number}</h1>
          <p className="text-sm text-muted-foreground">
            From {statement.company.name}
            {` · ${formatDate(statement.issuedAt)}`}
            {` · ${statement.client.name}`}
          </p>
          <p className="text-lg font-semibold tabular-nums">
            {formatMoney(statement.totalDue, statement.currency)}
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          render={<Link href={`/api/public/statements/${token}/pdf`} target="_blank" />}
        >
          <DownloadIcon className="size-4" />
          Download PDF
        </Button>
      </div>
      <div className="flex justify-center overflow-x-auto">
        <PublicDocumentFrame html={html} title={`Statement ${statement.number}`} />
      </div>
    </div>
  );
}
