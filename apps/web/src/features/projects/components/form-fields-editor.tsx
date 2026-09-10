"use client";

import { useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { newFormFieldId } from "@/lib/project-form-ids";
import type { FormFieldDef, FormFieldType } from "@/lib/schemas/project-form";
import { cn } from "@/lib/utils";

const FIELD_TYPES: Array<{ value: FormFieldType; label: string }> = [
  { value: "section", label: "Section" },
  { value: "text", label: "Short text" },
  { value: "email", label: "Email" },
  { value: "url", label: "URL" },
  { value: "date", label: "Date" },
  { value: "textarea", label: "Long text" },
  { value: "select", label: "Dropdown" },
  { value: "radio", label: "Choice cards" },
  { value: "images", label: "Images" },
];

type FormFieldsEditorProps = {
  fields: FormFieldDef[];
  onChange: (fields: FormFieldDef[]) => void;
  disabled?: boolean;
};

function defaultOptions() {
  return [
    { value: "option_a", label: "Option A" },
    { value: "option_b", label: "Option B" },
  ];
}

function buildField(type: FormFieldType): FormFieldDef {
  const base: FormFieldDef = {
    id: newFormFieldId(),
    type,
    label: type === "section" ? "New section" : "New question",
    required: false,
  };
  if (type === "select" || type === "radio") {
    base.options = defaultOptions();
  }
  if (type === "images") {
    base.maxFiles = 8;
  }
  if (type === "section") {
    base.description = "Short description for this section";
  }
  return base;
}

export function FormFieldsEditor({
  fields,
  onChange,
  disabled = false,
}: FormFieldsEditorProps) {
  /** Insert new items after this index; null = append at end. */
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null);

  function updateField(index: number, patch: Partial<FormFieldDef>) {
    onChange(fields.map((field, i) => (i === index ? { ...field, ...patch } : field)));
  }

  function removeField(index: number) {
    onChange(fields.filter((_, i) => i !== index));
    setInsertAfterIndex((current) => {
      if (current == null) return current;
      if (current === index) return null;
      if (current > index) return current - 1;
      return current;
    });
  }

  function addField(type: FormFieldType = "text") {
    const next = buildField(type);
    if (insertAfterIndex == null || insertAfterIndex < 0 || insertAfterIndex >= fields.length) {
      onChange([...fields, next]);
      setInsertAfterIndex(fields.length);
      return;
    }
    const copy = [...fields];
    copy.splice(insertAfterIndex + 1, 0, next);
    onChange(copy);
    setInsertAfterIndex(insertAfterIndex + 1);
  }

  function changeType(index: number, type: FormFieldType) {
    const field = fields[index]!;
    const patch: Partial<FormFieldDef> = { type };
    if (type === "section") {
      patch.required = false;
      patch.options = undefined;
      patch.maxFiles = undefined;
      if (!field.description) patch.description = "Short description for this section";
    } else if (type === "select" || type === "radio") {
      patch.options = field.options?.length ? field.options : defaultOptions();
      patch.maxFiles = undefined;
    } else if (type === "images") {
      patch.options = undefined;
      patch.maxFiles = field.maxFiles ?? 8;
    } else {
      patch.options = undefined;
      patch.maxFiles = undefined;
    }
    updateField(index, patch);
  }

  function moveField(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    moveFieldToPosition(index, target);
  }

  /** Move field at `from` to 0-based index `to`. */
  function moveFieldToPosition(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= fields.length || to >= fields.length) {
      return;
    }
    const next = [...fields];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    onChange(next);
    setInsertAfterIndex(to);
  }

  function updateOption(
    fieldIndex: number,
    optionIndex: number,
    patch: { label?: string; description?: string },
  ) {
    const field = fields[fieldIndex]!;
    const options = [...(field.options ?? [])];
    const current = options[optionIndex];
    if (!current) return;
    options[optionIndex] = {
      ...current,
      ...patch,
      value: patch.label !== undefined ? slugValue(patch.label, optionIndex) : current.value,
    };
    updateField(fieldIndex, { options });
  }

  function addOption(fieldIndex: number) {
    const field = fields[fieldIndex]!;
    const options = [...(field.options ?? [])];
    const n = options.length + 1;
    options.push({ value: `option_${n}`, label: `Option ${n}` });
    updateField(fieldIndex, { options });
  }

  function removeOption(fieldIndex: number, optionIndex: number) {
    const field = fields[fieldIndex]!;
    const options = (field.options ?? []).filter((_, i) => i !== optionIndex);
    updateField(fieldIndex, { options });
  }

  const positionItems = fields.map((_, index) => ({
    value: String(index + 1),
    label: `Position ${index + 1}`,
  }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <Label>Questions</Label>
          {!disabled && fields.length > 0 ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {insertAfterIndex == null
                ? "New items append at the end. Select a row to insert below it."
                : `New items insert below #${insertAfterIndex + 1}.`}
            </p>
          ) : null}
        </div>
        {!disabled ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => addField("section")}>
              <PlusIcon className="size-4" />
              Section
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => addField("text")}>
              <PlusIcon className="size-4" />
              Field
            </Button>
          </div>
        ) : null}
      </div>

      {fields.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          No fields yet.
        </p>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => {
            const isSection = field.type === "section";
            const selected = insertAfterIndex === index;
            return (
              <div
                key={field.id}
                role="button"
                tabIndex={0}
                onClick={() => !disabled && setInsertAfterIndex(index)}
                onKeyDown={(event) => {
                  if (disabled) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setInsertAfterIndex(index);
                  }
                }}
                className={cn(
                  "space-y-3 rounded-lg border p-3 text-left outline-none transition-colors",
                  isSection && "border-dashed bg-muted/20",
                  selected && "border-primary ring-1 ring-primary/40",
                  !disabled && "cursor-pointer",
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_9rem]">
                    <Input
                      value={field.label}
                      disabled={disabled}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => updateField(index, { label: event.target.value })}
                      placeholder={isSection ? "Section title" : "Question label"}
                    />
                    <Select
                      value={field.type}
                      disabled={disabled}
                      onValueChange={(value) => value && changeType(index, value as FormFieldType)}
                      items={FIELD_TYPES}
                    >
                      <SelectTrigger
                        className="text-foreground"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <SelectValue>
                          {FIELD_TYPES.find((type) => type.value === field.type)?.label ??
                            field.type}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {!disabled ? (
                    <div
                      className="flex shrink-0 flex-col items-center gap-0.5"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        disabled={index === 0}
                        onClick={() => moveField(index, -1)}
                        aria-label="Move field up"
                      >
                        <ArrowUpIcon className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        disabled={index === fields.length - 1}
                        onClick={() => moveField(index, 1)}
                        aria-label="Move field down"
                      >
                        <ArrowDownIcon className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={() => removeField(index)}
                        aria-label="Remove field"
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                      <Select
                        value={String(index + 1)}
                        onValueChange={(value) => {
                          if (!value) return;
                          moveFieldToPosition(index, Number(value) - 1);
                        }}
                        items={positionItems}
                      >
                        <SelectTrigger
                          size="sm"
                          className="mt-0.5 h-7 w-[4.75rem] px-1.5 text-[0.7rem] text-foreground"
                          aria-label={`Move to position (currently ${index + 1})`}
                        >
                          <SelectValue>{index + 1}</SelectValue>
                        </SelectTrigger>
                        <SelectContent align="end">
                          {positionItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                </div>

                <Textarea
                  value={field.description ?? ""}
                  disabled={disabled}
                  rows={2}
                  placeholder={isSection ? "Section description" : "Optional helper text"}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) =>
                    updateField(index, { description: event.target.value || null })
                  }
                />

                {!isSection ? (
                  <div
                    className="flex items-center justify-between"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Label htmlFor={`required-${field.id}`} className="text-sm font-normal">
                      Required
                    </Label>
                    <Switch
                      id={`required-${field.id}`}
                      checked={field.required}
                      disabled={disabled}
                      onCheckedChange={(checked) =>
                        updateField(index, { required: checked === true })
                      }
                    />
                  </div>
                ) : null}

                {field.type === "images" ? (
                  <div className="space-y-2" onClick={(event) => event.stopPropagation()}>
                    <Label htmlFor={`max-files-${field.id}`}>Max images</Label>
                    <Input
                      id={`max-files-${field.id}`}
                      type="number"
                      min={1}
                      max={12}
                      disabled={disabled}
                      value={field.maxFiles ?? 8}
                      onChange={(event) =>
                        updateField(index, {
                          maxFiles: Math.min(12, Math.max(1, Number(event.target.value) || 8)),
                        })
                      }
                    />
                  </div>
                ) : null}

                {(field.type === "select" || field.type === "radio") && (
                  <div
                    className="space-y-2 rounded-md border bg-muted/20 p-2"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Options</Label>
                      {!disabled ? (
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          onClick={() => addOption(index)}
                        >
                          <PlusIcon className="size-3" />
                          Add
                        </Button>
                      ) : null}
                    </div>
                    {(field.options ?? []).map((option, optionIndex) => (
                      <div key={`${field.id}-${optionIndex}`} className="flex items-start gap-2">
                        <div className="grid flex-1 gap-2">
                          <Input
                            value={option.label}
                            disabled={disabled}
                            placeholder="Option label"
                            onChange={(event) =>
                              updateOption(index, optionIndex, { label: event.target.value })
                            }
                          />
                          {field.type === "radio" ? (
                            <Input
                              value={option.description ?? ""}
                              disabled={disabled}
                              placeholder="Optional short description"
                              onChange={(event) =>
                                updateOption(index, optionIndex, {
                                  description: event.target.value,
                                })
                              }
                            />
                          ) : null}
                        </div>
                        {!disabled ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            disabled={(field.options?.length ?? 0) <= 1}
                            onClick={() => removeOption(index, optionIndex)}
                            aria-label="Remove option"
                          >
                            <Trash2Icon className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function slugValue(label: string, index: number) {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return slug || `option_${index + 1}`;
}
