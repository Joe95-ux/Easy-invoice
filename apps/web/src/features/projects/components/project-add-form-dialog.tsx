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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TemplateOption = {
  id: string;
  name: string;
  description: string | null;
  fields: unknown[];
};

type ProjectAddFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCreated: (form: unknown) => void;
};

export function ProjectAddFormDialog({
  open,
  onOpenChange,
  projectId,
  onCreated,
}: ProjectAddFormDialogProps) {
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [creating, setCreating] = useState(false);
  const [templateId, setTemplateId] = useState("__blank__");
  const [name, setName] = useState("Requirements");

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoadingTemplates(true);
    setTemplateId("__blank__");
    setName("Requirements");

    void (async () => {
      try {
        const response = await fetch("/api/form-templates");
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Failed to load templates");
        if (!cancelled) setTemplates(body.templates ?? []);
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Could not load templates");
        }
      } finally {
        if (!cancelled) setLoadingTemplates(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  function handleTemplateChange(value: string | null) {
    const next = value || "__blank__";
    setTemplateId(next);
    if (next === "__blank__") {
      setName("Requirements");
      return;
    }
    const selected = templates.find((template) => template.id === next);
    if (selected) setName(selected.name);
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          templateId: templateId === "__blank__" ? null : templateId,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to create form");
      onCreated(body.form);
      toast.success("Form added");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create form");
    } finally {
      setCreating(false);
    }
  }

  const templateItems = [
    { value: "__blank__", label: "Blank (general intake)" },
    ...templates.map((template) => ({
      value: template.id,
      label: template.name,
    })),
  ];

  const selectedTemplate =
    templateId === "__blank__"
      ? null
      : templates.find((template) => template.id === templateId) ?? null;

  const selectedTemplateLabel =
    templateItems.find((item) => item.value === templateId)?.label ??
    "Blank (general intake)";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add form</DialogTitle>
          <DialogDescription>
            Start from a company template or a blank intake form, then edit questions before sharing.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-form-template">Template</Label>
            <Select
              value={templateId}
              onValueChange={handleTemplateChange}
              disabled={loadingTemplates}
              items={templateItems}
            >
              <SelectTrigger id="add-form-template" className="text-foreground">
                <SelectValue>
                  {loadingTemplates ? "Loading…" : selectedTemplateLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {templateItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplate?.description ? (
              <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-form-name">Form name</Label>
            <Input
              id="add-form-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Requirements"
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={creating || loadingTemplates} onClick={() => void handleCreate()}>
            {creating ? (
              <>
                <Loader2Icon className="animate-spin" />
                Adding…
              </>
            ) : (
              "Add form"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
