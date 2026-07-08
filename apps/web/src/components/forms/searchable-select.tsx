"use client";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  Combobox,
  type ComboboxOption,
} from "@/components/forms/combobox";

export type SearchableOption<T extends string = string> = ComboboxOption<T>;

type SearchableSelectProps<T extends string = string> = {
  id?: string;
  label: string;
  value: T;
  options: SearchableOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  matchTriggerWidth?: boolean;
  container?: HTMLElement | null;
};

export function SearchableSelect<T extends string = string>({
  id,
  label,
  value,
  options,
  onChange,
  placeholder = "Select...",
  description,
  error,
  disabled,
  className,
  contentClassName,
  matchTriggerWidth,
  container,
}: SearchableSelectProps<T>) {
  return (
    <Field data-invalid={!!error} className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldContent>
        <Combobox
          id={id}
          value={value}
          options={options}
          onChange={onChange}
          placeholder={placeholder}
          searchPlaceholder={`Search ${label.toLowerCase()}...`}
          disabled={disabled}
          contentClassName={contentClassName}
          matchTriggerWidth={matchTriggerWidth}
          container={container}
          className={error ? "border-destructive" : undefined}
        />
        {description && <FieldDescription>{description}</FieldDescription>}
        {error && <FieldError>{error}</FieldError>}
      </FieldContent>
    </Field>
  );
}
