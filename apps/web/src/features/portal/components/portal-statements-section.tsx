"use client";

import Link from "next/link";
import { TablePagination } from "@/components/data-table/table-pagination";
import { Card, CardContent } from "@/components/ui/card";
import { useListTable } from "@/hooks/use-list-table";
import { formatDate, formatMoney } from "@/lib/invoices";
import type { PortalStatementListItem } from "@/lib/portal/types";
import { withPortalReturn } from "@/lib/portal/urls";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

type PortalStatementsSectionProps = {
  statements: PortalStatementListItem[];
};

export function PortalStatementsSection({ statements }: PortalStatementsSectionProps) {
  const table = useListTable<PortalStatementListItem>({
    tableId: "portal-statements",
    data: statements,
    defaultSortKey: "issuedAt",
    defaultSortDirection: "desc",
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    defaultPageSize: 25,
    getSortValue: (row, key) => {
      if (key === "issuedAt") return row.issuedAt;
      if (key === "totalDue") return row.totalDue;
      if (key === "number") return row.number;
      return (row as Record<string, unknown>)[key];
    },
  });

  return (
    <section className="space-y-3">
      <h2 className="font-heading text-lg font-semibold tracking-tight">Statements</h2>
      {statements.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No statements yet.
        </p>
      ) : (
        <Card className="overflow-hidden py-0">
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {table.pageRows.map((statement) => (
                <li key={statement.id}>
                  <Link
                    href={withPortalReturn(statement.href)}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{statement.number}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Issued {formatDate(statement.issuedAt)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium tabular-nums">
                      {formatMoney(statement.totalDue, statement.currency)}
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
