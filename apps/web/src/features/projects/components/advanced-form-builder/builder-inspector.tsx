"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { fieldTypeLabel } from "@/features/projects/lib/form-field-factory";
import { newFormFieldId } from "@/lib/project-form-ids";
import type { FormFieldDef, FormFieldType } from "@/lib/schemas/project-form";

type BuilderInspectorProps = {
  field: FormFieldDef | null;
  disabled?: boolean;
  onChange: (patch: Partial<FormFieldDef>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

const TEXT_LIKE: FormFieldType[] = ["text", "email", "url"];

export function BuilderInspector({
  field,
  disabled = false,
  onChange,
  onDuplicate,
  onDelete,
}: BuilderInspectorProps) {
  if (!field) {
    return (
      <div className="flex h-full flex-col justify-center px-4 text-center">
        <p className="text-sm font-medium text-foreground">No field selected</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Click a question on the canvas to edit its settings.
        </p>
      </div>
    );
  }

  const isSection = field.type === "section";
  const hasOptions = field.type === "select" || field.type === "radio";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border px-4 py-4">
        <h3 className="truncate text-sm font-semibold tracking-tight">{field.label}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{fieldTypeLabel(field.type)}</p>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="inspector-label">{isSection ? "Section title" : "Question"}</Label>
          <Input
            id="inspector-label"
            value={field.label}
            disabled={disabled}
            onChange={(event) => onChange({ label: event.target.value })}
          />
        </div>

        {!isSection ? (
          <div className="space-y-2">
            <Label htmlFor="inspector-help">Help text</Label>
            <Textarea
              id="inspector-help"
              value={field.description ?? ""}
              disabled={disabled}
              rows={3}
              placeholder="Optional guidance for the client"
              onChange={(event) =>
                onChange({ description: event.target.value.trim() ? event.target.value : null })
              }
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="inspector-section-desc">Description</Label>
            <Textarea
              id="inspector-section-desc"
              value={field.description ?? ""}
              disabled={disabled}
              rows={3}
              placeholder="What this section is for"
              onChange={(event) =>
                onChange({ description: event.target.value.trim() ? event.target.value : null })
              }
            />
          </div>
        )}

        {!isSection ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
            <div>
              <p className="text-sm text-foreground">Required</p>
              <p className="text-xs text-muted-foreground">Client must answer before submit</p>
            </div>
            <Switch
              checked={field.required}
              disabled={disabled}
              onCheckedChange={(checked) => onChange({ required: checked })}
            />
          </div>
        ) : null}

        {TEXT_LIKE.includes(field.type) ? (
          <div className="space-y-2">
            <Label>Answer type</Label>
            <Select
              value={field.type}
              disabled={disabled}
              onValueChange={(value) => {
                if (!value) return;
                onChange({ type: value as FormFieldType });
              }}
              items={TEXT_LIKE.map((type) => ({
                value: type,
                label: fieldTypeLabel(type),
              }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEXT_LIKE.map((type) => (
                  <SelectItem key={type} value={type}>
                    {fieldTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {field.type === "images" ? (
          <div className="space-y-2">
            <Label htmlFor="inspector-max-files">Max images</Label>
            <Input
              id="inspector-max-files"
              type="number"
              min={1}
              max={12}
              disabled={disabled}
              value={field.maxFiles ?? 8}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!Number.isFinite(value)) return;
                onChange({ maxFiles: Math.min(12, Math.max(1, Math.round(value))) });
              }}
            />
          </div>
        ) : null}

        {hasOptions ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Options</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={disabled}
                onClick={() => {
                  const options = [
                    ...(field.options ?? []),
                    {
                      value: newFormFieldId(),
                      label: `Option ${(field.options?.length ?? 0) + 1}`,
                      description: "",
                    },
                  ];
                  onChange({ options });
                }}
              >
                Add option
              </Button>
            </div>
            <div className="space-y-2">
              {(field.options ?? []).map((option, index) => (
                <div key={`${option.value}-${index}`} className="space-y-1.5 rounded-lg border border-border p-2">
                  <Input
                    value={option.label}
                    disabled={disabled}
                    placeholder="Label"
                    onChange={(event) => {
                      const options = (field.options ?? []).map((item, i) =>
                        i === index
                          ? {
                              ...item,
                              label: event.target.value,
                              value: event.target.value
                                .trim()
                                .toLowerCase()
                                .replace(/\s+/g, "_")
                                .slice(0, 120) || item.value,
                            }
                          : item,
                      );
                      onChange({ options });
                    }}
                  />
                  {field.type === "radio" ? (
                    <Input
                      value={option.description ?? ""}
                      disabled={disabled}
                      placeholder="Short description"
                      onChange={(event) => {
                        const options = (field.options ?? []).map((item, i) =>
                          i === index
                            ? { ...item, description: event.target.value || undefined }
                            : item,
                        );
                        onChange({ options });
                      }}
                    />
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-destructive"
                    disabled={disabled || (field.options?.length ?? 0) <= 1}
                    onClick={() => {
                      onChange({
                        options: (field.options ?? []).filter((_, i) => i !== index),
                      });
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border p-4">
        <Button type="button" variant="outline" disabled={disabled} onClick={onDuplicate}>
          Duplicate
        </Button>
        <Button
          type="button"
          variant="outline"
          className="text-destructive hover:text-destructive"
          disabled={disabled}
          onClick={onDelete}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
