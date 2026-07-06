"use client";

import { useEffect, useMemo, useState } from "react";
import { TablePagination } from "@/components/data-table/table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ClientRevenueRow } from "@/features/analytics/types";
import { formatMoney } from "@/lib/invoices";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 10;

type TopClientsTableProps = {
  clients: ClientRevenueRow[];
  currency: string;
};

export function TopClientsTable({ clients, currency }: TopClientsTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const totalCount = clients.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  const pageClients = useMemo(() => {
    const start = (page - 1) * pageSize;
    return clients.slice(start, start + pageSize);
  }, [clients, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  if (clients.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Client revenue will appear once payments are recorded.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Clients by revenue</h3>
        <span className="text-xs text-muted-foreground">
          {totalCount} client{totalCount === 1 ? "" : "s"}
        </span>
      </div>

      <Table stickyColumns={1} stickyColumnWidths={["12rem"]} surface="background">
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Invoices</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageClients.map((client) => (
            <TableRow key={client.id}>
              <TableCell className="font-medium">{client.name}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(client.revenue, currency)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {client.invoiceCount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
        className="border-0 px-0"
      />
    </div>
  );
}
