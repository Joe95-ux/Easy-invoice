"use client";

import { Input } from "@/components/ui/input";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { DiscountMode } from "@/lib/calculator";

type DiscountFieldProps = {
  id?: string;
  mode: DiscountMode;
  value: number;
  currency: string;
  onModeChange: (mode: DiscountMode) => void;
  onValueChange: (value: number) => void;
};

export function DiscountField({
  id = "discount",
  mode,
  value,
  currency,
  onModeChange,
  onValueChange,
}: DiscountFieldProps) {
  return (
    <Field>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={id}>Discount</FieldLabel>
        <div
          className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5"
          role="group"
          aria-label="Discount type"
        >
          <button
            type="button"
            className={cn(
              "cursor-pointer rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
              mode === "percent"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onModeChange("percent")}
          >
            %
          </button>
          <button
            type="button"
            className={cn(
              "cursor-pointer rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
              mode === "amount"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onModeChange("amount")}
          >
            {currency}
          </button>
        </div>
      </div>
      <FieldContent>
        <Input
          id={id}
          type="number"
          min={0}
          max={mode === "percent" ? 100 : undefined}
          step={mode === "percent" ? "0.1" : "0.01"}
          value={value}
          onChange={(event) => onValueChange(Number(event.target.value))}
          placeholder={mode === "percent" ? "0" : "0.00"}
        />
      </FieldContent>
    </Field>
  );
}
