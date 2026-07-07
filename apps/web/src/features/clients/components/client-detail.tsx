"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ClipboardListIcon, FileTextIcon, Trash2Icon } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageScroll } from "@/components/app-shell/app-shell";
import { PageBackLink, PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";
import { ClientActivityTab } from "@/features/clients/components/client-activity-tab";
import { ClientEstimatesTab } from "@/features/clients/components/client-estimates-tab";
import { ClientInvoicesTab } from "@/features/clients/components/client-invoices-tab";
import { ClientOverviewTab } from "@/features/clients/components/client-overview-tab";
import { ClientReceiptsTab } from "@/features/clients/components/client-receipts-tab";
import type { ClientFinancialProfile } from "@/lib/clients/financial-profile";
import { formatMoney } from "@/lib/invoices";
import type { ClientInput } from "@/lib/schemas/client";

const clientTabTriggerClass =
  "flex-none rounded-lg border-0 bg-muted px-3 py-1.5 text-muted-foreground shadow-none data-active:bg-muted data-active:text-foreground data-active:shadow-none dark:data-active:border-transparent dark:data-active:bg-muted";

type ClientDetailProps = {
  client: ClientFinancialProfile;
  companyName: string;
};

export function ClientDetail({ client, companyName }: ClientDetailProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const tabTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function handleTabChange(value: string | null) {
    if (!value) return;
    setActiveTab(value);
    requestAnimationFrame(() => {
      tabTriggerRefs.current[value]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    });
  }

  function setTabTriggerRef(value: string) {
    return (node: HTMLButtonElement | null) => {
      tabTriggerRefs.current[value] = node;
    };
  }
  const { summary } = client;

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

  const descriptionParts = [
    formatMoney(summary.totalCollected, summary.currency) + " collected",
    summary.outstanding > 0
      ? formatMoney(summary.outstanding, summary.currency) + " outstanding"
      : null,
  ].filter(Boolean);

  return (
    <PageScroll maxWidth="6xl">
      <PageBackLink href="/clients">Back to clients</PageBackLink>

      <PageHeader
        title={client.name}
        description={descriptionParts.join(" · ")}
        actions={
          <>
            <Button
              variant="outline"
              className={pageHeaderActionClass}
              render={<Link href={`/estimates/new?clientId=${client.id}`} />}
            >
              <ClipboardListIcon className="size-4" />
              New estimate
            </Button>
            <Button
              className={pageHeaderActionClass}
              render={<Link href={`/invoices/new?clientId=${client.id}`} />}
            >
              <FileTextIcon className="size-4" />
              New invoice
            </Button>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button variant="destructive" className={pageHeaderActionClass} disabled={deleting}>
                    <Trash2Icon className="size-4" />
                    <span className="sm:hidden">Delete client</span>
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete client?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete {client.name}. Their invoices and estimates will remain but
                    will no longer be linked to this client record.
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

      <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-6 gap-6">
        <div className="-mx-4 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
          <TabsList className="inline-flex h-auto w-max min-w-full justify-start gap-1.5 bg-transparent p-0 sm:min-w-0">
            <TabsTrigger
              ref={setTabTriggerRef("overview")}
              value="overview"
              className={clientTabTriggerClass}
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              ref={setTabTriggerRef("invoices")}
              value="invoices"
              className={clientTabTriggerClass}
            >
              Invoices{summary.invoiceCount > 0 ? ` (${summary.invoiceCount})` : ""}
            </TabsTrigger>
            <TabsTrigger
              ref={setTabTriggerRef("estimates")}
              value="estimates"
              className={clientTabTriggerClass}
            >
              Estimates{summary.estimateCount > 0 ? ` (${summary.estimateCount})` : ""}
            </TabsTrigger>
            <TabsTrigger
              ref={setTabTriggerRef("receipts")}
              value="receipts"
              className={clientTabTriggerClass}
            >
              Receipts{client.receipts.length > 0 ? ` (${client.receipts.length})` : ""}
            </TabsTrigger>
            <TabsTrigger
              ref={setTabTriggerRef("activity")}
              value="activity"
              className={clientTabTriggerClass}
            >
              Activity{client.activity.length > 0 ? ` (${client.activity.length})` : ""}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <ClientOverviewTab
            client={client}
            saving={saving}
            onSavingChange={setSaving}
            onUpdate={handleUpdate}
          />
        </TabsContent>

        <TabsContent value="invoices">
          <ClientInvoicesTab
            invoices={client.invoices}
            companyName={companyName}
            clientEmail={client.email}
            clientId={client.id}
          />
        </TabsContent>

        <TabsContent value="estimates">
          <ClientEstimatesTab
            estimates={client.estimates}
            companyName={companyName}
            clientId={client.id}
          />
        </TabsContent>

        <TabsContent value="receipts">
          <ClientReceiptsTab receipts={client.receipts} />
        </TabsContent>

        <TabsContent value="activity">
          <ClientActivityTab activity={client.activity} currency={summary.currency} />
        </TabsContent>
      </Tabs>
    </PageScroll>
  );
}
