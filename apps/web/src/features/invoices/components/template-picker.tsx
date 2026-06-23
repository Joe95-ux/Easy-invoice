"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

type TemplateOption = {
  id: string;
  name: string;
  slug: string;
  isSystem: boolean;
};

type TemplatePickerProps = {
  templates: TemplateOption[];
  value: string;
  onChange?: (templateId: string) => void;
  invoiceId?: string;
  disabled?: boolean;
};

export function TemplatePicker({
  templates,
  value,
  onChange,
  invoiceId,
  disabled,
}: TemplatePickerProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleChange(templateId: string) {
    onChange?.(templateId);

    if (!invoiceId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: templateId || null }),
      });
      if (!response.ok) throw new Error("Failed to update template");

      toast.success("Template updated");
      router.refresh();
    } catch {
      toast.error("Could not update template");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="invoice-template">Invoice template</Label>
      <NativeSelect
        id="invoice-template"
        className="w-full max-w-xs"
        value={value}
        disabled={disabled || saving}
        onChange={(e) => handleChange(e.target.value)}
      >
        {templates.map((template) => (
          <NativeSelectOption key={template.id} value={template.id}>
            {template.name}
            {template.isSystem ? " (built-in)" : ""}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}
