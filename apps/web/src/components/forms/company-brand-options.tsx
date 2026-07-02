"use client";

import { BrandColorPicker } from "@/components/forms/brand-color-picker";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  LOGO_BG_OPTIONS,
  LOGO_PLACEMENT_OPTIONS,
  type LogoBg,
  type LogoPlacement,
} from "@/lib/company-branding";
import { cn } from "@/lib/utils";

type CompanyBrandOptionsProps = {
  logoBg: LogoBg;
  logoPlacement: LogoPlacement;
  brandColor: string | null;
  onLogoBgChange: (value: LogoBg) => void;
  onLogoPlacementChange: (value: LogoPlacement) => void;
  onBrandColorChange: (value: string | null) => void;
  className?: string;
};

export function CompanyBrandOptions({
  logoBg,
  logoPlacement,
  brandColor,
  onLogoBgChange,
  onLogoPlacementChange,
  onBrandColorChange,
  className,
}: CompanyBrandOptionsProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <Field>
        <FieldLabel>Logo background</FieldLabel>
        <FieldContent>
          <div className="flex flex-wrap gap-2">
            {LOGO_BG_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onLogoBgChange(option.value)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm transition-colors",
                  logoBg === option.value
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <FieldDescription>
            Background behind your logo in the app and on PDF headers.
          </FieldDescription>
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>Logo on documents</FieldLabel>
        <FieldContent>
          <RadioGroup
            value={logoPlacement}
            onValueChange={(value) => onLogoPlacementChange(value as LogoPlacement)}
            className="gap-3"
          >
            {LOGO_PLACEMENT_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-start gap-3">
                <RadioGroupItem value={option.value} id={`logo-${option.value}`} />
                <div className="grid gap-1">
                  <Label htmlFor={`logo-${option.value}`} className="font-medium">
                    {option.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </FieldContent>
      </Field>

      <BrandColorPicker value={brandColor} onChange={onBrandColorChange} />
    </div>
  );
}
