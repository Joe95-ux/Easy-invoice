"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DocumentPreviewDrawer } from "@/components/document-preview-drawer";
import { TemplateCarousel } from "@/features/invoices/components/template-carousel";
import type {
  BuildDocumentHtmlOptions,
  PreviewCompany,
} from "@/lib/invoice-templates/preview-html";
import type { DocumentKind } from "@/lib/invoice-templates/types";
import type { TemplateSummary } from "@/lib/templates";

type PreviewData = Omit<
  BuildDocumentHtmlOptions,
  "kind" | "company" | "templateSlug"
>;

type DocumentTemplateManagerProps = {
  kind: DocumentKind;
  templates: TemplateSummary[];
  value: string;
  invoiceId?: string;
  estimateId?: string;
  company: PreviewCompany;
  preview: PreviewData;
};

export function DocumentTemplateManager({
  kind,
  templates,
  value,
  invoiceId,
  estimateId,
  company,
  preview,
}: DocumentTemplateManagerProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(value);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);

  const activePreviewTemplateId = previewTemplateId ?? selected;
  const previewTemplate = templates.find(
    (template) => template.id === activePreviewTemplateId,
  );

  async function save(templateId: string) {
    if (templateId === selected) return;
    const previousId = selected;
    setSelected(templateId);
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
      setSelected(previousId);
      toast.error("Could not update template");
    }
  }

  return (
    <>
      <TemplateCarousel
        templates={templates}
        value={selected}
        onChange={save}
        onPreview={(id) => {
          setPreviewTemplateId(id);
          setPreviewOpen(true);
        }}
        kind={kind}
        company={company}
        currency={preview.currency}
      />
      <DocumentPreviewDrawer
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        kind={kind}
        company={company}
        templateSlug={previewTemplate?.slug}
        templateName={previewTemplate?.name}
        isSelected={previewTemplate?.id === selected}
        onUseTemplate={() => {
          if (previewTemplate) save(previewTemplate.id);
          setPreviewTemplateId(null);
        }}
        {...preview}
      />
    </>
  );
}
