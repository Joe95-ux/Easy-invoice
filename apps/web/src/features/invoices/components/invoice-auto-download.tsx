"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { downloadInvoicePdf } from "@/lib/invoice-pdf-client";

type InvoiceAutoDownloadProps = {
  invoiceId: string;
  invoiceNumber: string;
};

export function InvoiceAutoDownload({ invoiceId, invoiceNumber }: InvoiceAutoDownloadProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current || searchParams.get("download") !== "pdf") return;
    started.current = true;

    downloadInvoicePdf(invoiceId, invoiceNumber)
      .catch(() => {
        // Toast handled in downloadInvoicePdf
      })
      .finally(() => {
        router.replace(`/invoices/${invoiceId}`, { scroll: false });
      });
  }, [invoiceId, invoiceNumber, router, searchParams]);

  return null;
}
