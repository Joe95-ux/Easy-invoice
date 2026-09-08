"use client";

import { useRef, useState } from "react";
import { ImagePlusIcon, Loader2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PublicFormImageUploadProps = {
  token: string;
  urls: string[];
  maxFiles: number;
  disabled?: boolean;
  description?: string | null;
  onChange: (urls: string[]) => void;
};

export function PublicFormImageUpload({
  token,
  urls,
  maxFiles,
  disabled = false,
  description,
  onChange,
}: PublicFormImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || disabled) return;
    const remaining = maxFiles - urls.length;
    if (remaining <= 0) {
      toast.error(`You can upload at most ${maxFiles} images`);
      return;
    }

    const selected = Array.from(fileList).slice(0, remaining);
    setUploading(true);
    try {
      const body = new FormData();
      for (const file of selected) body.append("files", file);
      const response = await fetch(`/api/public/forms/${token}/upload`, {
        method: "POST",
        body,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Upload failed");
      const nextUrls = [
        ...urls,
        ...((payload.images as Array<{ url: string }> | undefined)?.map((image) => image.url) ??
          []),
      ].slice(0, maxFiles);
      onChange(nextUrls);
      if (selected.length > remaining) {
        toast.message(`Only ${remaining} more image${remaining === 1 ? "" : "s"} could be added`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload images");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "flex flex-col gap-3 rounded-lg border border-dashed border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between",
          disabled && "opacity-60",
        )}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Upload images</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {description?.trim() ||
              `JPEG, PNG, WebP, or GIF · up to ${maxFiles} files · 5 MB each`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="sr-only"
            disabled={disabled || uploading || urls.length >= maxFiles}
            onChange={(event) => void handleFiles(event.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || uploading || urls.length >= maxFiles}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <ImagePlusIcon className="size-4" />
            )}
            {uploading ? "Uploading…" : "Choose files"}
          </Button>
        </div>
      </div>

      {urls.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {urls.map((url) => (
            <li key={url} className="group relative overflow-hidden rounded-lg border bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="aspect-square w-full object-cover" />
              {!disabled ? (
                <Button
                  type="button"
                  size="icon-xs"
                  variant="secondary"
                  className="absolute top-1.5 right-1.5 opacity-90 shadow-sm"
                  aria-label="Remove image"
                  onClick={() => onChange(urls.filter((item) => item !== url))}
                >
                  <XIcon className="size-3" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
