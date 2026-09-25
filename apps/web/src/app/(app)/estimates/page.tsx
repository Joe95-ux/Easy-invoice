import { requireMember } from "@/lib/auth";
import { getEstimatesForMember } from "@/lib/estimate-service";
import { normalizeCustomFieldValues } from "@/lib/custom-fields";
import { canDeleteDocuments, canWriteDocuments } from "@/lib/team";
import { EstimatesTable } from "@/features/estimates/components/estimates-table";
import Link from "next/link";
import { ClipboardListIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageScroll } from "@/components/app-shell/app-shell";
import { EmptyState, PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";

function customFieldsSearchText(raw: unknown): string {
  return Object.values(normalizeCustomFieldValues(raw))
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");
}

export default async function EstimatesPage() {
  const member = await requireMember();
  const canWrite = canWriteDocuments(member.role);
  const canDelete = canDeleteDocuments(member.role);
  const estimates = await getEstimatesForMember(member.companyId);

  const rows = estimates.map((estimate) => ({
    id: estimate.id,
    number: estimate.number,
    status: estimate.status,
    total: estimate.total.toString(),
    currency: estimate.currency,
    validUntil: estimate.validUntil?.toISOString() ?? null,
    clientName: estimate.client?.name ?? null,
    customFieldsSearch: customFieldsSearchText(estimate.customFields),
  }));

  return (
    <PageScroll>
      <PageHeader
        title="Estimates"
        description="Send quotes and turn them into invoices once accepted."
        actions={
          canWrite ? (
            <Button className={pageHeaderActionClass} render={<Link href="/estimates/new" />}>
              <PlusIcon className="size-4" />
              New estimate
            </Button>
          ) : undefined
        }
      />

      {estimates.length === 0 ? (
        <EmptyState
          icon={ClipboardListIcon}
          title="No estimates yet"
          description="Draft a professional quote — by form or with AI."
          action={
            canWrite ? (
              <Button render={<Link href="/estimates/new" />}>
                <PlusIcon className="size-4" />
                Create your first estimate
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <EstimatesTable
            estimates={rows}
            companyName={member.company.name}
            canWrite={canWrite}
            canDelete={canDelete}
          />
        </Card>
      )}
    </PageScroll>
  );
}
