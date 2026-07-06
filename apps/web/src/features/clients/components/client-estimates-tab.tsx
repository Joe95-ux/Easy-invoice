"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TablePagination } from "@/components/data-table/table-pagination";
import { Card } from "@/components/ui/card";
import { ClientEstimatesTable } from "@/features/clients/components/client-estimates-table";
import type { ClientEstimateRow } from "@/lib/clients/financial-profile";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 10;

type ClientEstimatesTabProps = {
  estimates: ClientEstimateRow[];
  companyName: string;
  clientId: string;
};

export function ClientEstimatesTab({
  estimates,
  companyName,
  clientId,
}: ClientEstimatesTabProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const totalCount = estimates.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  const pageEstimates = useMemo(() => {
    const start = (page - 1) * pageSize;
    return estimates.slice(start, start + pageSize);
  }, [estimates, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  if (estimates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
        <p className="text-sm font-medium">No estimates yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Send a quote before invoicing this client.
        </p>
        <Link
          href={`/estimates/new?clientId=${clientId}`}
          className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
        >
          Create estimate
        </Link>
      </div>
    );
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <ClientEstimatesTable estimates={pageEstimates} companyName={companyName} />
      <TablePagination
        page={page}
        pageCount={pageCount}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        totalCount={totalCount}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </Card>
  );
}
