"use client";

import { useEffect, useRef, useState } from "react";
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
import type { FormFieldDef } from "@/lib/schemas/project-form";
import { isAnswerableFormField } from "@/lib/schemas/project-form";

type FormEditorSeed = {
  id: string;
  name: string;
  status: string;
  fields: FormFieldDef[];
};

type ProjectFormEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  formId: string | null;
  /** When provided for the same formId, skip the initial GET (e.g. right after create). */
  seed?: FormEditorSeed | null;
  onSaved: (form: unknown) => void;
};

async function fetchWithNotFoundRetry(input: RequestInfo, init?: RequestInit, attempts = 4) {
  let response: Response | null = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    response = await fetch(input, init);
    if (response.status !== 404 || attempt === attempts - 1) return response;
    await new Promise((resolve) => setTimeout(resolve, 120 * (attempt + 1)));
  }
  return response!;
}

export function ProjectFormEditorDialog({
  open,
  onOpenChange,
  projectId,
  formId,
  seed = null,
  onSaved,
}: ProjectFormEditorDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [name, setName] = useState("");
  const [fields, setFields] = useState<FormFieldDef[]>([]);
  const [status, setStatus] = useState("DRAFT");
  const seedRef = useRef(seed);
  seedRef.current = seed;

  useEffect(() => {
    if (!open || !formId) return;

    let cancelled = false;
    const currentSeed = seedRef.current;

    if (currentSeed && currentSeed.id === formId) {
      setName(currentSeed.name);
      setFields(currentSeed.fields ?? []);
      setStatus(currentSeed.status);
      setLoading(false);
      return;
    }

    setLoading(true);

    void (async () => {
      try {
        const response = await fetchWithNotFoundRetry(
          `/api/projects/${projectId}/forms/${formId}`,
        );
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Failed to load form");
        if (cancelled) return;
        setName(body.form.name);
        setFields(body.form.fields ?? []);
        setStatus(body.form.status);
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Could not load form");
          onOpenChange(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, formId, projectId, onOpenChange]);

  const canEditFields = status === "DRAFT";

  async function handleSave() {
    if (!formId) return;
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (canEditFields && fields.filter(isAnswerableFormField).length === 0) {
      toast.error("Add at least one question");
      return;
    }
    if (canEditFields && fields.some((field) => !field.label.trim())) {
      toast.error("Every field needs a label");
      return;
    }
    if (
      canEditFields &&
      fields.some(
        (field) =>
          (field.type === "select" || field.type === "radio") &&
          (!field.options || field.options.length === 0),
      )
    ) {
      toast.error("Choice fields need at least one option");
      return;
    }

    setSaving(true);
    try {
      const response = await fetchWithNotFoundRetry(`/api/projects/${projectId}/forms/${formId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          ...(canEditFields ? { fields } : {}),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to save");
      onSaved(body.form);
      toast.success("Form saved");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save form");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAsTemplate() {
    if (!name.trim() || fields.filter(isAnswerableFormField).length === 0) {
      toast.error("Name and questions are required to save a template");
      return;
    }
    setSavingTemplate(true);
    try {
      const response = await fetchWithNotFoundRetry("/api/form-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: null,
          fields,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to save template");
      toast.success("Saved as company template");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save template");
    } finally {
      setSavingTemplate(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit form</DialogTitle>
          <DialogDescription>
            {canEditFields
              ? "Change the name and questions before you share the link."
              : "This form is already shared or completed — you can still rename it."}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="form-name">Form name</Label>
                <Input
                  id="form-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Requirements"
                />
              </div>

              <FormFieldsEditor
                fields={fields}
                onChange={setFields}
                disabled={!canEditFields}
              />
            </>
          )}
        </DialogBody>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={loading || savingTemplate || fields.filter(isAnswerableFormField).length === 0}
            onClick={() => void handleSaveAsTemplate()}
          >
            {savingTemplate ? "Saving…" : "Save as template"}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={loading || saving} onClick={() => void handleSave()}>
              {saving ? "Saving…" : "Save form"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
