"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientForm } from "@/features/clients/components/client-form";
import {
  formatMoney,
  invoiceStatusLabel,
  invoiceStatusVariant,
} from "@/lib/invoices";
import type { ClientWithInvoices } from "@/lib/clients";
import type { ClientInput } from "@/lib/schemas/client";

type ClientDetailProps = {
  client: ClientWithInvoices;
};

export function ClientDetail({ client }: ClientDetailProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleUpdate(data: ClientInput) {
    const response = await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Failed to update client");

    toast.success("Client updated");
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const response = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete client");

      toast.success("Client deleted");
      router.push("/clients");
      router.refresh();
    } catch {
      toast.error("Could not delete client");
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/clients">
          <Button variant="ghost" size="sm">← Back to clients</Button>
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
          <p className="mt-1 text-muted-foreground">
            {client._count.invoices} invoice{client._count.invoices === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/invoices/new?clientId=${client.id}`}>
            <Button>Create invoice</Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger>
              <Button variant="destructive" disabled={deleting}>
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete client?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete {client.name}. Their invoices will remain but will no
                  longer be linked to this client record.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  {deleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Edit client</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientForm
              initialValues={{
                name: client.name,
                email: client.email ?? "",
                phone: client.phone ?? "",
                address: client.address ?? "",
                city: client.city ?? "",
                state: client.state ?? "",
                zip: client.zip ?? "",
                country: client.country ?? "",
                notes: client.notes ?? "",
              }}
              submitLabel="Save changes"
              onSubmit={handleUpdate}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {client.invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {client.invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="font-medium hover:underline"
                        >
                          {invoice.number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={invoiceStatusVariant(invoice.status)}>
                          {invoiceStatusLabel(invoice.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(invoice.total, invoice.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
