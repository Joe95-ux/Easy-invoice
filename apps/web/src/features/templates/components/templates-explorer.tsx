"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GalleryHorizontalIcon, LayoutGridIcon } from "lucide-react";
import { toast } from "sonner";
import { DocumentPreviewDrawer } from "@/components/document-preview-drawer";
import { TemplateCarousel } from "@/features/invoices/components/template-carousel";
import {
  SAMPLE_PROJECT_SCOPE,
  SAMPLE_TERMS_NOTES,
  companyForTemplatePreview,
  sampleCustomFieldPreview,
  type PreviewCompany,
} from "@/lib/invoice-templates/preview-html";
import type { DocumentKind } from "@/lib/invoice-templates/types";
import type { CustomFieldDefinition } from "@/lib/schemas/custom-fields";
import type { TemplateSummary } from "@/lib/templates";
import { cn } from "@/lib/utils";

const VIEW_STORAGE_KEY = "templates:browse-view";

type TemplatesView = "carousel" | "grid";

type TemplatesExplorerProps = {
  templates: TemplateSummary[];
  defaultTemplateId: string;
  company: PreviewCompany;
  currency: string;
  customFieldDefinitions?: CustomFieldDefinition[];
};

export function TemplatesExplorer({
  templates,
  defaultTemplateId,
  company,
  currency,
  customFieldDefinitions = [],
}: TemplatesExplorerProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(defaultTemplateId);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const [view, setView] = useState<TemplatesView>("grid");
  const [kind, setKind] = useState<DocumentKind>("invoice");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (stored === "carousel" || stored === "grid") setView(stored);
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  function changeView(next: TemplatesView) {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      /* ignore quota / private mode */
    }
  }

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
        kind={kind}
        company={company}
        currency={currency}
        customFieldDefinitions={customFieldDefinitions}
        label="All templates"
        layout={view}
        headerActions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <SegmentedToggle
              label="Preview document type"
              value={kind}
              onChange={setKind}
              options={[
                { id: "invoice", label: "Invoice" },
                { id: "estimate", label: "Estimate" },
              ]}
            />
            <SegmentedToggle
              label="Template layout"
              value={view}
              onChange={changeView}
              options={[
                { id: "grid", label: "Grid", icon: LayoutGridIcon },
                { id: "carousel", label: "Carousel", icon: GalleryHorizontalIcon },
              ]}
            />
          </div>
        }
      />

      <DocumentPreviewDrawer
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        kind={kind}
        company={companyForTemplatePreview(company)}
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
        notes={SAMPLE_TERMS_NOTES}
        scope={kind === "estimate" ? SAMPLE_PROJECT_SCOPE : undefined}
        {...sampleCustomFieldPreview(kind, customFieldDefinitions)}
        items={[
          { description: "Design & discovery", quantity: 1, unitPrice: 1200 },
          { description: "Development", quantity: 12, unitPrice: 90 },
          { description: "Project management", quantity: 4, unitPrice: 75 },
        ]}
        totals={{ subtotal: 2580, taxAmount: 193.5, total: 2773.5 }}
        taxRate={7.5}
        discount={0}
      />
    </>
  );
}

function SegmentedToggle<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ id: T; label: string; icon?: typeof LayoutGridIcon }>;
}) {
  return (
    <div
      className="flex h-8 gap-0.5 rounded-lg border border-border p-0.5"
      role="group"
      aria-label={label}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          aria-pressed={value === option.id}
          title={option.label}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
            value === option.id
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          )}
        >
          {option.icon ? <option.icon className="size-3.5" /> : null}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
