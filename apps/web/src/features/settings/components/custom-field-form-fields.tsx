"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
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
import {
  createCustomFieldOption,
  CUSTOM_FIELD_TYPE_LABELS,
} from "@/lib/custom-fields";
import { newFormFieldId } from "@/lib/project-form-ids";
import type {
  CustomFieldAppliesTo,
  CustomFieldDefinition,
  CustomFieldType,
} from "@/lib/schemas/custom-fields";
import { cn } from "@/lib/utils";

const FIELD_TYPES = (Object.keys(CUSTOM_FIELD_TYPE_LABELS) as CustomFieldType[]).map(
  (value) => ({ value, label: CUSTOM_FIELD_TYPE_LABELS[value] }),
);

const NO_DEFAULT = "__none__";

export type CustomFieldFormDraft = {
  label: string;
  description: string;
  type: CustomFieldType;
  defaultValue: string;
  required: boolean;
  enabled: boolean;
  showOnInvoice: boolean;
  showOnEstimate: boolean;
  showOnPdf: boolean;
  options: Array<{ value: string; label: string }>;
};

export type DefinitionFromDraftResult =
  | { ok: true; definition: CustomFieldDefinition }
  | { ok: false; error: string };

export function draftFromDefinition(field?: CustomFieldDefinition | null): CustomFieldFormDraft {
  if (!field) {
    return {
      label: "",
      description: "",
      type: "text",
      defaultValue: "",
      required: false,
      enabled: true,
      showOnInvoice: true,
      showOnEstimate: true,
      showOnPdf: true,
      options: [
        createCustomFieldOption("Option A"),
        createCustomFieldOption("Option B"),
      ],
    };
  }

  const options = field.options?.length
    ? field.options.map((option) => ({ ...option }))
    : [
        createCustomFieldOption("Option A"),
        createCustomFieldOption("Option B"),
      ];

  let defaultValue = field.defaultValue?.trim() ?? "";
  if (field.type === "select" && defaultValue) {
    const stillValid = options.some((option) => option.value === defaultValue);
    if (!stillValid) defaultValue = "";
  }
  if (field.type === "checkbox" && defaultValue && defaultValue !== "true") {
    defaultValue = "";
  }

  return {
    label: field.label,
    description: field.description?.trim() ?? "",
    type: field.type,
    defaultValue,
    required: field.required,
    enabled: field.enabled !== false,
    showOnInvoice: field.appliesTo.includes("invoice"),
    showOnEstimate: field.appliesTo.includes("estimate"),
    showOnPdf: field.showOnPdf !== false,
    options,
  };
}

export function definitionFromDraft(
  draft: CustomFieldFormDraft,
  existingId?: string,
): DefinitionFromDraftResult {
  const label = draft.label.trim();
  if (!label) return { ok: false, error: "Field name is required" };

  if (!draft.showOnInvoice && !draft.showOnEstimate) {
    return { ok: false, error: "Show on invoices or estimates (or both)" };
  }

  const appliesTo: CustomFieldAppliesTo[] = [];
  if (draft.showOnInvoice) appliesTo.push("invoice");
  if (draft.showOnEstimate) appliesTo.push("estimate");

  let options: CustomFieldDefinition["options"];
  let defaultValue = draft.defaultValue.trim() || null;

  if (draft.type === "select") {
    const cleaned = draft.options
      .map((option) => ({
        value: option.value || createCustomFieldOption(option.label).value,
        label: option.label.trim() || "Option",
      }))
      .filter((option) => option.label);
    if (cleaned.length < 1) {
      return { ok: false, error: "Add at least one option" };
    }
    options = cleaned;
    if (defaultValue && !cleaned.some((option) => option.value === defaultValue)) {
      defaultValue = null;
    }
  } else if (draft.type === "checkbox") {
    defaultValue = defaultValue === "true" ? "true" : null;
  }

  return {
    ok: true,
    definition: {
      id: existingId ?? newFormFieldId(),
      label,
      description: draft.description.trim() || null,
      type: draft.type,
      required: draft.required,
      enabled: draft.enabled,
      defaultValue,
      appliesTo,
      showOnPdf: draft.showOnPdf,
      ...(draft.type === "select" ? { options } : { options: undefined }),
    },
  };
}

type CustomFieldFormFieldsProps = {
  draft: CustomFieldFormDraft;
  onChange: (next: CustomFieldFormDraft) => void;
  disabled?: boolean;
  compact?: boolean;
  idPrefix?: string;
  /** Portal target for selects inside drawers/sheets (avoids Vaul focus trap). */
  popupContainer?: HTMLElement | null;
  /** When set (edit mode), warn if the type differs from this value. */
  initialType?: CustomFieldType;
};

export function CustomFieldFormFields({
  draft,
  onChange,
  disabled = false,
  compact = false,
  idPrefix = "cf",
  popupContainer,
  initialType,
}: CustomFieldFormFieldsProps) {
  function patch(partial: Partial<CustomFieldFormDraft>) {
    onChange({ ...draft, ...partial });
  }

  function changeType(type: CustomFieldType) {
    patch({
      type,
      options:
        type === "select"
          ? draft.options.length > 0
            ? draft.options
            : [
                createCustomFieldOption("Option A"),
                createCustomFieldOption("Option B"),
              ]
          : draft.options,
      defaultValue: type === "checkbox" ? (draft.defaultValue === "true" ? "true" : "") : "",
    });
  }

  function updateOptions(options: CustomFieldFormDraft["options"]) {
    const nextDefault =
      draft.defaultValue && options.some((option) => option.value === draft.defaultValue)
        ? draft.defaultValue
        : "";
    patch({ options, defaultValue: nextDefault });
  }

  return (
    <div className={cn(compact ? "space-y-4" : "space-y-6")}>
      <div className={cn(compact ? "grid gap-4 sm:grid-cols-2" : "flex flex-col gap-4")}>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-name`}>Field name</Label>
          <Input
            id={`${idPrefix}-name`}
            value={draft.label}
            disabled={disabled}
            placeholder="e.g. PO Number"
            autoComplete="off"
            onChange={(event) => patch({ label: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-description`}>Description (optional)</Label>
          <Input
            id={`${idPrefix}-description`}
            value={draft.description}
            disabled={disabled}
            placeholder="Help text for your team…"
            autoComplete="off"
            onChange={(event) => patch({ description: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-type`}>Field type</Label>
          <Select
            value={draft.type}
            disabled={disabled}
            onValueChange={(value) => value && changeType(value as CustomFieldType)}
            items={FIELD_TYPES}
          >
            <SelectTrigger id={`${idPrefix}-type`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent container={popupContainer}>
              {FIELD_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {initialType != null && draft.type !== initialType ? (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-800 dark:text-amber-300">
              Changing type may not match values already saved on documents.
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-default`}>Default value (optional)</Label>
          {draft.type === "checkbox" ? (
            <div className="flex h-9 items-center gap-2 rounded-lg border border-input px-3">
              <Switch
                checked={draft.defaultValue === "true"}
                disabled={disabled}
                onCheckedChange={(checked) =>
                  patch({ defaultValue: checked === true ? "true" : "" })
                }
              />
              <span className="text-sm text-muted-foreground">Checked by default</span>
            </div>
          ) : draft.type === "select" ? (
            <Select
              value={draft.defaultValue || NO_DEFAULT}
              disabled={disabled}
              onValueChange={(value) =>
                patch({ defaultValue: !value || value === NO_DEFAULT ? "" : value })
              }
              items={[
                { value: NO_DEFAULT, label: "No default" },
                ...draft.options.map((option) => ({
                  value: option.value,
                  label: option.label.trim() || "Option",
                })),
              ]}
            >
              <SelectTrigger id={`${idPrefix}-default`}>
                <SelectValue placeholder="No default" />
              </SelectTrigger>
              <SelectContent container={popupContainer}>
                <SelectItem value={NO_DEFAULT}>No default</SelectItem>
                {draft.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label.trim() || "Option"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={`${idPrefix}-default`}
              value={draft.defaultValue}
              disabled={disabled}
              type={
                draft.type === "number"
                  ? "number"
                  : draft.type === "date"
                    ? "date"
                    : draft.type === "email"
                      ? "email"
                      : draft.type === "url"
                        ? "url"
                        : "text"
              }
              placeholder={
                draft.type === "date"
                  ? undefined
                  : draft.type === "email"
                    ? "e.g. billing@client.com"
                    : draft.type === "url"
                      ? "e.g. https://example.com"
                      : "e.g. N/A"
              }
              onChange={(event) => patch({ defaultValue: event.target.value })}
            />
          )}
        </div>
      </div>

      {draft.type === "select" ? (
        <div className="space-y-2 rounded-lg border border-border/80 bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs">Options</Label>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              disabled={disabled}
              onClick={() =>
                updateOptions([
                  ...draft.options,
                  createCustomFieldOption(`Option ${draft.options.length + 1}`),
                ])
              }
            >
              <PlusIcon className="size-3" />
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {draft.options.map((option, index) => (
              <div key={option.value} className="flex items-center gap-2">
                <Input
                  value={option.label}
                  disabled={disabled}
                  placeholder="Option label"
                  onChange={(event) => {
                    updateOptions(
                      draft.options.map((item, i) =>
                        i === index ? { ...item, label: event.target.value } : item,
                      ),
                    );
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8 shrink-0"
                  disabled={disabled || draft.options.length <= 1}
                  onClick={() =>
                    updateOptions(draft.options.filter((_, i) => i !== index))
                  }
                  aria-label="Remove option"
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className={cn("rounded-lg border border-border/70 bg-muted/15 px-3 py-3", compact ? "space-y-3" : "space-y-4")}>
        <ToggleRow
          id={`${idPrefix}-required`}
          label="Required"
          description="Must be filled when creating a document."
          checked={draft.required}
          disabled={disabled}
          onCheckedChange={(checked) => patch({ required: checked })}
        />
        <ToggleRow
          id={`${idPrefix}-invoice`}
          label="Show on invoices"
          description="Appears when creating or editing invoices."
          checked={draft.showOnInvoice}
          disabled={disabled}
          onCheckedChange={(checked) => patch({ showOnInvoice: checked })}
        />
        <ToggleRow
          id={`${idPrefix}-estimate`}
          label="Show on estimates"
          description="Appears when creating or editing estimates."
          checked={draft.showOnEstimate}
          disabled={disabled}
          onCheckedChange={(checked) => patch({ showOnEstimate: checked })}
        />
        <ToggleRow
          id={`${idPrefix}-pdf`}
          label="Show on PDF"
          description="Prints on shared invoices and estimates."
          checked={draft.showOnPdf}
          disabled={disabled}
          onCheckedChange={(checked) => patch({ showOnPdf: checked })}
        />
        {!compact ? (
          <ToggleRow
            id={`${idPrefix}-enabled`}
            label="Enabled"
            description="When off, the field is hidden from new documents."
            checked={draft.enabled}
            disabled={disabled}
            onCheckedChange={(checked) => patch({ enabled: checked })}
          />
        ) : null}
      </div>
    </div>
  );
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
    </div>
  );
}
