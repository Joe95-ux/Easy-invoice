"use client";

import { DatePicker } from "@/components/forms/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { definitionsForDocument } from "@/lib/custom-fields";
import type {
  CustomFieldAppliesTo,
  CustomFieldDefinition,
  CustomFieldValues,
} from "@/lib/schemas/custom-fields";

type DocumentCustomFieldsFormProps = {
  kind: CustomFieldAppliesTo;
  definitions: CustomFieldDefinition[];
  values: CustomFieldValues;
  onChange: (values: CustomFieldValues) => void;
};

function inputTypeForField(type: CustomFieldDefinition["type"]): string {
  if (type === "number") return "number";
  if (type === "email") return "email";
  if (type === "url") return "url";
  return "text";
}

export function DocumentCustomFieldsForm({
  kind,
  definitions,
  values,
  onChange,
}: DocumentCustomFieldsFormProps) {
  const fields = definitionsForDocument(definitions, kind);
  if (fields.length === 0) return null;

  function setValue(id: string, value: string) {
    onChange({ ...values, [id]: value });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-foreground">Custom fields</p>
      {fields.map((field) => {
        const value = values[field.id] ?? "";
        const label = (
          <>
            {field.label}
            {field.required ? <span className="text-destructive"> *</span> : null}
          </>
        );

        const description = field.description?.trim() || null;
        const help = description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null;

        if (field.type === "textarea") {
          return (
            <Field key={field.id}>
              <FieldLabel htmlFor={field.id}>{label}</FieldLabel>
              <FieldContent className="gap-1.5">
                <Textarea
                  id={field.id}
                  value={value}
                  rows={3}
                  aria-required={field.required}
                  onChange={(event) => setValue(field.id, event.target.value)}
                />
                {help}
              </FieldContent>
            </Field>
          );
        }

        if (field.type === "date") {
          return (
            <Field key={field.id}>
              <FieldLabel htmlFor={field.id}>{label}</FieldLabel>
              <FieldContent className="gap-1.5">
                <DatePicker
                  id={field.id}
                  value={value || undefined}
                  onChange={(next) => setValue(field.id, next)}
                  placeholder="Pick a date"
                  aria-required={field.required}
                />
                {help}
              </FieldContent>
            </Field>
          );
        }

        if (field.type === "select") {
          const items = (field.options ?? []).map((option) => ({
            value: option.value,
            label: option.label,
          }));
          const selectedLabel =
            items.find((item) => item.value === value)?.label ?? "Select…";
          return (
            <Field key={field.id}>
              <FieldLabel htmlFor={field.id}>{label}</FieldLabel>
              <FieldContent className="gap-1.5">
                <Select
                  value={value || null}
                  onValueChange={(next) => setValue(field.id, next ?? "")}
                  items={items}
                >
                  <SelectTrigger
                    id={field.id}
                    className="text-foreground"
                    aria-required={field.required}
                  >
                    <SelectValue>{value ? selectedLabel : null}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {help}
              </FieldContent>
            </Field>
          );
        }

        if (field.type === "checkbox") {
          return (
            <div key={field.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={field.id}
                  checked={value === "true"}
                  aria-required={field.required}
                  onCheckedChange={(checked) => {
                    if (checked === true) {
                      setValue(field.id, "true");
                      return;
                    }
                    const next = { ...values };
                    delete next[field.id];
                    onChange(next);
                  }}
                />
                <label htmlFor={field.id} className="text-sm font-medium leading-none">
                  {label}
                </label>
              </div>
              {help}
            </div>
          );
        }

        return (
          <Field key={field.id}>
            <FieldLabel htmlFor={field.id}>{label}</FieldLabel>
            <FieldContent className="gap-1.5">
              <Input
                id={field.id}
                type={inputTypeForField(field.type)}
                value={value}
                aria-required={field.required}
                onChange={(event) => setValue(field.id, event.target.value)}
              />
              {help}
            </FieldContent>
          </Field>
        );
      })}
    </div>
  );
}
