"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type CompanyLogoUploadProps = {
  logoUrl: string | null;
  onLogoChange: (url: string | null) => void;
};

export function CompanyLogoUpload({ logoUrl, onLogoChange }: CompanyLogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/company/logo", {
        method: "POST",
        body: formData,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Upload failed");

      onLogoChange(body.logoUrl);
      toast.success("Logo uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload logo");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setUploading(true);
    try {
      const response = await fetch("/api/company/logo", { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to remove logo");

      onLogoChange(body.logoUrl);
      toast.success("Logo removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove logo");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Label>Company logo</Label>

      {logoUrl ? (
        <img
          src={logoUrl}
          alt="Company logo"
          className="h-16 w-auto max-w-[200px] rounded-md border border-border object-contain p-1"
        />
      ) : (
        <div className="flex h-16 w-32 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
          No logo
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Uploading..." : logoUrl ? "Replace logo" : "Upload logo"}
        </Button>
        {logoUrl && (
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

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      <p className="text-xs text-muted-foreground">
        PNG, JPG, WebP, or GIF up to 2 MB. Appears on invoice PDFs.
      </p>
    </div>
  );
}
