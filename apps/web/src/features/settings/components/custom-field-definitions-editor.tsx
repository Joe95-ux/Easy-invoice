"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import {
  CalendarIcon,
  CheckSquareIcon,
  GripVerticalIcon,
  HashIcon,
  ListIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  TextCursorInputIcon,
  Trash2Icon,
  TypeIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  CustomFieldFormFields,
  definitionFromDraft,
  draftFromDefinition,
  type CustomFieldFormDraft,
} from "@/features/settings/components/custom-field-form-fields";
import { CUSTOM_FIELD_TYPE_LABELS, MAX_CUSTOM_FIELD_DEFINITIONS } from "@/lib/custom-fields";
import type { CustomFieldDefinition, CustomFieldType } from "@/lib/schemas/custom-fields";
import { cn } from "@/lib/utils";

const FIELD_ICONS: Record<CustomFieldType, ReactNode> = {
  text: <TypeIcon className="size-3.5" />,
  textarea: <TextCursorInputIcon className="size-3.5" />,
  number: <HashIcon className="size-3.5" />,
  date: <CalendarIcon className="size-3.5" />,
  select: <ListIcon className="size-3.5" />,
  checkbox: <CheckSquareIcon className="size-3.5" />,
};

type CustomFieldDefinitionsEditorProps = {
  definitions: CustomFieldDefinition[];
  onChange: (definitions: CustomFieldDefinition[]) => void;
  onEdit: (field: CustomFieldDefinition) => void;
  disabled?: boolean;
};

export function CustomFieldDefinitionsEditor({
  definitions,
  onChange,
  onEdit,
  disabled = false,
}: CustomFieldDefinitionsEditorProps) {
  const [inlineOpen, setInlineOpen] = useState(false);
  const [draft, setDraft] = useState<CustomFieldFormDraft>(() => draftFromDefinition(null));
  const dragIdRef = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  function openInline() {
    if (definitions.length >= MAX_CUSTOM_FIELD_DEFINITIONS) {
      toast.error(`You can add at most ${MAX_CUSTOM_FIELD_DEFINITIONS} custom fields`);
      return;
    }
    setDraft(draftFromDefinition(null));
    setInlineOpen(true);
  }

  function submitInline() {
    const result = definitionFromDraft(draft);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onChange([...definitions, result.definition]);
    setInlineOpen(false);
    setDraft(draftFromDefinition(null));
  }

  function updateField(id: string, patch: Partial<CustomFieldDefinition>) {
    onChange(definitions.map((field) => (field.id === id ? { ...field, ...patch } : field)));
  }

  function removeField(id: string) {
    onChange(definitions.filter((field) => field.id !== id));
  }

  function onHandleDragStart(event: DragEvent, id: string) {
    if (disabled) {
      event.preventDefault();
      return;
    }
    dragIdRef.current = id;
    setDraggingId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  }

  function onDragOverRow(event: DragEvent, index: number) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (!dragIdRef.current) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const after = event.clientY > rect.top + rect.height / 2;
    setDropIndex(after ? index + 1 : index);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    const fromId = dragIdRef.current ?? event.dataTransfer.getData("text/plain");
    const toIndex = dropIndex;
    dragIdRef.current = null;
    setDraggingId(null);
    setDropIndex(null);
    if (!fromId || toIndex == null) return;
    const fromIndex = definitions.findIndex((field) => field.id === fromId);
    if (fromIndex < 0) return;
    let insertAt = toIndex;
    if (fromIndex < insertAt) insertAt -= 1;
    if (insertAt === fromIndex) return;
    const next = [...definitions];
    const [item] = next.splice(fromIndex, 1);
    next.splice(insertAt, 0, item!);
    onChange(next);
  }

  function clearDrag() {
    dragIdRef.current = null;
    setDraggingId(null);
    setDropIndex(null);
  }

  function defaultDisplay(field: CustomFieldDefinition): string {
    const raw = field.defaultValue?.trim();
    if (!raw) return "—";
    if (field.type === "checkbox") return raw === "true" ? "Yes" : "—";
    if (field.type === "select") {
      return field.options?.find((option) => option.value === raw)?.label ?? raw;
    }
    return raw;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card">
        <div className="hidden grid-cols-[1.6fr_7.5rem_6.5rem_4.5rem_5rem_2.25rem] gap-2 border-b border-border/70 bg-muted/25 px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid">
          <span className="pl-7">Name</span>
          <span>Type</span>
          <span>Default</span>
          <span className="text-center">Visible</span>
          <span className="text-center">Required</span>
          <span />
        </div>

        {definitions.length === 0 && !inlineOpen ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No custom fields yet. Add one to capture PO numbers, job sites, and more.
          </div>
        ) : (
          <ul
            className="divide-y divide-border/70"
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                setDropIndex(null);
              }
            }}
          >
            {definitions.map((field, index) => (
              <li key={field.id} className="relative">
                {dropIndex === index ? (
                  <div className="pointer-events-none absolute inset-x-3 top-0 z-10 h-0.5 rounded-full bg-primary" />
                ) : null}
                <div
                  onDragOver={(event) => onDragOverRow(event, index)}
                  onDrop={onDrop}
                  className={cn(
                    "grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-2.5 px-3 py-3 transition-colors sm:grid-cols-[1.6fr_7.5rem_6.5rem_4.5rem_5rem_2.25rem] sm:gap-2",
                    draggingId === field.id && "bg-muted/40 opacity-60",
                    field.enabled === false && "bg-muted/20",
                  )}
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <button
                      type="button"
                      draggable={!disabled}
                      onDragStart={(event) => onHandleDragStart(event, field.id)}
                      onDragEnd={clearDrag}
                      className="mt-0.5 inline-flex size-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Drag to reorder ${field.label || "field"}`}
                      disabled={disabled}
                    >
                      <GripVerticalIcon className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="min-w-0 text-left"
                      onClick={() => onEdit(field)}
                      disabled={disabled}
                    >
                      <p className="truncate text-sm font-medium text-foreground hover:underline">
                        {field.label || "Untitled field"}
                      </p>
                      {field.description?.trim() ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {field.description}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-muted-foreground/70 sm:hidden">
                          {CUSTOM_FIELD_TYPE_LABELS[field.type]}
                        </p>
                      )}
                    </button>
                  </div>

                  <div className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
                    <span className="text-muted-foreground/80">{FIELD_ICONS[field.type]}</span>
                    <span className="truncate">{CUSTOM_FIELD_TYPE_LABELS[field.type]}</span>
                  </div>

                  <p className="hidden truncate text-sm text-muted-foreground sm:block">
                    {defaultDisplay(field)}
                  </p>

                  <div className="hidden items-center justify-center sm:flex">
                    <Switch
                      size="sm"
                      checked={field.enabled !== false}
                      disabled={disabled}
                      onCheckedChange={(checked) =>
                        updateField(field.id, { enabled: checked === true })
                      }
                      aria-label={`Visible: ${field.label}`}
                    />
                  </div>

                  <div className="hidden items-center justify-center sm:flex">
                    <Switch
                      size="sm"
                      checked={field.required}
                      disabled={disabled}
                      onCheckedChange={(checked) =>
                        updateField(field.id, { required: checked === true })
                      }
                      aria-label={`Required: ${field.label}`}
                    />
                  </div>

                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Field actions"
                        disabled={disabled}
                      >
                        <MoreHorizontalIcon className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-40">
                        <DropdownMenuItem onClick={() => onEdit(field)}>
                          <PencilIcon className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => removeField(field.id)}
                        >
                          <Trash2Icon className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="col-span-2 flex items-center gap-4 border-t border-border/50 pt-2.5 sm:hidden">
                    <label className="flex flex-1 items-center justify-between gap-2 text-xs text-muted-foreground">
                      Visible
                      <Switch
                        size="sm"
                        checked={field.enabled !== false}
                        disabled={disabled}
                        onCheckedChange={(checked) =>
                          updateField(field.id, { enabled: checked === true })
                        }
                      />
                    </label>
                    <label className="flex flex-1 items-center justify-between gap-2 text-xs text-muted-foreground">
                      Required
                      <Switch
                        size="sm"
                        checked={field.required}
                        disabled={disabled}
                        onCheckedChange={(checked) =>
                          updateField(field.id, { required: checked === true })
                        }
                      />
                    </label>
                  </div>
                </div>
                {dropIndex === definitions.length && index === definitions.length - 1 ? (
                  <div className="pointer-events-none absolute inset-x-3 bottom-0 z-10 h-0.5 rounded-full bg-primary" />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {inlineOpen ? (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Add a custom field</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Captures extra details on invoices and estimates.
              </p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 shrink-0"
              onClick={() => setInlineOpen(false)}
              aria-label="Close"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
          <CustomFieldFormFields
            draft={draft}
            onChange={setDraft}
            disabled={disabled}
            compact
            idPrefix="inline-new"
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => setInlineOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={disabled} onClick={submitInline}>
              Create field
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || definitions.length >= MAX_CUSTOM_FIELD_DEFINITIONS}
          onClick={openInline}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border/90 bg-muted/10 px-4 py-3.5 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/25 hover:bg-muted/30 hover:text-foreground disabled:opacity-50"
        >
          <PlusIcon className="size-4" />
          Add a custom field
        </button>
      )}
    </div>
  );
}
