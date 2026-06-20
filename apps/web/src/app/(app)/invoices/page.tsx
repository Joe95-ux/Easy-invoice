import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrentMember } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  formatDate,
  formatMoney,
  invoiceStatusLabel,
  invoiceStatusVariant,
} from "@/lib/invoices";

export default async function InvoicesPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");

  const invoices = await prisma.invoice.findMany({
    where: { companyId: member.companyId },
    include: { client: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="mt-1 text-muted-foreground">Track and manage your invoices</p>
        </div>
        <Link href="/invoices/new">
          <Button>New invoice</Button>
        </Link>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <p className="text-muted-foreground">No invoices yet.</p>
            <Link href="/invoices/new">
              <Button className="mt-4">Create your first invoice</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="font-medium hover:underline"
                    >
                      {invoice.number}
                    </Link>
                  </TableCell>
                  <TableCell>{invoice.client?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={invoiceStatusVariant(invoice.status)}>
                      {invoiceStatusLabel(invoice.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoney(invoice.total, invoice.currency)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(invoice.dueDate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
