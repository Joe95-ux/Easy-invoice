"use client";

import { useCallback, useState } from "react";
import { PdfDownloadDialog } from "@/components/pdf-download-dialog";

export type PdfDownloadTarget = {
  kind: "invoice" | "estimate";
  documentId: string;
  documentNumber: string;
  companyName: string;
};

export function usePdfDownload() {
  const [target, setTarget] = useState<PdfDownloadTarget | null>(null);

  const openPdfDownload = useCallback((next: PdfDownloadTarget) => {
    setTarget(next);
  }, []);

  const closePdfDownload = useCallback(() => {
    setTarget(null);
  }, []);

  const pdfDownloadDialog = (
    <PdfDownloadDialog target={target} onClose={closePdfDownload} />
  );

  return { openPdfDownload, pdfDownloadDialog };
}
