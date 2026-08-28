"use client";

import Link from "next/link";
import { TablePagination } from "@/components/data-table/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useListTable } from "@/hooks/use-list-table";
import { estimateStatusLabel, estimateStatusVariant } from "@/lib/estimates";
import { formatMoney } from "@/lib/invoices";
import type { PortalEstimateListItem } from "@/lib/portal/types";
import type { EstimateStatus } from "@easy-invoice/db";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

type PortalEstimatesSectionProps = {
  estimates: PortalEstimateListItem[];
};

export function PortalEstimatesSection({ estimates }: PortalEstimatesSectionProps) {
  const table = useListTable<PortalEstimateListItem>({
    tableId: "portal-estimates",
    data: estimates,
    defaultSortKey: "validUntil",
    defaultSortDirection: "asc",
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    defaultPageSize: 25,
    getSortValue: (row, key) => {
      if (key === "validUntil") return row.validUntil ?? "";
      if (key === "total") return row.total;
      if (key === "number") return row.number;
      return (row as Record<string, unknown>)[key];
    },
  });

  return (
    <section className="space-y-3">
      <h2 className="font-heading text-lg font-semibold tracking-tight">Estimates</h2>
      {estimates.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No estimates yet.
        </p>
      ) : (
        <Card className="overflow-hidden py-0">
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {table.pageRows.map((estimate) => (
                <li key={estimate.id}>
                  <Link
                    href={estimate.href}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 sm:px-5"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{estimate.number}</p>
                        <Badge
                          variant={estimateStatusVariant(estimate.status as EstimateStatus)}
                          className="capitalize"
                        >
                          {estimateStatusLabel(estimate.status as EstimateStatus)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Valid until {formatDate(estimate.validUntil)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium tabular-nums">
                      {formatMoney(estimate.total, estimate.currency)}
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
