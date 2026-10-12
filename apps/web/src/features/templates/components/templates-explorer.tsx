"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GalleryHorizontalIcon, LayoutGridIcon } from "lucide-react";
import { toast } from "sonner";
import { DocumentPreviewDrawer } from "@/components/document-preview-drawer";
import { TemplateCarousel } from "@/features/invoices/components/template-carousel";
import { SAMPLE_TERMS_NOTES, companyForTemplatePreview, type PreviewCompany } from "@/lib/invoice-templates/preview-html";
import type { TemplateSummary } from "@/lib/templates";
import { cn } from "@/lib/utils";

const VIEW_STORAGE_KEY = "templates:browse-view";

type TemplatesView = "carousel" | "grid";

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
  const [view, setView] = useState<TemplatesView>("grid");

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
        kind="invoice"
        company={company}
        currency={currency}
        label="All templates"
        layout={view}
        headerActions={
          <div
            className="grid h-8 grid-cols-2 gap-0.5 rounded-lg border border-border p-0.5"
            role="group"
            aria-label="Template layout"
          >
            {(
              [
                { id: "grid" as const, label: "Grid", icon: LayoutGridIcon },
                { id: "carousel" as const, label: "Carousel", icon: GalleryHorizontalIcon },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => changeView(option.id)}
                aria-label={option.label}
                aria-pressed={view === option.id}
                title={option.label}
                className={cn(
                  "inline-flex items-center justify-center rounded-md px-2 text-muted-foreground transition-colors",
                  view === option.id
                    ? "bg-muted text-foreground"
                    : "hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <option.icon className="size-3.5" />
                <span className="sr-only">{option.label}</span>
              </button>
            ))}
          </div>
        }
      />

      <DocumentPreviewDrawer
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        kind="invoice"
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
