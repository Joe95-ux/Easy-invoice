"use client";

import { Sketch } from "@uiw/react-color";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DEFAULT_BRAND_COLOR } from "@/lib/company-branding";
import { cn } from "@/lib/utils";

type BrandColorPickerProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
};

export function BrandColorPicker({
  value,
  onChange,
  className,
}: BrandColorPickerProps) {
  const { resolvedTheme } = useTheme();
  const displayColor = value ?? DEFAULT_BRAND_COLOR;

  return (
    <Field className={className}>
      <FieldLabel>Brand color</FieldLabel>
      <FieldContent>
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                />
              }
            >
              <span
                className={cn(
                  "size-4 rounded-sm border border-border/60 shadow-sm",
                  !value && "ring-1 ring-dashed ring-border",
                )}
                style={{ backgroundColor: displayColor }}
              />
              {value ? displayColor.toUpperCase() : "Pick a color"}
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto border-0 p-0 shadow-lg">
              <Sketch
                color={displayColor}
                onChange={(color) => onChange(color.hex)}
                style={{
                  background: resolvedTheme === "dark" ? "#18181b" : "#ffffff",
                  boxShadow: "none",
                }}
              />
            </PopoverContent>
          </Popover>

          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
            >
              Use template colors
            </Button>
          )}
        </div>
        <FieldDescription>
          Applied to document titles, headings, table headers, and accents on invoices
          and estimates.
        </FieldDescription>
      </FieldContent>
    </Field>
  );
}
