"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { usePdfDownload } from "@/hooks/use-pdf-download";

type InvoiceAutoDownloadProps = {
  invoiceId: string;
  invoiceNumber: string;
  companyName: string;
};

export function InvoiceAutoDownload({
  invoiceId,
  invoiceNumber,
  companyName,
}: InvoiceAutoDownloadProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const started = useRef(false);
  const { openPdfDownload, pdfDownloadDialog } = usePdfDownload();

  useEffect(() => {
    if (started.current || searchParams.get("download") !== "pdf") return;
    started.current = true;

    openPdfDownload({
      kind: "invoice",
      documentId: invoiceId,
      documentNumber: invoiceNumber,
      companyName,
    });
    router.replace(`/invoices/${invoiceId}`, { scroll: false });
  }, [companyName, invoiceId, invoiceNumber, openPdfDownload, router, searchParams]);

  return pdfDownloadDialog;
}
