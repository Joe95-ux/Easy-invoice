"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { downloadEstimatePdf } from "@/lib/estimate-pdf-client";

type EstimateAutoDownloadProps = {
  estimateId: string;
  estimateNumber: string;
};

export function EstimateAutoDownload({ estimateId, estimateNumber }: EstimateAutoDownloadProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current || searchParams.get("download") !== "pdf") return;
    started.current = true;

    downloadEstimatePdf(estimateId, estimateNumber)
      .catch(() => {
        // Toast handled in downloadEstimatePdf
      })
      .finally(() => {
        router.replace(`/estimates/${estimateId}`, { scroll: false });
      });
  }, [estimateId, estimateNumber, router, searchParams]);

  return null;
}
