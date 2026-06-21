"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string") fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
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
        <Field
          label="Name"
          id="name"
          value={form.name}
          onChange={(v) => updateField("name", v)}
          error={errors.name}
          required
        />
        <Field
          label="Email"
          id="email"
          type="email"
          value={form.email ?? ""}
          onChange={(v) => updateField("email", v)}
          error={errors.email}
        />
        <Field
          label="Phone"
          id="phone"
          value={form.phone ?? ""}
          onChange={(v) => updateField("phone", v)}
        />
        <Field
          label="Country"
          id="country"
          value={form.country ?? ""}
          onChange={(v) => updateField("country", v)}
        />
      </div>

      <Field
        label="Address"
        id="address"
        value={form.address ?? ""}
        onChange={(v) => updateField("address", v)}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="City" id="city" value={form.city ?? ""} onChange={(v) => updateField("city", v)} />
        <Field label="State" id="state" value={form.state ?? ""} onChange={(v) => updateField("state", v)} />
        <Field label="ZIP" id="zip" value={form.zip ?? ""} onChange={(v) => updateField("zip", v)} />
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

function Field({
  label,
  id,
  value,
  onChange,
  error,
  type = "text",
  required,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
