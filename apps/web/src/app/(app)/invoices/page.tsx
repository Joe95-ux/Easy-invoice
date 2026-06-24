import { requireMember } from "@/lib/auth";
import { getInvoicesForMember } from "@/lib/invoice-service";
import { formatDate, formatMoney, invoiceStatusLabel, invoiceStatusVariant } from "@/lib/invoices";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function InvoicesPage() {
  const member = await requireMember();
  const invoices = await getInvoicesForMember(member.companyId);

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
        <Card className="flex flex-col items-center py-12 text-center">
          <p className="text-muted-foreground">No invoices yet.</p>
          <Link href="/invoices/new">
            <Button className="mt-4">Create your first invoice</Button>
          </Link>
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
