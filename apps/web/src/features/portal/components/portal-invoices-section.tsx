"use client";

import Link from "next/link";
import { TablePagination } from "@/components/data-table/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useListTable } from "@/hooks/use-list-table";
import { formatMoney, invoiceStatusLabel, invoiceStatusVariant } from "@/lib/invoices";
import type { PortalInvoiceListItem } from "@/lib/portal/types";
import { withPortalReturn } from "@/lib/portal/urls";
import type { InvoiceStatus } from "@easy-invoice/db";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

type PortalInvoicesSectionProps = {
  invoices: PortalInvoiceListItem[];
};

export function PortalInvoicesSection({ invoices }: PortalInvoicesSectionProps) {
  const openCount = invoices.filter((row) => row.balanceDue > 0.001).length;
  const paidCount = invoices.length - openCount;

  const table = useListTable<PortalInvoiceListItem>({
    tableId: "portal-invoices",
    data: invoices,
    defaultSortKey: "dueDate",
    defaultSortDirection: "asc",
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    defaultPageSize: 25,
    getSortValue: (row, key) => {
      if (key === "dueDate") return row.dueDate ?? "";
      if (key === "total") return row.total;
      if (key === "number") return row.number;
      return (row as Record<string, unknown>)[key];
    },
  });

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold tracking-tight">Invoices</h2>
        <p className="text-xs text-muted-foreground">
          {openCount} open · {paidCount} paid
        </p>
      </div>
      {invoices.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No invoices yet.
        </p>
      ) : (
        <Card className="overflow-hidden py-0">
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {table.pageRows.map((invoice) => (
                <li key={invoice.id}>
                  <Link
                    href={withPortalReturn(invoice.href)}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 sm:px-5"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{invoice.number}</p>
                        <Badge
                          variant={invoiceStatusVariant(invoice.status as InvoiceStatus)}
                          className="capitalize"
                        >
                          {invoiceStatusLabel(invoice.status as InvoiceStatus)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Due {formatDate(invoice.dueDate)}
                        {invoice.balanceDue > 0.001
                          ? ` · ${formatMoney(invoice.balanceDue, invoice.currency)} left`
                          : " · Paid"}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium tabular-nums">
                      {formatMoney(invoice.total, invoice.currency)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
            <TablePagination
              page={table.page}
              pageCount={table.pageCount}
              pageSize={table.pageSize}
              pageSizeOptions={table.pageSizeOptions}
              totalCount={table.totalCount}
              rangeStart={table.rangeStart}
              rangeEnd={table.rangeEnd}
              onPageChange={table.setPage}
              onPageSizeChange={table.setPageSize}
            />
          </CardContent>
        </Card>
      )}
    </section>
  );
}
