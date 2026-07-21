import Link from "next/link";
import { notFound } from "next/navigation";
import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EstimateRespondActions } from "@/features/public/components/estimate-respond-actions";
import { PublicDocumentFrame } from "@/features/public/components/public-document-frame";
import { renderEstimateHtmlForEstimate } from "@/lib/estimate-html";
import { formatDate, formatMoney } from "@/lib/estimates";
import { getEstimateByPublicToken, markEstimateViewed } from "@/lib/public-documents";

type PageProps = { params: Promise<{ token: string }> };

export default async function PublicEstimatePage({ params }: PageProps) {
  const { token } = await params;
  const estimate = await getEstimateByPublicToken(token);
  if (!estimate) notFound();

  if (!estimate.viewedAt) {
    await markEstimateViewed(estimate.id, estimate.status);
  }

  const html = await renderEstimateHtmlForEstimate(estimate);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Estimate</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{estimate.number}</h1>
          <p className="text-sm text-muted-foreground">
            From {estimate.company.name}
            {estimate.issueDate && ` · Issued ${formatDate(estimate.issueDate)}`}
            {estimate.validUntil && ` · Valid until ${formatDate(estimate.validUntil)}`}
          </p>
          <p className="text-lg font-semibold tabular-nums">
            {formatMoney(estimate.total, estimate.currency)}
          </p>
        </div>
        <Button variant="outline" className="w-full sm:w-auto" render={<Link href={`/api/public/estimates/${token}/pdf`} target="_blank" />}>
          <DownloadIcon className="size-4" />
          Download PDF
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <EstimateRespondActions
          token={token}
          initialStatus={estimate.status}
          clientName={estimate.client?.name}
        />
      </div>

      <div className="flex justify-center">
        <PublicDocumentFrame html={html} title={`Estimate ${estimate.number}`} />
      </div>
    </div>
  );
}
