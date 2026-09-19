"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeftIcon,
  EyeIcon,
  GripVerticalIcon,
  LayoutTemplateIcon,
  Loader2Icon,
  MenuIcon,
  PanelRightIcon,
  SaveIcon,
  SendIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BuilderInspector } from "@/features/projects/components/advanced-form-builder/builder-inspector";
import { BuilderTemplatesDialog } from "@/features/projects/components/advanced-form-builder/builder-templates-dialog";
import {
  buildFormField,
  cloneFieldsWithNewIds,
  countAnswerable,
  ensureBuilderSections,
  FIELD_LIBRARY,
  groupFieldsForBuilder,
  insertFieldAfter,
  insertFieldAtSectionEnd,
  isHalfWidthField,
  moveFieldInList,
  placeholderForField,
} from "@/features/projects/lib/form-field-factory";
import { useIsMobile } from "@/hooks/use-mobile";
import { newFormFieldId } from "@/lib/project-form-ids";
import {
  groupFormFieldsIntoSections,
  isAnswerableFormField,
  type FormFieldDef,
  type FormFieldType,
} from "@/lib/schemas/project-form";
import { cn } from "@/lib/utils";

const DRAG_MIME = "application/x-form-field-id";
/** Matches Tailwind `xl` — inspector docks at this width. */
const INSPECTOR_DOCK_MIN = 1280;

type AdvancedFormBuilderProps = {
  projectId: string;
  projectName: string;
  formId: string;
  initialName: string;
  initialStatus: string;
  initialFields: FormFieldDef[];
  initialPublicToken?: string | null;
  templateName?: string | null;
};

export function AdvancedFormBuilder({
  projectId,
  projectName,
  formId,
  initialName,
  initialStatus,
  initialFields,
  initialPublicToken = null,
  templateName = null,
}: AdvancedFormBuilderProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const bootstrapped = ensureBuilderSections(initialFields);
  const [name, setName] = useState(initialName);
  const [fields, setFields] = useState<FormFieldDef[]>(bootstrapped.fields);
  const [status, setStatus] = useState(initialStatus);
  const [publicToken, setPublicToken] = useState<string | null>(initialPublicToken);
  const [selectedId, setSelectedId] = useState<string | null>(
    () =>
      bootstrapped.fields.find((field) => field.type !== "section")?.id ??
      bootstrapped.fields[0]?.id ??
      null,
  );
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [dirty, setDirty] = useState(bootstrapped.changed);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [leftOpen, setLeftOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: "before" | "after" } | null>(
    null,
  );
  const canvasRef = useRef<HTMLDivElement>(null);
  const draggingIdRef = useRef<string | null>(null);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  const canEdit = status === "DRAFT";
  const selected = fields.find((field) => field.id === selectedId) ?? null;
  const sections = useMemo(() => groupFieldsForBuilder(fields), [fields]);
  const answerableCount = countAnswerable(fields);
  const sectionCount = fields.filter((field) => field.type === "section").length;

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const markDirty = useCallback((next: FormFieldDef[]) => {
    setFields(next);
    setDirty(true);
    setSaveState("idle");
  }, []);

  async function persist(options?: { silent?: boolean }) {
    if (!name.trim()) {
      if (!options?.silent) toast.error("Form name is required");
      return false;
    }
    if (canEdit && fields.filter(isAnswerableFormField).length === 0) {
      if (!options?.silent) toast.error("Add at least one question");
      return false;
    }
    if (canEdit && fields.some((field) => !field.label.trim())) {
      if (!options?.silent) toast.error("Every field needs a label");
      return false;
    }
    if (
      canEdit &&
      fields.some(
        (field) =>
          (field.type === "select" || field.type === "radio") &&
          (!field.options || field.options.length === 0),
      )
    ) {
      if (!options?.silent) toast.error("Choice fields need at least one option");
      return false;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/forms/${formId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          ...(canEdit ? { fields } : {}),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to save");
      setDirty(false);
      setSaveState("saved");
      if (!options?.silent) toast.success("Form saved");
      router.refresh();
      return true;
    } catch (error) {
      setSaveState("error");
      if (!options?.silent) {
        toast.error(error instanceof Error ? error.message : "Could not save form");
      }
      return false;
    } finally {
      setSaving(false);
    }
  }

  function shouldOpenInspectorSheet() {
    if (typeof window === "undefined") return isMobile;
    return window.innerWidth < INSPECTOR_DOCK_MIN;
  }

  function selectField(id: string) {
    setSelectedId(id);
    if (shouldOpenInspectorSheet()) setInspectorOpen(true);
  }

  function updateSelected(patch: Partial<FormFieldDef>) {
    if (!selectedId || !canEdit) return;
    markDirty(
      fields.map((field) => (field.id === selectedId ? { ...field, ...patch } : field)),
    );
  }

  function addField(type: FormFieldType, sectionId?: string) {
    if (!canEdit) return;
    if (fields.length >= 60) {
      toast.error("Forms can have at most 60 fields");
      return;
    }
    const field = buildFormField(type);
    let next: FormFieldDef[];
    if (sectionId) {
      next = insertFieldAtSectionEnd(fields, sectionId, field);
    } else if (selectedId) {
      next = insertFieldAfter(fields, selectedId, field);
    } else {
      next = [...fields, field];
    }
    markDirty(next);
    setSelectedId(field.id);
    setLeftOpen(false);
    if (shouldOpenInspectorSheet()) setInspectorOpen(true);
  }

  function duplicateSelected() {
    if (!selected || !canEdit) return;
    const copy: FormFieldDef = {
      ...selected,
      id: newFormFieldId(),
      label: `${selected.label} copy`,
      options: selected.options?.map((option) => ({
        ...option,
        value: newFormFieldId(),
      })),
    };
    markDirty(insertFieldAfter(fields, selected.id, copy));
    setSelectedId(copy.id);
  }

  function deleteSelected() {
    if (!selectedId || !canEdit) return;
    const target = fields.find((field) => field.id === selectedId);
    if (
      target &&
      target.type !== "section" &&
      countAnswerable(fields) <= 1
    ) {
      toast.error("Keep at least one question on the form");
      return;
    }
    const index = fields.findIndex((field) => field.id === selectedId);
    const next = fields.filter((field) => field.id !== selectedId);
    markDirty(next);
    const fallback = next[Math.max(0, index - 1)] ?? next[0] ?? null;
    setSelectedId(fallback?.id ?? null);
    setInspectorOpen(false);
  }

  function focusSection(sectionId: string) {
    if (sectionId !== "__intro__") selectField(sectionId);
    const el = canvasRef.current?.querySelector(`[data-section-id="${sectionId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    setLeftOpen(false);
  }

  function onFieldDragStart(event: DragEvent, id: string) {
    if (!canEdit) return;
    event.dataTransfer.setData(DRAG_MIME, id);
    event.dataTransfer.effectAllowed = "move";
    draggingIdRef.current = id;
    setDraggingId(id);
  }

  function onFieldDragOver(event: DragEvent, id: string) {
    const activeId = draggingIdRef.current;
    if (!activeId || activeId === id) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const position = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
    setDropTarget((current) =>
      current?.id === id && current.position === position ? current : { id, position },
    );
  }

  function onFieldDrop(event: DragEvent, id: string) {
    event.preventDefault();
    const activeId =
      draggingIdRef.current ||
      event.dataTransfer.getData(DRAG_MIME) ||
      event.dataTransfer.getData("text/plain");
    const target = dropTarget?.id === id ? dropTarget : { id, position: "after" as const };
    draggingIdRef.current = null;
    setDraggingId(null);
    setDropTarget(null);
    if (!canEdit || !activeId || activeId === id) return;
    markDirty(moveFieldInList(fields, activeId, target.id, target.position));
  }

  function onDragEnd() {
    draggingIdRef.current = null;
    setDraggingId(null);
    setDropTarget(null);
  }

  async function copyShareLink(token: string) {
    const url = `${window.location.origin}/f/${token}`;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied");
    } else {
      toast.success("Form shared", { description: url });
    }
  }

  async function handleShare() {
    if (status === "SENT" && publicToken) {
      await copyShareLink(publicToken);
      return;
    }
    if (status === "COMPLETED" || status === "CANCELLED") return;

    const saved = await persist({ silent: true });
    if (!saved) return;
    setSharing(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/forms/${formId}/share`, {
        method: "POST",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to share");
      setStatus(body.form?.status ?? "SENT");
      const token = (body.form?.publicToken as string | undefined) ?? null;
      setPublicToken(token);
      if (token) await copyShareLink(token);
      else toast.success("Form shared");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not share form");
    } finally {
      setSharing(false);
    }
  }

  function handleBack() {
    if (dirty && !window.confirm("You have unsaved changes. Leave without saving?")) {
      return;
    }
    router.push(`/projects/${projectId}`);
  }

  const leftPanel = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <p className="px-2 pb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Outline
        </p>
        <div className="space-y-0.5">
          {sections.map((section) => {
            const active =
              selectedId === section.id ||
              (section.id !== "__intro__" &&
                section.fields.some((field) => field.id === selectedId));
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => focusSection(section.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition-colors",
                  active
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <GripVerticalIcon className="size-3.5 shrink-0 opacity-40" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-medium">{section.title}</span>
                <span className="tabular-nums text-[10px] text-muted-foreground">
                  {section.fields.length}
                </span>
              </button>
            );
          })}
        </div>

        <div className="my-3 h-px bg-border" />

        <p className="px-2 pb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Add field
        </p>
        <div className="space-y-0.5">
          {FIELD_LIBRARY.map((item) => (
            <button
              key={item.type}
              type="button"
              disabled={!canEdit}
              onClick={() => addField(item.type)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-xs transition-colors",
                "text-muted-foreground hover:bg-muted/60 hover:text-foreground disabled:opacity-50",
              )}
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded border border-border text-[10px] text-muted-foreground">
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="my-3 h-px bg-border" />

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mx-2 mb-2 w-[calc(100%-1rem)] justify-start gap-2"
          disabled={!canEdit}
          onClick={() => setTemplatesOpen(true)}
        >
          <LayoutTemplateIcon className="size-3.5" />
          Templates
        </Button>
      </div>
    </div>
  );

  const inspector = (
    <BuilderInspector
      field={selected}
      disabled={!canEdit}
      onChange={updateSelected}
      onDuplicate={duplicateSelected}
      onDelete={deleteSelected}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 lg:hidden"
            onClick={() => setLeftOpen(true)}
            aria-label="Open outline"
          >
            <MenuIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={handleBack}
            aria-label="Back to project"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <div className="min-w-0">
            <input
              value={name}
              disabled={status === "CANCELLED" || status === "COMPLETED"}
              onChange={(event) => {
                setName(event.target.value);
                setDirty(true);
                setSaveState("idle");
              }}
              className="w-full truncate bg-transparent text-sm font-semibold tracking-tight outline-none placeholder:text-muted-foreground"
              placeholder="Form name"
            />
            <p className="truncate text-[11px] text-muted-foreground">
              {projectName}
              {templateName ? ` · ${templateName}` : ""}
            </p>
          </div>
          {templateName ? (
            <Badge variant="secondary" className="hidden shrink-0 font-normal sm:inline-flex">
              Template
            </Badge>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <span className="hidden text-[11px] text-muted-foreground md:inline">
            {saveState === "saved" && !dirty
              ? "Saved"
              : dirty
                ? "Unsaved changes"
                : saving
                  ? "Saving…"
                  : null}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 xl:hidden"
            onClick={() => setInspectorOpen(true)}
            aria-label="Field settings"
          >
            <PanelRightIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden h-8 sm:inline-flex"
            onClick={() => setPreviewOpen(true)}
          >
            <EyeIcon className="size-3.5" />
            Preview
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            disabled={saving}
            onClick={() => void persist()}
          >
            {saving ? <Loader2Icon className="size-3.5 animate-spin" /> : <SaveIcon className="size-3.5" />}
            <span className="hidden sm:inline">Save</span>
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8"
            disabled={
              sharing ||
              status === "COMPLETED" ||
              status === "CANCELLED" ||
              (canEdit && answerableCount === 0)
            }
            onClick={() => void handleShare()}
          >
            {sharing ? <Loader2Icon className="size-3.5 animate-spin" /> : <SendIcon className="size-3.5" />}
            <span className="hidden sm:inline">
              {status === "SENT" ? "Copy link" : "Share"}
            </span>
          </Button>
        </div>
      </header>

      {!canEdit ? (
        <div className="border-b border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
          This form is {status === "SENT" ? "shared" : status.toLowerCase()} — questions are locked.
          You can still rename it and preview.
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[236px_minmax(0,1fr)_300px]">
        <aside className="hidden min-h-0 border-r border-border bg-muted/20 lg:block">
          {leftPanel}
        </aside>

        <main ref={canvasRef} className="min-h-0 overflow-y-auto">
          <div className="mx-auto w-full max-w-[820px] px-4 py-6 sm:px-8 sm:py-8">
            <header className="pb-6">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.7rem]">
                {name.trim() || "Untitled form"}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Collect the information, files, and decisions needed before work begins.
              </p>
            </header>

            {sections.map((section) => (
              <section
                key={section.id}
                data-section-id={section.id}
                className="grid gap-4 border-t border-border py-6 sm:gap-8 lg:grid-cols-[160px_minmax(0,1fr)] xl:grid-cols-[180px_minmax(0,1fr)]"
              >
                <button
                  type="button"
                  onClick={() => {
                    if (section.id !== "__intro__") selectField(section.id);
                  }}
                  className={cn(
                    "min-w-0 rounded-lg border border-transparent p-2 text-left transition-colors",
                    section.id !== "__intro__" && selectedId === section.id
                      ? "border-primary/40 bg-primary/5"
                      : section.id !== "__intro__"
                        ? "hover:border-border hover:bg-muted/30"
                        : null,
                  )}
                >
                  <h2 className="text-sm font-semibold tracking-tight">{section.title}</h2>
                  {section.description ? (
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {section.description}
                    </p>
                  ) : null}
                </button>

                <div className="min-w-0">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5">
                    {section.fields.map((field) => {
                      const full = !isHalfWidthField(field.type);
                      const selectedField = field.id === selectedId;
                      const dropBefore =
                        dropTarget?.id === field.id && dropTarget.position === "before";
                      const dropAfter =
                        dropTarget?.id === field.id && dropTarget.position === "after";

                      return (
                        <div
                          key={field.id}
                          draggable={canEdit}
                          onDragStart={(event) => onFieldDragStart(event, field.id)}
                          onDragOver={(event) => onFieldDragOver(event, field.id)}
                          onDrop={(event) => onFieldDrop(event, field.id)}
                          onDragEnd={onDragEnd}
                          onClick={() => selectField(field.id)}
                          className={cn(
                            "group relative cursor-pointer rounded-lg border border-transparent p-2 transition-colors",
                            full && "sm:col-span-2",
                            selectedField && "border-primary/40 bg-primary/5",
                            !selectedField && "hover:border-border hover:bg-muted/30",
                            draggingId === field.id && "opacity-40",
                            dropBefore && "border-t-2 border-t-primary",
                            dropAfter && "border-b-2 border-b-primary",
                          )}
                        >
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <span className="text-[11px] font-medium text-muted-foreground">
                              {field.label}
                              {field.required ? (
                                <span className="text-destructive"> *</span>
                              ) : null}
                            </span>
                            <GripVerticalIcon
                              className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                              aria-hidden
                            />
                          </div>
                          <FieldPreview field={field} />
                        </div>
                      );
                    })}
                  </div>

                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => addField("text", section.id)}
                      className="mt-3 flex h-9 w-full items-center justify-center rounded-lg border border-dashed border-border text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                    >
                      + Add field
                    </button>
                  ) : null}
                </div>
              </section>
            ))}

            {sections.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-16 text-center">
                <p className="text-sm font-medium">Start building</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add a section or question from the library.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button type="button" size="sm" onClick={() => addField("section")}>
                    Add section
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => addField("text")}>
                    Add question
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setTemplatesOpen(true)}
                  >
                    Use template
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="sticky bottom-0 mt-8 border-t border-border bg-gradient-to-t from-background via-background to-transparent pt-4 pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>Client view mirrors this structure without builder controls.</span>
                <span className="font-medium tabular-nums">
                  {answerableCount} field{answerableCount === 1 ? "" : "s"}
                  {sectionCount > 0 ? ` · ${sectionCount} section${sectionCount === 1 ? "" : "s"}` : ""}
                </span>
              </div>
            </div>
          </div>
        </main>

        <aside className="hidden min-h-0 border-l border-border bg-muted/10 xl:block">
          {inspector}
        </aside>
      </div>

      <Sheet open={leftOpen} onOpenChange={setLeftOpen}>
        <SheetContent side="left" className="w-[min(20rem,100vw)] p-0">
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle>Outline & fields</SheetTitle>
          </SheetHeader>
          {leftPanel}
        </SheetContent>
      </Sheet>

      <Sheet open={inspectorOpen} onOpenChange={setInspectorOpen}>
        <SheetContent side="right" className="w-[min(22rem,100vw)] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Field settings</SheetTitle>
          </SheetHeader>
          {inspector}
        </SheetContent>
      </Sheet>

      <BuilderTemplatesDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        onApply={(nextFields, templateLabel) => {
          if (!canEdit) return;
          if (
            answerableCount > 0 &&
            !window.confirm(`Replace the current fields with “${templateLabel}”?`)
          ) {
            return;
          }
          const applied = ensureBuilderSections(cloneFieldsWithNewIds(nextFields)).fields;
          markDirty(applied);
          setSelectedId(
            applied.find((field) => field.type !== "section")?.id ?? applied[0]?.id ?? null,
          );
          toast.success(`Applied “${templateLabel}”`);
        }}
      />

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Client preview</DialogTitle>
            <DialogDescription>
              Approximate public fill layout. Sharing unlocks the real link.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-6">
            {groupFormFieldsIntoSections(fields).map((section) => (
              <div key={section.id} className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold">{section.title}</h3>
                  {section.description ? (
                    <p className="mt-1 text-xs text-muted-foreground">{section.description}</p>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {section.fields.map((field) => (
                    <div
                      key={field.id}
                      className={cn(!isHalfWidthField(field.type) && "sm:col-span-2")}
                    >
                      <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                        {field.label}
                        {field.required ? <span className="text-destructive"> *</span> : null}
                      </p>
                      <FieldPreview field={field} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FieldPreview({ field }: { field: FormFieldDef }) {
  if (field.type === "radio") {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {(field.options ?? []).slice(0, 3).map((option) => (
          <div
            key={option.value}
            className="min-h-14 rounded-md border border-border bg-muted/20 px-2.5 py-2"
          >
            <p className="text-[11px] font-medium">{option.label}</p>
            {option.description ? (
              <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                {option.description}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-muted/20 px-3 py-2.5 text-[11px] text-muted-foreground",
        field.type === "textarea" || field.type === "images" ? "min-h-20" : "min-h-10",
      )}
    >
      {placeholderForField(field)}
    </div>
  );
}
