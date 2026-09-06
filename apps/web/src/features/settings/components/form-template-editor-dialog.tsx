"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FormFieldsEditor } from "@/features/projects/components/form-fields-editor";
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
import { Textarea } from "@/components/ui/textarea";
import type { FormFieldDef } from "@/lib/schemas/project-form";

export type FormTemplateListItem = {
  id: string;
  name: string;
  description: string | null;
  fields: FormFieldDef[];
  createdAt: string;
  updatedAt: string;
};

type FormTemplateEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: FormTemplateListItem | null;
  onSaved: (template: FormTemplateListItem) => void;
};

export function FormTemplateEditorDialog({
  open,
  onOpenChange,
  template,
  onSaved,
}: FormTemplateEditorDialogProps) {
  const isEdit = Boolean(template);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FormFieldDef[]>([]);

  useEffect(() => {
    if (!open) return;
    if (template) {
      setName(template.name);
      setDescription(template.description ?? "");
      setFields(template.fields);
    } else {
      setName("");
      setDescription("");
      setFields([]);
    }
  }, [open, template]);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (fields.length === 0) {
      toast.error("Add at least one field");
      return;
    }
    if (fields.some((field) => !field.label.trim())) {
      toast.error("Every field needs a label");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        fields,
      };
      const response = await fetch(
        isEdit && template ? `/api/form-templates/${template.id}` : "/api/form-templates",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to save template");
      onSaved(body.template as FormTemplateListItem);
      toast.success(isEdit ? "Template saved" : "Template created");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save template");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit form template" : "New form template"}</DialogTitle>
          <DialogDescription>
            Reusable question sets you can attach when adding a form to a project.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Website requirements"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional — shown when picking a template"
              rows={2}
            />
          </div>

          <FormFieldsEditor fields={fields} onChange={setFields} />
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void handleSave()}>
            {saving ? "Saving…" : isEdit ? "Save template" : "Create template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
