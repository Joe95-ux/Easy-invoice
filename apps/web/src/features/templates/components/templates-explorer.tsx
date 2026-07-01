"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DocumentPreviewDrawer } from "@/components/document-preview-drawer";
import { TemplateCarousel } from "@/features/invoices/components/template-carousel";
import { SAMPLE_PAYMENT_NOTES, type PreviewCompany } from "@/lib/invoice-templates/preview-html";
import type { TemplateSummary } from "@/lib/templates";

type TemplatesExplorerProps = {
  templates: TemplateSummary[];
  defaultTemplateId: string;
  company: PreviewCompany;
  currency: string;
};

export function TemplatesExplorer({
  templates,
  defaultTemplateId,
  company,
  currency,
}: TemplatesExplorerProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(defaultTemplateId);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);

  const activePreviewTemplateId = previewTemplateId ?? selected;
  const previewTemplate = templates.find(
    (template) => template.id === activePreviewTemplateId,
  );

  async function selectTemplate(templateId: string) {
    if (templateId === selected) return;
    const previous = selected;
    setSelected(templateId);
    try {
      const response = await fetch("/api/company/default-template", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      if (!response.ok) throw new Error("Failed to update default template");
      toast.success("Default template updated");
      router.refresh();
    } catch {
      setSelected(previous);
      toast.error("Could not update default template");
    }
  }

  if (templates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No templates available yet. Check back soon.
      </p>
    );
  }

  return (
    <>
      <TemplateCarousel
        templates={templates}
        value={selected}
        onChange={selectTemplate}
        onPreview={(id) => {
          setPreviewTemplateId(id);
          setPreviewOpen(true);
        }}
        kind="invoice"
        company={company}
        currency={currency}
        label="All templates"
      />

      <DocumentPreviewDrawer
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        kind="invoice"
        company={company}
        templateSlug={previewTemplate?.slug}
        templateName={previewTemplate?.name}
        isSelected={previewTemplate?.id === selected}
        onUseTemplate={() => {
          if (previewTemplate) selectTemplate(previewTemplate.id);
          setPreviewTemplateId(null);
        }}
        number="0001"
        client={{
          name: "Acme Studios",
          email: "billing@acme.co",
          address: "120 Market St, San Francisco, CA",
        }}
        issueDate={new Date().toISOString().slice(0, 10)}
        expiryDate={new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)}
        currency={currency}
        notes={SAMPLE_PAYMENT_NOTES}
        items={[
          { description: "Design & discovery", quantity: 1, unitPrice: 1200 },
          { description: "Development", quantity: 12, unitPrice: 90 },
        ]}
        totals={{ subtotal: 2280, taxAmount: 171, total: 2451 }}
        taxRate={7.5}
        discount={0}
      />
    </>
  );
}
