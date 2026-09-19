"use client";

import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { countAnswerable } from "@/features/projects/lib/form-field-factory";
import type { FormFieldDef } from "@/lib/schemas/project-form";
import { cn } from "@/lib/utils";

type TemplateSummary = {
  id: string;
  name: string;
  description: string | null;
  fields: FormFieldDef[];
};

type BuilderTemplatesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (fields: FormFieldDef[], templateName: string) => void;
};

export function BuilderTemplatesDialog({
  open,
  onOpenChange,
  onApply,
}: BuilderTemplatesDialogProps) {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const response = await fetch("/api/form-templates");
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Failed to load templates");
        if (cancelled) return;
        const list = (body.templates ?? []) as TemplateSummary[];
        setTemplates(list);
        setSelectedId(list[0]?.id ?? null);
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Could not load templates");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const selected = templates.find((template) => template.id === selectedId) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start from a template</DialogTitle>
          <DialogDescription>
            Replaces the current fields with a ready-made structure. You can keep editing after.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Loading templates…
            </div>
          ) : templates.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No templates yet. Save one from a form to reuse it here.
            </p>
          ) : (
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {templates.map((template) => (
                <li key={template.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(template.id)}
                    className={cn(
                      "flex w-full flex-col rounded-lg border px-3 py-2.5 text-left transition-colors",
                      selectedId === template.id
                        ? "border-primary/40 bg-primary/5"
                        : "border-border hover:bg-muted/40",
                    )}
                  >
                    <span className="text-sm font-medium">{template.name}</span>
                    <span className="mt-0.5 text-xs text-muted-foreground">
                      {countAnswerable(template.fields)} questions
                      {template.description ? ` · ${template.description}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selected || selected.fields.length === 0}
            onClick={() => {
              if (!selected) return;
              onApply(selected.fields, selected.name);
              onOpenChange(false);
            }}
          >
            Use template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
