"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { CustomFieldDefinitionsEditor } from "@/features/settings/components/custom-field-definitions-editor";
import { normalizeCustomFieldDefinitions } from "@/lib/custom-fields";
import type { CustomFieldDefinition } from "@/lib/schemas/custom-fields";

export function CustomFieldsPageContent() {
  const [definitions, setDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/company/custom-fields");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to load custom fields");
      setDefinitions(normalizeCustomFieldDefinitions(body.definitions));
      setDirty(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load custom fields");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch("/api/company/custom-fields", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ definitions }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to save");
      setDefinitions(normalizeCustomFieldDefinitions(body.definitions));
      setDirty(false);
      toast.success("Custom fields saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save custom fields");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Custom fields"
        description="Extra metadata on invoices and estimates — PO numbers, job sites, project codes, and more."
        actions={
          <Button
            className={pageHeaderActionClass}
            onClick={() => void handleSave()}
            disabled={loading || saving || !dirty}
          >
            {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {saving ? "Saving…" : "Save changes"}
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2Icon className="size-5 animate-spin" />
        </div>
      ) : (
        <CustomFieldDefinitionsEditor
          definitions={definitions}
          onChange={(next) => {
            setDefinitions(next);
            setDirty(true);
          }}
          disabled={saving}
        />
      )}
    </>
  );
}
