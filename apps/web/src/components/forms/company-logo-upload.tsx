"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, UploadIcon, UserRoundIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import {
  importCompanyLogoFromUrl,
  uploadCompanyLogoFile,
} from "@/lib/company-logo-client";
import {
  logoPreviewClassName,
  normalizeLogoBg,
  type LogoBg,
} from "@/lib/company-branding";
import { cn } from "@/lib/utils";

type CompanyLogoUploadProps = {
  logoUrl: string | null;
  onLogoChange: (url: string | null) => void;
  logoBg?: LogoBg;
  mode?: "immediate" | "deferred";
  onPendingFileChange?: (file: File | null) => void;
  onSuggestedLogoSelect?: (selected: boolean) => void;
  suggestedImageUrl?: string | null;
  className?: string;
};

export function CompanyLogoUpload({
  logoUrl,
  onLogoChange,
  logoBg = "white",
  mode = "immediate",
  onPendingFileChange,
  onSuggestedLogoSelect,
  suggestedImageUrl,
  className,
}: CompanyLogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(logoUrl);
  const [usingSuggested, setUsingSuggested] = useState(false);

  useEffect(() => {
    setPreviewUrl(logoUrl);
  }, [logoUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function applyFile(file: File) {
    if (mode === "deferred") {
      onPendingFileChange?.(file);
      onSuggestedLogoSelect?.(false);
      setUsingSuggested(false);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      return;
    }

    setUploading(true);
    try {
      const url = await uploadCompanyLogoFile(file);
      onLogoChange(url);
      setPreviewUrl(url);
      toast.success("Logo uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload logo");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleUseSuggested() {
    if (!suggestedImageUrl) return;

    if (mode === "deferred") {
      onPendingFileChange?.(null);
      onSuggestedLogoSelect?.(true);
      setUsingSuggested(true);
      setPreviewUrl(suggestedImageUrl);
      return;
    }

    setUploading(true);
    try {
      const url = await importCompanyLogoFromUrl(suggestedImageUrl);
      onLogoChange(url);
      setPreviewUrl(url);
      setUsingSuggested(true);
      toast.success("Profile photo added as logo");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not import logo");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    if (mode === "deferred") {
      onPendingFileChange?.(null);
      onSuggestedLogoSelect?.(false);
      setUsingSuggested(false);
      setPreviewUrl(null);
      onLogoChange(null);
      return;
    }

    setUploading(true);
    try {
      const response = await fetch("/api/company/logo", { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to remove logo");

      onLogoChange(body.logoUrl);
      setPreviewUrl(null);
      setUsingSuggested(false);
      toast.success("Logo removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove logo");
    } finally {
      setUploading(false);
    }
  }

  const previewBackground = logoPreviewClassName(normalizeLogoBg(logoBg));

  return (
    <Field className={className}>
      <FieldLabel>Company logo</FieldLabel>
      <FieldContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div
            className={cn(
              "flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1",
              previewBackground,
              previewUrl
                ? "border border-border/60"
                : "border border-dashed border-border/80",
            )}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Company logo preview"
                className="size-full object-contain p-2"
              />
            ) : (
              <ImageIcon className="size-8 text-muted-foreground/70" />
            )}
          </div>

          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
              >
                <UploadIcon className="size-4" />
                {uploading ? "Uploading..." : previewUrl ? "Replace logo" : "Upload logo"}
              </Button>

              {suggestedImageUrl && !usingSuggested && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={uploading}
                  onClick={handleUseSuggested}
                >
                  <UserRoundIcon className="size-4" />
                  Use profile photo
                </Button>
              )}

              {previewUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={uploading}
                  onClick={handleRemove}
                >
                  Remove
                </Button>
              )}
            </div>

            <FieldDescription>
              PNG, JPG, WebP, or GIF up to 2 MB. Shown on invoices and PDFs.
              {mode === "deferred" && " Logo is saved when you finish setup."}
            </FieldDescription>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void applyFile(file);
          }}
        />
      </FieldContent>
    </Field>
  );
}
