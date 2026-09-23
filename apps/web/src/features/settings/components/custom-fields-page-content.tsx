"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { CustomFieldDefinitionsEditor } from "@/features/settings/components/custom-field-definitions-editor";
import { CustomFieldDrawer } from "@/features/settings/components/custom-field-drawer";
import {
  CustomFieldsDocsDrawer,
  CustomFieldsDocsTrigger,
} from "@/features/settings/components/custom-fields-docs";
import { CustomFieldsInvoicePreview } from "@/features/settings/components/custom-fields-invoice-preview";
import {
  firstCustomFieldDefinitionsError,
  MAX_CUSTOM_FIELD_DEFINITIONS,
  normalizeCustomFieldDefinitions,
  customFieldMergeTagKey,
} from "@/lib/custom-fields";
import {
  updateCustomFieldDefinitionsSchema,
  type CustomFieldDefinition,
} from "@/lib/schemas/custom-fields";
import { cn } from "@/lib/utils";

export function CustomFieldsPageContent() {
  const [definitions, setDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [editing, setEditing] = useState<CustomFieldDefinition | null>(null);
  const [mainTab, setMainTab] = useState<"fields" | "usage">("fields");
  const definitionsRef = useRef(definitions);
  definitionsRef.current = definitions;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const dirtyGenerationRef = useRef(0);

  const bumpDirty = useCallback(() => {
    dirtyGenerationRef.current += 1;
    setDirty(true);
    setSaveState("idle");
  }, []);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/company/custom-fields");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to load custom fields");
      setDefinitions(normalizeCustomFieldDefinitions(body.definitions));
      setDirty(false);
      setSaveState("idle");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load custom fields");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const persist = useCallback(
    async (next: CustomFieldDefinition[], options?: { silent?: boolean }) => {
      const parsed = updateCustomFieldDefinitionsSchema.safeParse({ definitions: next });
      if (!parsed.success) {
        toast.error(firstCustomFieldDefinitionsError(parsed.error));
        setSaveState("error");
        return false;
      }

      const generation = dirtyGenerationRef.current;
      setSaving(true);
      try {
        const response = await fetch("/api/company/custom-fields", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ definitions: parsed.data.definitions }),
        });
        const body = await response.json();
        if (!response.ok) {
          const detailMessage =
            Array.isArray(body.details) && body.details[0]?.message
              ? String(body.details[0].message)
              : null;
          throw new Error(detailMessage ?? body.error ?? "Failed to save");
        }
        const normalized = normalizeCustomFieldDefinitions(body.definitions);
        // Only apply server state if nothing newer was edited while saving.
        if (dirtyGenerationRef.current === generation) {
          setDefinitions(normalized);
          setDirty(false);
          setSaveState("saved");
        } else {
          setSaveState("idle");
        }
        if (!options?.silent) toast.success("Custom fields saved");
        return true;
      } catch (error) {
        setSaveState("error");
        toast.error(error instanceof Error ? error.message : "Could not save custom fields");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!dirty || loading) return;
    const timer = window.setTimeout(() => {
      void persist(definitionsRef.current, { silent: true });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [dirty, loading, persist, definitions]);

  // Quiet retry after a failed autosave when the form is still dirty.
  useEffect(() => {
    if (saveState !== "error" || !dirty || loading || saving) return;
    const timer = window.setTimeout(() => {
      void persist(definitionsRef.current, { silent: true });
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [saveState, dirty, loading, saving, persist]);

  function applyLocal(next: CustomFieldDefinition[]) {
    setDefinitions(next);
    bumpDirty();
  }

  function handleDrawerSubmit(definition: CustomFieldDefinition) {
    if (editing) {
      applyLocal(
        definitions.map((field) => (field.id === editing.id ? definition : field)),
      );
    } else {
      if (definitions.length >= MAX_CUSTOM_FIELD_DEFINITIONS) {
        toast.error(`You can add at most ${MAX_CUSTOM_FIELD_DEFINITIONS} custom fields`);
        return;
      }
      applyLocal([...definitions, definition]);
    }
    setEditing(null);
  }

  const saveHint =
    saving
      ? "Saving…"
      : saveState === "saved" && !dirty
        ? "Saved"
        : dirty
          ? "Unsaved"
          : saveState === "error"
            ? "Save failed"
            : null;

  const atLimit = definitions.length >= MAX_CUSTOM_FIELD_DEFINITIONS;

  return (
    <>
      <PageHeader
        title="Custom fields"
        description="Add and manage custom fields to capture additional information on your invoices and estimates."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {saveHint ? (
              <span
                className={cn(
                  "text-center text-xs sm:text-right",
                  saveState === "error"
                    ? "text-destructive"
                    : dirty
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-muted-foreground",
                )}
              >
                {saveHint}
              </span>
            ) : null}
            <CustomFieldsDocsTrigger onClick={() => setDocsOpen(true)} />
            <Button
              className={pageHeaderActionClass}
              disabled={loading || atLimit}
              onClick={() => {
                if (atLimit) {
                  toast.error(
                    `You can add at most ${MAX_CUSTOM_FIELD_DEFINITIONS} custom fields`,
                  );
                  return;
                }
                setEditing(null);
                setDrawerOpen(true);
              }}
            >
              <PlusIcon className="size-4" />
              Add field
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2Icon className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)] lg:items-start xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="min-w-0 space-y-4">
            <div
              className="grid h-9 max-w-48 grid-cols-2 gap-0.5 rounded-lg border border-border p-0.5"
              role="group"
              aria-label="Custom fields view"
            >
              {(
                [
                  { id: "fields" as const, label: "Fields" },
                  { id: "usage" as const, label: "Usage" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMainTab(tab.id)}
                  className={cn(
                    "rounded-md text-sm font-medium transition-colors",
                    mainTab === tab.id
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {mainTab === "fields" ? (
              <CustomFieldDefinitionsEditor
                definitions={definitions}
                onChange={applyLocal}
                onEdit={(field) => {
                  setEditing(field);
                  setDrawerOpen(true);
                }}
              />
            ) : (
              <UsagePanel definitions={definitions} />
            )}
          </div>

          <aside className="min-h-88 lg:sticky lg:top-4 lg:min-h-112 lg:self-start">
            <CustomFieldsInvoicePreview
              definitions={definitions}
              className="min-h-88 lg:min-h-112"
            />
          </aside>
        </div>
      )}

      <CustomFieldDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setEditing(null);
        }}
        field={editing}
        onSubmit={handleDrawerSubmit}
      />

      <CustomFieldsDocsDrawer open={docsOpen} onOpenChange={setDocsOpen} />
    </>
  );
}

function UsagePanel({ definitions }: { definitions: CustomFieldDefinition[] }) {
  const enabled = definitions.filter((field) => field.enabled !== false);
  const invoices = enabled.filter((field) => field.appliesTo.includes("invoice"));
  const estimates = enabled.filter((field) => field.appliesTo.includes("estimate"));
  const onPdf = enabled.filter((field) => field.showOnPdf !== false);
  const disabledCount = definitions.filter((field) => field.enabled === false).length;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/80 bg-card px-4 py-5 text-sm">
        <p className="font-medium text-foreground">Where fields appear</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Counts include enabled fields only.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          <UsageStat label="Invoices" value={invoices.length} />
          <UsageStat label="Estimates" value={estimates.length} />
          <UsageStat label="On PDF" value={onPdf.length} />
          <UsageStat label="Disabled" value={disabledCount} />
        </ul>
      </div>

      {definitions.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground">
          Add a field to see where it will show up.
        </p>
      ) : (
        <ul className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border/80 bg-card">
          {definitions.map((field) => {
            const mergeTag = `{{${customFieldMergeTagKey(field)}}}`;
            return (
              <li key={field.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {field.label || "Untitled field"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[
                      field.appliesTo.includes("invoice") ? "Invoices" : null,
                      field.appliesTo.includes("estimate") ? "Estimates" : null,
                      field.showOnPdf !== false ? "PDF" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Hidden from documents"}
                  </p>
                  <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                    Merge tag:{" "}
                    <span className="rounded bg-muted/60 px-1 py-0.5 text-foreground/80">
                      {mergeTag}
                    </span>
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                    field.enabled === false
                      ? "bg-muted text-muted-foreground"
                      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                  )}
                >
                  {field.enabled === false ? "Off" : "On"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function UsageStat({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums text-foreground">{value}</span>
    </li>
  );
}
