"use client";

import { useEffect, useMemo, useState } from "react";
import { TablePagination } from "@/components/data-table/table-pagination";
import { Card } from "@/components/ui/card";
import { ClientReceiptsTable } from "@/features/clients/components/client-receipts-table";
import type { ClientReceiptRow } from "@/lib/clients/financial-profile";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 10;

type ClientReceiptsTabProps = {
  receipts: ClientReceiptRow[];
};

export function ClientReceiptsTab({ receipts }: ClientReceiptsTabProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const totalCount = receipts.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  const pageReceipts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return receipts.slice(start, start + pageSize);
  }, [receipts, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  if (receipts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
        <p className="text-sm font-medium">No receipts yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Receipts are issued automatically when payments are recorded on sent invoices.
        </p>
      </div>
    );
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <ClientReceiptsTable receipts={pageReceipts} />
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
