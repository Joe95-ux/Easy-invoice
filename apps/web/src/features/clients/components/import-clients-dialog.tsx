"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2Icon, UploadIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import {
  MAX_CLIENT_IMPORT_ROWS,
  parseClientsCsvText,
} from "@/features/clients/lib/import-clients-csv";

type ImportClientsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Preview = {
  fileName: string;
  csv: string;
  validCount: number;
  errorCount: number;
  emptyCount: number;
  sampleErrors: Array<{ line: number; message: string }>;
};

export function ImportClientsDialog({
  open,
  onOpenChange,
}: ImportClientsDialogProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setPreview(null);
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [open]);

  async function handleFile(file: File | null) {
    if (!file) {
      setPreview(null);
      return;
    }
    if (!file.name.toLowerCase().endsWith(".csv") && file.type && !file.type.includes("csv")) {
      toast.error("Choose a .csv file");
      return;
    }
    if (file.size > 2_000_000) {
      toast.error("CSV must be under 2 MB");
      return;
    }

    const text = await file.text();
    const parsed = parseClientsCsvText(text);
    if (parsed.rows.length === 0 && parsed.errors.length > 0) {
      toast.error(parsed.errors[0]?.message ?? "Could not read CSV");
      setPreview(null);
      return;
    }

    setPreview({
      fileName: file.name,
      csv: text,
      validCount: parsed.rows.length,
      errorCount: parsed.errors.length,
      emptyCount: parsed.skippedEmpty,
      sampleErrors: parsed.errors.slice(0, 5),
    });
  }

  async function handleImport() {
    if (!preview || preview.validCount === 0) {
      toast.error("Choose a CSV with at least one valid client row");
      return;
    }

    setBusy(true);
    const toastId = toast.loading("Importing clients…");
    try {
      const res = await fetch("/api/clients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: preview.csv }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Import failed",
        );
      }

      const created = Number(data.created ?? 0);
      const skipped = Number(data.skippedDuplicates ?? 0);
      if (created === 0 && skipped > 0) {
        toast.success(
          `No new clients — skipped ${skipped} duplicate email${skipped === 1 ? "" : "s"}`,
          { id: toastId },
        );
      } else {
        const parts = [
          `Imported ${created} client${created === 1 ? "" : "s"}`,
        ];
        if (skipped > 0) {
          parts.push(
            `skipped ${skipped} duplicate email${skipped === 1 ? "" : "s"}`,
          );
        }
        toast.success(parts.join(" — "), { id: toastId });
      }
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed", {
        id: toastId,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import clients</DialogTitle>
          <DialogDescription>
            Upload a CSV with a Name column. Email is optional — matching emails
            already in this workspace are skipped. Max {MAX_CLIENT_IMPORT_ROWS}{" "}
            rows.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-4">
          <Input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            disabled={busy}
            onChange={(event) => {
              void handleFile(event.target.files?.[0] ?? null);
            }}
          />

          {preview ? (
            <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-3 text-sm">
              <p className="font-medium text-foreground">{preview.fileName}</p>
              <p className="text-muted-foreground">
                {preview.validCount} ready to import
                {preview.errorCount > 0
                  ? ` · ${preview.errorCount} row${preview.errorCount === 1 ? "" : "s"} with errors`
                  : ""}
                {preview.emptyCount > 0
                  ? ` · ${preview.emptyCount} empty skipped`
                  : ""}
              </p>
              {preview.sampleErrors.length > 0 ? (
                <ul className="space-y-1 text-xs text-destructive">
                  {preview.sampleErrors.map((err) => (
                    <li key={`${err.line}-${err.message}`}>
                      Line {err.line}: {err.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tip: export clients first to get a matching header row, or use
              Name and Email columns from your CRM.
            </p>
          )}
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy || !preview || preview.validCount === 0}
            onClick={() => void handleImport()}
          >
            {busy ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <UploadIcon className="size-4" />
            )}
            Import
            {preview && preview.validCount > 0 ? ` (${preview.validCount})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
