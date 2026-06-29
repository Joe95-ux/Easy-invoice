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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageScroll } from "@/components/app-shell/app-shell";
import { PageBackLink, PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";
import { FormCard } from "@/components/forms/form-card";
import { ClientForm } from "@/features/clients/components/client-form";
import { ClientInvoicesTable } from "@/features/clients/components/client-invoices-table";
import type { ClientDetailData } from "@/lib/clients";
import type { ClientInput } from "@/lib/schemas/client";

type ClientDetailProps = {
  client: ClientDetailData;
};

export function ClientDetail({ client }: ClientDetailProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

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
    <PageScroll fullWidth>
      <PageBackLink href="/clients">Back to clients</PageBackLink>

      <PageHeader
        title={client.name}
        description={`${client._count.invoices} invoice${client._count.invoices === 1 ? "" : "s"}`}
        actions={
          <>
            <Button
              className={pageHeaderActionClass}
              render={<Link href={`/invoices/new?clientId=${client.id}`} />}
            >
              Create invoice
            </Button>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button variant="destructive" className={pageHeaderActionClass} disabled={deleting}>
                    Delete
                  </Button>
                }
              />
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
        </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <FormCard
          title="Edit client"
          footer={
            <Button type="submit" form="edit-client-form" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          }
        >
          <ClientForm
            formId="edit-client-form"
            showSubmit={false}
            onSubmittingChange={setSaving}
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
        </FormCard>

        <Card>
          <CardHeader>
            <CardTitle>Recent invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {client.invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
            ) : (
              <ClientInvoicesTable
                invoices={client.invoices}
                clientEmail={client.email}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PageScroll>
  );
}
