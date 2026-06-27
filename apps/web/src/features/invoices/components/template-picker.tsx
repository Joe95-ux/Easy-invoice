"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TemplateSummary } from "@/lib/templates";

type TemplatePickerProps = {
  templates: TemplateSummary[];
  value: string;
  onChange?: (templateId: string) => void;
  invoiceId?: string;
  estimateId?: string;
  label?: string;
  disabled?: boolean;
};

function templateLabel(template: TemplateSummary) {
  return `${template.name}${template.isSystem ? " (built-in)" : ""}`;
}

export function TemplatePicker({
  templates,
  value,
  onChange,
  invoiceId,
  estimateId,
  label = "Invoice template",
  disabled,
}: TemplatePickerProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const items = useMemo(
    () =>
      templates.map((template) => ({
        value: template.id,
        label: templateLabel(template),
      })),
    [templates],
  );

  async function handleChange(templateId: string | null) {
    if (!templateId) return;
    onChange?.(templateId);

    if (!invoiceId && !estimateId) return;

    setSaving(true);
    try {
      const url = invoiceId
        ? `/api/invoices/${invoiceId}`
        : `/api/estimates/${estimateId}`;
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
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
      <Label htmlFor="document-template">{label}</Label>
      <Select
        items={items}
        value={value}
        disabled={disabled || saving}
        onValueChange={(next) => handleChange(next)}
      >
        <SelectTrigger id="document-template" className="w-full">
          <SelectValue placeholder="Select template" />
        </SelectTrigger>
        <SelectContent className="max-h-72" alignItemWithTrigger={false}>
          {templates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              {templateLabel(template)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
