"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TablePagination } from "@/components/data-table/table-pagination";
import { Card } from "@/components/ui/card";
import { ClientInvoicesTable } from "@/features/clients/components/client-invoices-table";
import type { ClientInvoiceRow } from "@/lib/clients/financial-profile";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 10;

type ClientInvoicesTabProps = {
  invoices: ClientInvoiceRow[];
  companyName: string;
  clientEmail?: string | null;
  clientId: string;
};

export function ClientInvoicesTab({
  invoices,
  companyName,
  clientEmail,
  clientId,
}: ClientInvoicesTabProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const totalCount = invoices.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  const pageInvoices = useMemo(() => {
    const start = (page - 1) * pageSize;
    return invoices.slice(start, start + pageSize);
  }, [invoices, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  if (invoices.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
        <p className="text-sm font-medium">No invoices yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create an invoice for this client to start tracking billing.
        </p>
        <Link
          href={`/invoices/new?clientId=${clientId}`}
          className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
        >
          Create invoice
        </Link>
      </div>
    );
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <ClientInvoicesTable
        invoices={pageInvoices}
        companyName={companyName}
        clientEmail={clientEmail}
        detailed
      />
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
