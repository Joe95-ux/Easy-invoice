import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageScroll } from "@/components/app-shell/app-shell";
import { PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";
import { ClientsEmptyState } from "@/features/clients/components/clients-empty-state";
import { ClientsTable } from "@/features/clients/components/clients-table";
import { requireMember } from "@/lib/auth";
import { getClientsForMember } from "@/lib/clients";
import { countClientEmailDuplicateGroups } from "@/lib/clients/count-duplicates";
import { canDeleteDocuments, canWriteDocuments } from "@/lib/team";

export default async function ClientsPage() {
  const member = await requireMember();
  const canWrite = canWriteDocuments(member.role);
  const canDelete = canDeleteDocuments(member.role);

  const [clients, duplicateEmailGroups] = await Promise.all([
    getClientsForMember(member.companyId),
    countClientEmailDuplicateGroups(member.companyId),
  ]);

  return (
    <PageScroll>
      <PageHeader
        title="Clients"
        description="Manage the people and businesses you invoice."
        actions={
          canWrite ? (
            <Button className={pageHeaderActionClass} render={<Link href="/clients/new" />}>
              <PlusIcon className="size-4" />
              Add client
            </Button>
          ) : undefined
        }
      />

      {clients.length === 0 ? (
        <ClientsEmptyState canWrite={canWrite} />
      ) : (
        <Card className="overflow-hidden py-0">
          <ClientsTable
            clients={clients}
            duplicateEmailGroups={duplicateEmailGroups}
            canWrite={canWrite}
            canDelete={canDelete}
          />
        </Card>
      )}
    </PageScroll>
  );
}
