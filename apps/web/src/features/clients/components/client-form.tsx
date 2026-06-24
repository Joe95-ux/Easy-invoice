"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/forms/form-field";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { zodFieldErrors } from "@/lib/validation/zod";
import { clientSchema, type ClientInput } from "@/lib/schemas/client";

const emptyValues: ClientInput = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  country: "",
  notes: "",
};

type ClientFormProps = {
  initialValues?: Partial<ClientInput>;
  submitLabel?: string;
  onSubmit: (data: ClientInput) => Promise<void>;
};

export function ClientForm({
  initialValues,
  submitLabel = "Save client",
  onSubmit,
}: ClientFormProps) {
  const [form, setForm] = useState<ClientInput>({ ...emptyValues, ...initialValues });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function updateField<K extends keyof ClientInput>(key: K, value: ClientInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsed = clientSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await onSubmit(parsed.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Name"
          id="name"
          value={form.name}
          onChange={(v) => updateField("name", v)}
          error={errors.name}
          required
        />
        <FormField
          label="Email"
          id="email"
          type="email"
          value={form.email ?? ""}
          onChange={(v) => updateField("email", v)}
          error={errors.email}
        />
        <FormField
          label="Phone"
          id="phone"
          value={form.phone ?? ""}
          onChange={(v) => updateField("phone", v)}
        />
        <FormField
          label="Country"
          id="country"
          value={form.country ?? ""}
          onChange={(v) => updateField("country", v)}
        />
      </div>

      <FormField
        label="Address"
        id="address"
        value={form.address ?? ""}
        onChange={(v) => updateField("address", v)}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="City" id="city" value={form.city ?? ""} onChange={(v) => updateField("city", v)} />
        <FormField label="State" id="state" value={form.state ?? ""} onChange={(v) => updateField("state", v)} />
        <FormField label="ZIP" id="zip" value={form.zip ?? ""} onChange={(v) => updateField("zip", v)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={form.notes ?? ""}
          onChange={(e) => updateField("notes", e.target.value)}
          rows={3}
        />
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
