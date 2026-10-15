import Link from "next/link";
import { notFound } from "next/navigation";
import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicDocumentFrame } from "@/features/public/components/public-document-frame";
import { renderCreditNoteHtml } from "@/lib/credit-note-html";
import { formatDate, formatMoney } from "@/lib/invoices";
import { getCreditNoteByPublicToken } from "@/lib/public-documents";

type PageProps = { params: Promise<{ token: string }> };

export default async function PublicCreditNotePage({ params }: PageProps) {
  const { token } = await params;
  const creditNote = await getCreditNoteByPublicToken(token);
  if (!creditNote || creditNote.status === "DRAFT") notFound();

  const html = await renderCreditNoteHtml(creditNote);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            Credit note
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{creditNote.number}</h1>
          <p className="text-sm text-muted-foreground">
            From {creditNote.company.name}
            {` · Issued ${formatDate(creditNote.issueDate)}`}
            {` · Applied to invoice ${creditNote.invoice.number}`}
          </p>
          <p className="text-lg font-semibold tabular-nums">
            {formatMoney(creditNote.total, creditNote.currency)}
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          render={<Link href={`/api/public/credit-notes/${token}/pdf`} target="_blank" />}
        >
          <DownloadIcon className="size-4" />
          Download PDF
        </Button>
      </div>

      <div className="flex justify-center overflow-x-auto">
        <PublicDocumentFrame html={html} title={`Credit note ${creditNote.number}`} />
      </div>
    </div>
  );
}
