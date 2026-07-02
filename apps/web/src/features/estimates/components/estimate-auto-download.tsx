"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { usePdfDownload } from "@/hooks/use-pdf-download";

type EstimateAutoDownloadProps = {
  estimateId: string;
  estimateNumber: string;
  companyName: string;
};

export function EstimateAutoDownload({
  estimateId,
  estimateNumber,
  companyName,
}: EstimateAutoDownloadProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const started = useRef(false);
  const { openPdfDownload, pdfDownloadDialog } = usePdfDownload();

  useEffect(() => {
    if (started.current || searchParams.get("download") !== "pdf") return;
    started.current = true;

    openPdfDownload({
      kind: "estimate",
      documentId: estimateId,
      documentNumber: estimateNumber,
      companyName,
    });
    router.replace(`/estimates/${estimateId}`, { scroll: false });
  }, [companyName, estimateId, estimateNumber, openPdfDownload, router, searchParams]);

  return pdfDownloadDialog;
}
