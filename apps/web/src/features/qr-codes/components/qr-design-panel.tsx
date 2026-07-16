"use client";

import { CheckIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { QrColorField } from "@/features/qr-codes/components/qr-color-field";
import {
  QR_COLOR_PRESETS,
  QR_DOT_STYLES,
  QR_EYE_STYLES,
} from "@/lib/qr-codes/design";
import type { QrDesign } from "@/lib/qr-codes/types";
import { cn } from "@/lib/utils";

type QrDesignPanelProps = {
  design: QrDesign;
  onChange: (design: QrDesign) => void;
  companyLogoUrl?: string | null;
};

export function QrDesignPanel({ design, onChange, companyLogoUrl }: QrDesignPanelProps) {
  const set = <K extends keyof QrDesign>(key: K, value: QrDesign[K]) =>
    onChange({ ...design, [key]: value });

  const hasLogo = Boolean(companyLogoUrl);

  return (
    <div className="space-y-6">
      <section className="space-y-2.5">
        <p className="text-sm font-medium text-foreground">Color</p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {QR_COLOR_PRESETS.map((preset) => {
            const active =
              preset.fgColor === design.fgColor && preset.bgColor === design.bgColor;
            return (
              <button
                key={preset.name}
                type="button"
                title={preset.name}
                aria-label={preset.name}
                onClick={() =>
                  onChange({ ...design, fgColor: preset.fgColor, bgColor: preset.bgColor })
                }
                className={cn(
                  "relative flex aspect-square items-center justify-center rounded-lg border transition-all",
                  active
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border/70 hover:border-primary/40",
                )}
                style={{ backgroundColor: preset.bgColor }}
              >
                <span
                  className="size-4 rounded-full"
                  style={{ backgroundColor: preset.fgColor }}
                />
                {active && (
                  <CheckIcon
                    className="absolute right-1 top-1 size-3"
                    style={{ color: preset.fgColor }}
                  />
                )}
              </button>
            );
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <QrColorField
            label="Foreground"
            value={design.fgColor}
            onChange={(value) => set("fgColor", value)}
          />
          <QrColorField
            label="Background"
            value={design.bgColor}
            onChange={(value) => set("bgColor", value)}
          />
        </div>
      </section>

      <section className="space-y-2.5">
        <p className="text-sm font-medium text-foreground">Pattern</p>
        <div className="grid grid-cols-3 gap-2">
          {QR_DOT_STYLES.map((style) => (
            <OptionButton
              key={style.value}
              active={design.dotStyle === style.value}
              onClick={() => set("dotStyle", style.value)}
            >
              {style.label}
            </OptionButton>
          ))}
        </div>
      </section>

      <section className="space-y-2.5">
        <p className="text-sm font-medium text-foreground">Corners</p>
        <div className="grid grid-cols-3 gap-2">
          {QR_EYE_STYLES.map((style) => (
            <OptionButton
              key={style.value}
              active={design.eyeRadius === style.value}
              onClick={() => set("eyeRadius", style.value)}
            >
              {style.label}
            </OptionButton>
          ))}
        </div>
      </section>

      <section className="flex items-start justify-between gap-4 rounded-lg border border-border/70 px-3.5 py-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">Center logo</p>
          <p className="text-xs text-muted-foreground">
            {hasLogo
              ? "Place your company logo in the middle of the code."
              : "Add a company logo in Settings to use this."}
          </p>
        </div>
        <Switch
          checked={hasLogo && design.logoEnabled}
          disabled={!hasLogo}
          onCheckedChange={(checked) => set("logoEnabled", checked)}
        />
      </section>
    </div>
  );
}

function OptionButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border/70 text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
