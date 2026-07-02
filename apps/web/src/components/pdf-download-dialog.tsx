"use client";

import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { downloadEstimatePdf } from "@/lib/estimate-pdf-client";
import { downloadInvoicePdf } from "@/lib/invoice-pdf-client";
import { sanitizePdfFilename, suggestPdfFilename } from "@/lib/pdf-filename";
import type { PdfDownloadTarget } from "@/hooks/use-pdf-download";

type PdfDownloadDialogProps = {
  target: PdfDownloadTarget | null;
  onClose: () => void;
};

export function PdfDownloadDialog({ target, onClose }: PdfDownloadDialogProps) {
  const [filename, setFilename] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!target) return;
    setFilename(suggestPdfFilename(target.companyName, target.documentNumber));
  }, [target]);

  async function handleDownload() {
    if (!target) return;

    const safeName = sanitizePdfFilename(filename);
    if (!safeName) return;

    setDownloading(true);
    try {
      if (target.kind === "invoice") {
        await downloadInvoicePdf(target.documentId, safeName);
      } else {
        await downloadEstimatePdf(target.documentId, safeName);
      }
      onClose();
    } catch {
      // Toast handled in download helpers
    } finally {
      setDownloading(false);
    }
  }

  const label = target?.kind === "estimate" ? "Estimate" : "Invoice";

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Download PDF</DialogTitle>
          <DialogDescription>
            Choose a file name for {target?.documentNumber ?? "this document"}.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-2">
          <Label htmlFor="pdf-filename">File name</Label>
          <div className="flex items-center gap-2">
            <Input
              id="pdf-filename"
              value={filename}
              onChange={(event) => setFilename(event.target.value)}
              placeholder={`${label.toLowerCase()}-filename`}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleDownload();
              }}
            />
            <span className="shrink-0 text-sm text-muted-foreground">.pdf</span>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={downloading}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleDownload()}
            disabled={!sanitizePdfFilename(filename) || downloading}
          >
            {downloading ? "Generating..." : "Download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
