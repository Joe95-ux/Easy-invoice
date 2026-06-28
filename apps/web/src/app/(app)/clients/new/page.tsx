"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageScroll } from "@/components/app-shell/app-shell";
import { PageBackLink, PageHeader } from "@/components/app-shell/page-header";
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
      <PageBackLink href="/clients">Back to clients</PageBackLink>

      <PageHeader
        title="Add client"
        description="Save client details for faster invoicing."
      />

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
