import Link from "next/link";
import { PlusIcon, UsersRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageScroll } from "@/components/app-shell/app-shell";
import { EmptyState, PageHeader } from "@/components/app-shell/page-header";
import { ClientsTable } from "@/features/clients/components/clients-table";
import { requireMember } from "@/lib/auth";
import { getClientsForMember } from "@/lib/clients";

export default async function ClientsPage() {
  const member = await requireMember();

  const clients = await getClientsForMember(member.companyId);

  return (
    <PageScroll fullWidth>
      <PageHeader
        title="Clients"
        description="Manage the people and businesses you invoice."
        actions={
          <Button render={<Link href="/clients/new" />}>
            <PlusIcon className="size-4" />
            Add client
          </Button>
        }
      />

      {clients.length === 0 ? (
        <EmptyState
          icon={UsersRoundIcon}
          title="No clients yet"
          description="Add a client once and reuse their details on every invoice."
          action={
            <Button render={<Link href="/clients/new" />}>
              <PlusIcon className="size-4" />
              Add your first client
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <ClientsTable clients={clients} />
        </Card>
      )}
    </PageScroll>
  );
}
