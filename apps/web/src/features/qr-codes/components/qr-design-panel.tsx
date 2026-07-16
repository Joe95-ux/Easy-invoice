"use client";

import { ArrowLeftRightIcon } from "lucide-react";
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
      <section className="space-y-3">
        <p className="text-sm font-medium text-foreground">Color palette</p>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {QR_COLOR_PRESETS.map((preset) => {
            const active =
              preset.fgColor === design.fgColor && preset.bgColor === design.bgColor;
            return (
              <button
                key={preset.name}
                type="button"
                title={preset.name}
                aria-label={preset.name}
                aria-pressed={active}
                onClick={() =>
                  onChange({ ...design, fgColor: preset.fgColor, bgColor: preset.bgColor })
                }
                className={cn(
                  "flex gap-1.5 rounded-xl border bg-muted p-1.5 transition-all",
                  active
                    ? "border-primary ring-2 ring-primary/40"
                    : "border-border/70 hover:border-primary/40",
                )}
              >
                <span
                  className="h-9 flex-1 rounded-md ring-1 ring-inset ring-black/5"
                  style={{ backgroundColor: preset.fgColor }}
                />
                <span
                  className="h-9 flex-1 rounded-md ring-1 ring-inset ring-black/5"
                  style={{ backgroundColor: preset.bgColor }}
                />
              </button>
            );
          })}
        </div>
        <div className="flex items-end gap-2">
          <QrColorField
            label="Foreground"
            value={design.fgColor}
            onChange={(value) => set("fgColor", value)}
            className="flex-1"
          />
          <button
            type="button"
            aria-label="Swap foreground and background"
            title="Swap colors"
            onClick={() =>
              onChange({ ...design, fgColor: design.bgColor, bgColor: design.fgColor })
            }
            className="mb-0.5 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-muted text-muted-foreground shadow-sm transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <ArrowLeftRightIcon className="size-4" />
          </button>
          <QrColorField
            label="Background"
            value={design.bgColor}
            onChange={(value) => set("bgColor", value)}
            className="flex-1"
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
