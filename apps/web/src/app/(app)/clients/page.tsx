import Link from "next/link";
import { PlusIcon, UsersRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageScroll } from "@/components/app-shell/app-shell";
import { EmptyState, PageHeader } from "@/components/app-shell/page-header";
import { requireMember } from "@/lib/auth";
import { getClientsForMember } from "@/lib/clients";

export default async function ClientsPage() {
  const member = await requireMember();

  const clients = await getClientsForMember(member.companyId);

  return (
    <PageScroll>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Invoices</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <Link href={`/clients/${client.id}`} className="font-medium hover:underline">
                      {client.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.phone ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">{client._count.invoices}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </PageScroll>
  );
}
