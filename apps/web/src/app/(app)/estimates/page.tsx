import { requireMember } from "@/lib/auth";
import { getEstimatesForMember } from "@/lib/estimate-service";
import { EstimatesTable } from "@/features/estimates/components/estimates-table";
import Link from "next/link";
import { ClipboardListIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageScroll } from "@/components/app-shell/app-shell";
import { EmptyState, PageHeader } from "@/components/app-shell/page-header";

export default async function EstimatesPage() {
  const member = await requireMember();
  const estimates = await getEstimatesForMember(member.companyId);

  const rows = estimates.map((estimate) => ({
    id: estimate.id,
    number: estimate.number,
    status: estimate.status,
    total: estimate.total.toString(),
    currency: estimate.currency,
    validUntil: estimate.validUntil?.toISOString() ?? null,
    clientName: estimate.client?.name ?? null,
  }));

  return (
    <PageScroll>
      <PageHeader
        title="Estimates"
        description="Send quotes and turn them into invoices once accepted."
        actions={
          <Button render={<Link href="/estimates/new" />}>
            <PlusIcon className="size-4" />
            New estimate
          </Button>
        }
      />

      {estimates.length === 0 ? (
        <EmptyState
          icon={ClipboardListIcon}
          title="No estimates yet"
          description="Draft a professional quote — by form or with AI."
          action={
            <Button render={<Link href="/estimates/new" />}>
              <PlusIcon className="size-4" />
              Create your first estimate
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <EstimatesTable estimates={rows} />
        </Card>
      )}
    </PageScroll>
  );
}
