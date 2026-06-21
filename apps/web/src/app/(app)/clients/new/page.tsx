"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div>
      <div className="mb-6">
        <Link href="/clients">
          <Button variant="ghost" size="sm">← Back to clients</Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Add client</h1>
        <p className="mt-1 text-muted-foreground">
          Save client details for faster invoicing
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client details</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm submitLabel="Create client" onSubmit={handleSubmit} />
        </CardContent>
      </Card>
    </div>
  );
}
