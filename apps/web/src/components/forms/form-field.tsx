"use client";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type FormFieldProps = {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  description?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  className?: string;
};

export function FormField({
  label,
  id,
  value,
  onChange,
  error,
  description,
  type = "text",
  required,
  placeholder,
  autoComplete,
  className,
}: FormFieldProps) {
  return (
    <Field data-invalid={!!error} className={className}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </FieldLabel>
      <FieldContent>
        <Input
          id={id}
          type={type}
          value={value}
          required={required}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(event) => onChange(event.target.value)}
        />
        {description && <FieldDescription>{description}</FieldDescription>}
        {error && <FieldError>{error}</FieldError>}
      </FieldContent>
    </Field>
  );
}
