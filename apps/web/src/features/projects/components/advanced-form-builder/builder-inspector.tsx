"use client";

import type { ReactNode } from "react";
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
import {
  ANSWERABLE_FIELD_TYPES,
  fieldTypeLabel,
  patchForFieldTypeChange,
  resolvedFieldWidth,
} from "@/features/projects/lib/form-field-factory";
import { newFormFieldId } from "@/lib/project-form-ids";
import {
  isAnswerableFormField,
  type FormFieldDef,
  type FormFieldType,
  type FormFieldValidation,
  type FormFieldVisibility,
} from "@/lib/schemas/project-form";
import { cn } from "@/lib/utils";

const TEXT_LIKE_TYPES = new Set<FormFieldType>([
  "text",
  "textarea",
  "email",
  "phone",
  "url",
]);

const VISIBILITY_OPS: Array<{ value: FormFieldVisibility["op"]; label: string }> = [
  { value: "eq", label: "Equals" },
  { value: "neq", label: "Not equals" },
  { value: "empty", label: "Is empty" },
  { value: "notEmpty", label: "Is not empty" },
  { value: "includes", label: "Includes" },
];

type BuilderInspectorProps = {
  field: FormFieldDef | null;
  allFields?: FormFieldDef[];
  disabled?: boolean;
  onChange: (patch: Partial<FormFieldDef>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  /** Shown on the extreme right of the Field / Section / Page heading. */
  headerEnd?: ReactNode;
};

export function BuilderInspector({
  field,
  allFields = [],
  disabled = false,
  onChange,
  onDuplicate,
  onDelete,
  headerEnd,
}: BuilderInspectorProps) {
  if (!field) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/80 px-4 py-3.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/80">
            Field
          </p>
          {headerEnd}
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-1 px-6 text-center">
          <p className="text-sm font-medium text-foreground">Nothing selected</p>
          <p className="max-w-56 text-sm leading-relaxed text-muted-foreground">
            Click a section or question on the canvas to edit its settings here.
          </p>
        </div>
      </div>
    );
  }

  const isSection = field.type === "section";
  const isPage = field.type === "page";
  const isStructural = isSection || isPage;
  const hasOptions =
    field.type === "select" || field.type === "radio" || field.type === "checkbox";
  const width = resolvedFieldWidth(field);
  const validation = field.validation ?? {};
  const visibleWhen = field.visibleWhen ?? null;

  const controllingFieldItems = allFields
    .filter((item) => item.id !== field.id && isAnswerableFormField(item))
    .map((item) => ({
      value: item.id,
      label: item.label,
    }));

  const controllingField = allFields.find((item) => item.id === visibleWhen?.fieldId) ?? null;
  const controllingChoiceItems =
    controllingField?.type === "yesno"
      ? [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ]
      : controllingField?.options?.map((option) => ({
          value: option.value,
          label: option.label,
        })) ?? null;

  function patchValidation(patch: Partial<FormFieldValidation>) {
    const next: FormFieldValidation = { ...validation, ...patch };
    const cleaned: FormFieldValidation = {};
    if (next.minLength != null) cleaned.minLength = next.minLength;
    if (next.maxLength != null) cleaned.maxLength = next.maxLength;
    if (next.min != null) cleaned.min = next.min;
    if (next.max != null) cleaned.max = next.max;
    if (next.pattern?.trim()) cleaned.pattern = next.pattern.trim();
    if (next.message?.trim()) cleaned.message = next.message.trim();
    onChange({
      validation: Object.keys(cleaned).length > 0 ? cleaned : null,
    });
  }

  function patchVisibleWhen(patch: Partial<FormFieldVisibility> | null) {
    if (patch === null) {
      onChange({ visibleWhen: null });
      return;
    }
    const base: FormFieldVisibility = {
      fieldId: visibleWhen?.fieldId ?? controllingFieldItems[0]?.value ?? "",
      op: visibleWhen?.op ?? "eq",
      value: visibleWhen?.value,
      ...patch,
    };
    if (!base.fieldId) return;
    const needsValue = base.op === "eq" || base.op === "neq" || base.op === "includes";
    onChange({
      visibleWhen: {
        fieldId: base.fieldId,
        op: base.op,
        ...(needsValue ? { value: base.value ?? "" } : {}),
      },
    });
  }

  const structuralKind = isPage ? "Page" : "Section";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border/80 px-4 py-3.5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/80">
            {isStructural ? structuralKind : "Field"}
          </p>
          <h3 className="mt-1 truncate text-sm font-semibold tracking-tight">{field.label}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{fieldTypeLabel(field.type)}</p>
        </div>
        {headerEnd ? <div className="shrink-0 pt-0.5">{headerEnd}</div> : null}
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="inspector-label">
            {isPage ? "Page title" : isSection ? "Section title" : "Question"}
          </Label>
          <Input
            id="inspector-label"
            value={field.label}
            disabled={disabled}
            onChange={(event) => onChange({ label: event.target.value })}
          />
        </div>

        {!isStructural ? (
          <div className="space-y-2">
            <Label>Field type</Label>
            <Select
              value={field.type}
              disabled={disabled}
              onValueChange={(value) => {
                if (!value) return;
                onChange(patchForFieldTypeChange(field, value as FormFieldType));
              }}
              items={ANSWERABLE_FIELD_TYPES.map((type) => ({
                value: type,
                label: fieldTypeLabel(type),
              }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANSWERABLE_FIELD_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {fieldTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {!isStructural ? (
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
              placeholder={isPage ? "What this page covers" : "What this section is for"}
              onChange={(event) =>
                onChange({ description: event.target.value.trim() ? event.target.value : null })
              }
            />
          </div>
        )}

        {!isStructural ? (
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

        {!isStructural ? (
          <div className="space-y-2">
            <Label>Width</Label>
            <div
              className="grid h-8 grid-cols-2 gap-0.5 rounded-lg border border-border p-0.5"
              role="group"
              aria-label="Field width"
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange({ width: "half" })}
                className={cn(
                  "rounded-md text-sm font-medium transition-colors disabled:opacity-50",
                  width === "half"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                Half
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange({ width: "full" })}
                className={cn(
                  "rounded-md text-sm font-medium transition-colors disabled:opacity-50",
                  width === "full"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                Full
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Half lets another field sit beside this one on large screens.
            </p>
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
                            }
                          : item,
                      );
                      onChange({ options });
                    }}
                  />
                  {field.type === "radio" || field.type === "checkbox" ? (
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

        {!isStructural ? (
          <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Validation</p>
              <p className="text-xs text-muted-foreground">Optional constraints for this answer</p>
            </div>

            {TEXT_LIKE_TYPES.has(field.type) ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="inspector-min-length" className="text-xs text-muted-foreground">
                    Min length
                  </Label>
                  <Input
                    id="inspector-min-length"
                    type="number"
                    min={0}
                    disabled={disabled}
                    value={validation.minLength ?? ""}
                    placeholder="—"
                    onChange={(event) => {
                      const raw = event.target.value;
                      if (!raw.trim()) {
                        patchValidation({ minLength: undefined });
                        return;
                      }
                      const value = Number(raw);
                      if (!Number.isFinite(value)) return;
                      patchValidation({ minLength: Math.max(0, Math.round(value)) });
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inspector-max-length" className="text-xs text-muted-foreground">
                    Max length
                  </Label>
                  <Input
                    id="inspector-max-length"
                    type="number"
                    min={1}
                    disabled={disabled}
                    value={validation.maxLength ?? ""}
                    placeholder="—"
                    onChange={(event) => {
                      const raw = event.target.value;
                      if (!raw.trim()) {
                        patchValidation({ maxLength: undefined });
                        return;
                      }
                      const value = Number(raw);
                      if (!Number.isFinite(value)) return;
                      patchValidation({ maxLength: Math.max(1, Math.round(value)) });
                    }}
                  />
                </div>
              </div>
            ) : null}

            {field.type === "number" ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="inspector-min" className="text-xs text-muted-foreground">
                    Min
                  </Label>
                  <Input
                    id="inspector-min"
                    type="number"
                    disabled={disabled}
                    value={validation.min ?? ""}
                    placeholder="—"
                    onChange={(event) => {
                      const raw = event.target.value;
                      if (!raw.trim()) {
                        patchValidation({ min: undefined });
                        return;
                      }
                      const value = Number(raw);
                      if (!Number.isFinite(value)) return;
                      patchValidation({ min: value });
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inspector-max" className="text-xs text-muted-foreground">
                    Max
                  </Label>
                  <Input
                    id="inspector-max"
                    type="number"
                    disabled={disabled}
                    value={validation.max ?? ""}
                    placeholder="—"
                    onChange={(event) => {
                      const raw = event.target.value;
                      if (!raw.trim()) {
                        patchValidation({ max: undefined });
                        return;
                      }
                      const value = Number(raw);
                      if (!Number.isFinite(value)) return;
                      patchValidation({ max: value });
                    }}
                  />
                </div>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="inspector-pattern" className="text-xs text-muted-foreground">
                Pattern (regex)
              </Label>
              <Input
                id="inspector-pattern"
                value={validation.pattern ?? ""}
                disabled={disabled}
                placeholder="Optional"
                onChange={(event) =>
                  patchValidation({
                    pattern: event.target.value.trim() ? event.target.value : undefined,
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inspector-validation-message" className="text-xs text-muted-foreground">
                Custom message
              </Label>
              <Input
                id="inspector-validation-message"
                value={validation.message ?? ""}
                disabled={disabled}
                placeholder="Shown when validation fails"
                onChange={(event) =>
                  patchValidation({
                    message: event.target.value.trim() ? event.target.value : undefined,
                  })
                }
              />
            </div>
          </div>
        ) : null}

        {!isStructural ? (
          <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">Show when</p>
                <p className="text-xs text-muted-foreground">Hide this field until a condition matches</p>
              </div>
              {visibleWhen ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 px-2 text-xs"
                  disabled={disabled}
                  onClick={() => patchVisibleWhen(null)}
                >
                  Clear
                </Button>
              ) : null}
            </div>

            {controllingFieldItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">Add another question to use as a condition.</p>
            ) : (
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Controlling field</Label>
                  <Select
                    value={visibleWhen?.fieldId ?? null}
                    disabled={disabled}
                    onValueChange={(value) => {
                      if (!value) return;
                      patchVisibleWhen({
                        fieldId: value,
                        op: visibleWhen?.op ?? "eq",
                        value: visibleWhen?.value ?? "",
                      });
                    }}
                    items={controllingFieldItems}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select field…" />
                    </SelectTrigger>
                    <SelectContent>
                      {controllingFieldItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Condition</Label>
                  <Select
                    value={visibleWhen?.op ?? null}
                    disabled={disabled || !visibleWhen?.fieldId}
                    onValueChange={(value) => {
                      if (!value) return;
                      patchVisibleWhen({ op: value as FormFieldVisibility["op"] });
                    }}
                    items={VISIBILITY_OPS}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {VISIBILITY_OPS.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {visibleWhen &&
                (visibleWhen.op === "eq" ||
                  visibleWhen.op === "neq" ||
                  visibleWhen.op === "includes") ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="inspector-visible-value" className="text-xs text-muted-foreground">
                      Value
                    </Label>
                    {controllingChoiceItems && controllingChoiceItems.length > 0 ? (
                      <Select
                        value={visibleWhen.value || null}
                        disabled={disabled}
                        onValueChange={(value) => {
                          if (!value) return;
                          patchVisibleWhen({ value });
                        }}
                        items={controllingChoiceItems}
                      >
                        <SelectTrigger id="inspector-visible-value">
                          <SelectValue placeholder="Select value…" />
                        </SelectTrigger>
                        <SelectContent>
                          {controllingChoiceItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="inspector-visible-value"
                        value={visibleWhen.value ?? ""}
                        disabled={disabled}
                        placeholder="Compare against…"
                        onChange={(event) => patchVisibleWhen({ value: event.target.value })}
                      />
                    )}
                  </div>
                ) : null}
              </div>
            )}
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
