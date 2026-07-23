"use client";

import { useRef, useState } from "react";
import {
  ArrowLeftRightIcon,
  ChevronDownIcon,
  ImageIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { QrColorField } from "@/features/qr-codes/components/qr-color-field";
import { QrFrameCarousel } from "@/features/qr-codes/components/qr-frame-carousel";
import {
  QR_COLOR_PRESETS,
  QR_DOT_STYLES,
  QR_EYE_STYLES,
  resolveQrCenterLogoUrl,
} from "@/lib/qr-codes/design";
import {
  FRAME_LABEL_MAX,
  frameUsesLabel,
  getQrFrame,
} from "@/lib/qr-codes/frames";
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

  const frameMeta = getQrFrame(design.frameId);
  const [framesOpen, setFramesOpen] = useState(design.frameId !== "none");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const companyLogo = companyLogoUrl?.trim() || null;
  const customLogo = design.logoUrl?.trim() || null;
  const activeLogo = resolveQrCenterLogoUrl(design, companyLogoUrl);
  const usingCustom = Boolean(customLogo);

  async function handleLogoUpload(file: File) {
    setUploading(true);
    const toastId = toast.loading("Uploading logo…");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/qr-codes/upload-image", {
        method: "POST",
        body,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Upload failed");
      const imageUrl = typeof data.imageUrl === "string" ? data.imageUrl : "";
      if (!imageUrl) throw new Error("Upload failed");
      onChange({ ...design, logoEnabled: true, logoUrl: imageUrl });
      toast.success("Logo uploaded", { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload logo", {
        id: toastId,
      });
    } finally {
      setUploading(false);
    }
  }

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

      <Collapsible
        open={framesOpen}
        onOpenChange={setFramesOpen}
        className="rounded-xl border border-border"
      >
        <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-muted/40">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Frame</p>
            <p className="truncate text-xs text-muted-foreground">
              {frameMeta.name}
              {frameMeta.id !== "none" ? ` · ${frameMeta.description}` : " · Optional border styles"}
            </p>
          </div>
          <ChevronDownIcon
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              framesOpen && "rotate-180",
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-border px-3 pb-3 pt-2">
          <QrFrameCarousel
            design={design}
            value={design.frameId}
            onChange={(frameId) => {
              onChange({ ...design, frameId });
              if (frameId !== "none") setFramesOpen(true);
            }}
            logoUrl={activeLogo}
          />
          {frameUsesLabel(design.frameId) && (
            <div className="mt-3 space-y-1.5">
              <Label htmlFor="qr-frame-label">Caption text</Label>
              <Input
                id="qr-frame-label"
                value={design.frameLabel}
                maxLength={FRAME_LABEL_MAX}
                onChange={(event) => set("frameLabel", event.target.value.slice(0, FRAME_LABEL_MAX))}
                placeholder="Scan me"
              />
              <p className="text-[11px] text-muted-foreground">
                {design.frameLabel.length}/{FRAME_LABEL_MAX}
              </p>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <section className="space-y-3 rounded-lg border border-border/70 px-3.5 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">Center logo</p>
            <p className="text-xs text-muted-foreground">
              Use your company logo or upload a different one for this QR.
            </p>
          </div>
          <Switch
            checked={design.logoEnabled}
            onCheckedChange={(checked) => {
              if (checked && !companyLogo && !customLogo) {
                onChange({ ...design, logoEnabled: true });
                fileInputRef.current?.click();
                return;
              }
              set("logoEnabled", checked);
            }}
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleLogoUpload(file);
            event.target.value = "";
          }}
        />

        {design.logoEnabled && (
          <div className="space-y-3 border-t border-border/70 pt-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!companyLogo}
                onClick={() =>
                  onChange({ ...design, logoEnabled: true, logoUrl: null })
                }
                className={cn(
                  "cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  !usingCustom && companyLogo
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/70 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  !companyLogo && "cursor-not-allowed opacity-50",
                )}
              >
                Company logo
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={cn(
                  "cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  usingCustom
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/70 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {uploading ? "Uploading…" : usingCustom ? "Replace upload" : "Upload logo"}
              </button>
            </div>

            {activeLogo ? (
              <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/20 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeLogo}
                  alt="QR center logo"
                  className="size-12 rounded-md bg-white object-contain p-1 ring-1 ring-border/60"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">
                    {usingCustom ? "Custom logo" : "Company logo"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Shown in the center of the code
                  </p>
                </div>
                {usingCustom && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove custom logo"
                    className="cursor-pointer"
                    onClick={() =>
                      onChange({
                        ...design,
                        logoUrl: null,
                        logoEnabled: Boolean(companyLogo),
                      })
                    }
                  >
                    <XIcon className="size-4" />
                  </Button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
                ) : (
                  <ImageIcon className="size-5 text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground">
                  {companyLogo
                    ? "Select company logo above, or upload a custom image"
                    : "Upload a PNG, JPEG, WebP, or GIF (max 2 MB)"}
                </span>
              </button>
            )}
          </div>
        )}
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
