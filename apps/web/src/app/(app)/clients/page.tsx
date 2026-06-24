import Link from "next/link";
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
import { requireMember } from "@/lib/auth";
import { getClientsForMember } from "@/lib/clients";

export default async function ClientsPage() {
  const member = await requireMember();

  const clients = await getClientsForMember(member.companyId);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="mt-1 text-muted-foreground">
            Manage the people and businesses you invoice
          </p>
        </div>
        <Link href="/clients/new">
          <Button>Add client</Button>
        </Link>
      </div>

      {clients.length === 0 ? (
        <Card className="flex flex-col items-center py-12 text-center">
          <p className="text-muted-foreground">No clients yet.</p>
          <Link href="/clients/new">
            <Button className="mt-4">Add your first client</Button>
          </Link>
        </Card>
      ) : (
        <Card>
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
    </div>
  );
}
