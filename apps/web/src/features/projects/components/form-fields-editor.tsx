"use client";

import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
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
import { newFormFieldId } from "@/lib/project-forms";
import type { FormFieldDef, FormFieldType } from "@/lib/schemas/project-form";

const FIELD_TYPES: Array<{ value: FormFieldType; label: string }> = [
  { value: "text", label: "Short text" },
  { value: "email", label: "Email" },
  { value: "url", label: "URL" },
  { value: "textarea", label: "Long text" },
];

type FormFieldsEditorProps = {
  fields: FormFieldDef[];
  onChange: (fields: FormFieldDef[]) => void;
  disabled?: boolean;
};

export function FormFieldsEditor({
  fields,
  onChange,
  disabled = false,
}: FormFieldsEditorProps) {
  function updateField(index: number, patch: Partial<FormFieldDef>) {
    onChange(fields.map((field, i) => (i === index ? { ...field, ...patch } : field)));
  }

  function removeField(index: number) {
    onChange(fields.filter((_, i) => i !== index));
  }

  function addField() {
    onChange([
      ...fields,
      {
        id: newFormFieldId(),
        type: "text",
        label: "New question",
        required: false,
      },
    ]);
  }

  function moveField(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Questions</Label>
        {!disabled ? (
          <Button type="button" size="sm" variant="outline" onClick={addField}>
            <PlusIcon className="size-4" />
            Add field
          </Button>
        ) : null}
      </div>

      {fields.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          No fields yet.
        </p>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="space-y-3 rounded-lg border p-3">
              <div className="flex items-start gap-2">
                <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_8rem]">
                  <Input
                    value={field.label}
                    disabled={disabled}
                    onChange={(event) => updateField(index, { label: event.target.value })}
                    placeholder="Question label"
                  />
                  <Select
                    value={field.type}
                    disabled={disabled}
                    onValueChange={(value) =>
                      value && updateField(index, { type: value as FormFieldType })
                    }
                    items={FIELD_TYPES}
                  >
                    <SelectTrigger className="text-foreground">
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
                  <div className="flex shrink-0 flex-col gap-0.5">
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
                  </div>
                ) : null}
                {!disabled ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeField(index)}
                    aria-label="Remove field"
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                ) : null}
              </div>
              <div className="flex items-center justify-between">
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
