"use client";

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
import {
  createEmptyCustomFieldDefinition,
  CUSTOM_FIELD_TYPE_LABELS,
} from "@/lib/custom-fields";
import type {
  CustomFieldAppliesTo,
  CustomFieldDefinition,
  CustomFieldType,
} from "@/lib/schemas/custom-fields";

const FIELD_TYPES = (Object.keys(CUSTOM_FIELD_TYPE_LABELS) as CustomFieldType[]).map(
  (value) => ({ value, label: CUSTOM_FIELD_TYPE_LABELS[value] }),
);

type CustomFieldDefinitionsEditorProps = {
  definitions: CustomFieldDefinition[];
  onChange: (definitions: CustomFieldDefinition[]) => void;
  disabled?: boolean;
};

export function CustomFieldDefinitionsEditor({
  definitions,
  onChange,
  disabled = false,
}: CustomFieldDefinitionsEditorProps) {
  function updateField(index: number, patch: Partial<CustomFieldDefinition>) {
    onChange(definitions.map((field, i) => (i === index ? { ...field, ...patch } : field)));
  }

  function removeField(index: number) {
    onChange(definitions.filter((_, i) => i !== index));
  }

  function addField() {
    onChange([...definitions, createEmptyCustomFieldDefinition("text")]);
  }

  function moveField(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= definitions.length) return;
    const next = [...definitions];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    onChange(next);
  }

  function changeType(index: number, type: CustomFieldType) {
    const field = definitions[index]!;
    const patch: Partial<CustomFieldDefinition> = { type };
    if (type === "select") {
      patch.options = field.options?.length
        ? field.options
        : [
            { value: "option_a", label: "Option A" },
            { value: "option_b", label: "Option B" },
          ];
    } else {
      patch.options = undefined;
    }
    updateField(index, patch);
  }

  function toggleAppliesTo(index: number, target: CustomFieldAppliesTo, checked: boolean) {
    const field = definitions[index]!;
    const set = new Set(field.appliesTo);
    if (checked) set.add(target);
    else set.delete(target);
    if (set.size === 0) set.add(target);
    updateField(index, { appliesTo: Array.from(set) as CustomFieldAppliesTo[] });
  }

  function updateOption(fieldIndex: number, optionIndex: number, label: string) {
    const field = definitions[fieldIndex]!;
    const options = [...(field.options ?? [])];
    const current = options[optionIndex];
    if (!current) return;
    const slug =
      label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "") || `option_${optionIndex + 1}`;
    options[optionIndex] = { ...current, label, value: slug };
    updateField(fieldIndex, { options });
  }

  function addOption(fieldIndex: number) {
    const field = definitions[fieldIndex]!;
    const options = [...(field.options ?? [])];
    const n = options.length + 1;
    options.push({ value: `option_${n}`, label: `Option ${n}` });
    updateField(fieldIndex, { options });
  }

  function removeOption(fieldIndex: number, optionIndex: number) {
    const field = definitions[fieldIndex]!;
    updateField(fieldIndex, {
      options: (field.options ?? []).filter((_, i) => i !== optionIndex),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Fields</Label>
        {!disabled ? (
          <Button type="button" size="sm" variant="outline" onClick={addField}>
            <PlusIcon className="size-4" />
            Add field
          </Button>
        ) : null}
      </div>

      {definitions.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          No custom fields yet. Add fields that appear on invoices and estimates.
        </p>
      ) : (
        <div className="space-y-3">
          {definitions.map((field, index) => (
            <div key={field.id} className="space-y-3 rounded-lg border p-3">
              <div className="flex items-start gap-2">
                <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_9rem]">
                  <Input
                    value={field.label}
                    disabled={disabled}
                    onChange={(event) => updateField(index, { label: event.target.value })}
                    placeholder="Field label"
                  />
                  <Select
                    value={field.type}
                    disabled={disabled}
                    onValueChange={(value) => value && changeType(index, value as CustomFieldType)}
                    items={FIELD_TYPES}
                  >
                    <SelectTrigger className="text-foreground">
                      <SelectValue>
                        {CUSTOM_FIELD_TYPE_LABELS[field.type] ?? field.type}
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
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      disabled={index === 0}
                      onClick={() => moveField(index, -1)}
                      aria-label="Move up"
                    >
                      <ArrowUpIcon className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      disabled={index === definitions.length - 1}
                      onClick={() => moveField(index, 1)}
                      aria-label="Move down"
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
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id={`required-${field.id}`}
                    checked={field.required}
                    disabled={disabled}
                    onCheckedChange={(checked) =>
                      updateField(index, { required: checked === true })
                    }
                  />
                  <Label htmlFor={`required-${field.id}`} className="text-sm font-normal">
                    Required
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id={`pdf-${field.id}`}
                    checked={field.showOnPdf !== false}
                    disabled={disabled}
                    onCheckedChange={(checked) =>
                      updateField(index, { showOnPdf: checked === true })
                    }
                  />
                  <Label htmlFor={`pdf-${field.id}`} className="text-sm font-normal">
                    Show on PDF
                  </Label>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id={`invoice-${field.id}`}
                    checked={field.appliesTo.includes("invoice")}
                    disabled={disabled}
                    onCheckedChange={(checked) =>
                      toggleAppliesTo(index, "invoice", checked === true)
                    }
                  />
                  <Label htmlFor={`invoice-${field.id}`} className="text-sm font-normal">
                    Invoices
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id={`estimate-${field.id}`}
                    checked={field.appliesTo.includes("estimate")}
                    disabled={disabled}
                    onCheckedChange={(checked) =>
                      toggleAppliesTo(index, "estimate", checked === true)
                    }
                  />
                  <Label htmlFor={`estimate-${field.id}`} className="text-sm font-normal">
                    Estimates
                  </Label>
                </div>
              </div>

              {field.type === "select" ? (
                <div className="space-y-2 rounded-md border bg-muted/20 p-2">
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
                    <div key={`${field.id}-${optionIndex}`} className="flex items-center gap-2">
                      <Input
                        value={option.label}
                        disabled={disabled}
                        placeholder="Option label"
                        onChange={(event) =>
                          updateOption(index, optionIndex, event.target.value)
                        }
                      />
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
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
