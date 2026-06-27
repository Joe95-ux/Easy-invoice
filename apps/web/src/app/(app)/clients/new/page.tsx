"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageScroll } from "@/components/app-shell/app-shell";
import { FormCard } from "@/components/forms/form-card";
import { ClientForm } from "@/features/clients/components/client-form";
import type { ClientInput } from "@/lib/schemas/client";

export default function NewClientPage() {
  const router = useRouter();

  async function handleSubmit(data: ClientInput) {
    const response = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Failed to create client");

    toast.success("Client created");
    router.push(`/clients/${body.client.id}`);
    router.refresh();
  }

  return (
    <PageScroll className="max-w-3xl">
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="-ml-2.5" render={<Link href="/clients" />}>
          <ArrowLeftIcon className="size-4" />
          Back to clients
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Add client</h1>
        <p className="mt-1 text-muted-foreground">
          Save client details for faster invoicing.
        </p>
      </div>

      <FormCard
        title="Client details"
        footer={
          <Button type="submit" form="new-client-form" className="w-full sm:w-auto">
            Create client
          </Button>
        }
      >
        <ClientForm
          formId="new-client-form"
          showSubmit={false}
          submitLabel="Create client"
          onSubmit={handleSubmit}
        />
      </FormCard>
    </PageScroll>
  );
}
