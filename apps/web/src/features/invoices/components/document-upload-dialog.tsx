"use client";

import { useEffect, useState } from "react";
import { FileTextIcon, ListIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { DocumentExtractionMode } from "@/lib/schemas/invoice";

type DocumentUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  variant: "invoice" | "estimate";
  defaultMode?: DocumentExtractionMode;
  knownClientName?: string;
  onConfirm: (mode: DocumentExtractionMode) => Promise<void>;
};

const modeOptions: Array<{
  value: DocumentExtractionMode;
  title: string;
  description: string;
  icon: typeof FileTextIcon;
}> = [
  {
    value: "full",
    title: "Full document",
    description:
      "Extract client details, dates, line items, amounts, tax, discount, and notes from an old invoice or estimate PDF.",
    icon: FileTextIcon,
  },
  {
    value: "lines_only",
    title: "Line items only",
    description:
      "Import just the products or services and amounts. Keep the client and dates already on your form.",
    icon: ListIcon,
  },
];

export function DocumentUploadDialog({
  open,
  onOpenChange,
  file,
  variant,
  defaultMode = "full",
  knownClientName,
  onConfirm,
}: DocumentUploadDialogProps) {
  const [mode, setMode] = useState<DocumentExtractionMode>(defaultMode);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode(defaultMode);
    setLoading(false);
  }, [open, defaultMode, file?.name]);

  async function handleExtract() {
    setLoading(true);
    try {
      await onConfirm(mode);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  const documentLabel = variant === "estimate" ? "estimate" : "invoice";

  return (
    <Dialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Extract from document</DialogTitle>
          <DialogDescription>
            {file
              ? `Choose what to import from ${file.name} into this ${documentLabel}.`
              : `Choose what to import into this ${documentLabel}.`}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-3">
          {knownClientName && (
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              Current client: <span className="font-medium text-foreground">{knownClientName}</span>
            </p>
          )}

          <div className="space-y-2">
            <Label>What should we extract?</Label>
            <div className="grid gap-2">
              {modeOptions.map((option) => {
                const Icon = option.icon;
                const selected = mode === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={loading}
                    onClick={() => setMode(option.value)}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/40",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                        selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="space-y-1">
                      <span className="block text-sm font-medium">{option.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={() => void handleExtract()} disabled={!file || loading}>
            {loading && <Loader2Icon className="size-4 animate-spin" />}
            Extract data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
