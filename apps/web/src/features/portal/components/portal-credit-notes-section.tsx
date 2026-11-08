"use client";

import Link from "next/link";
import { TablePagination } from "@/components/data-table/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useListTable } from "@/hooks/use-list-table";
import {
  creditNoteKindLabel,
  creditNoteStatusLabel,
  creditNoteStatusVariant,
} from "@/lib/credit-note-display";
import { formatDate, formatMoney } from "@/lib/invoices";
import type { PortalCreditNoteListItem } from "@/lib/portal/types";
import { withPortalReturn } from "@/lib/portal/urls";
import type { CreditNoteKind, CreditNoteStatus } from "@easy-invoice/db";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

type PortalCreditNotesSectionProps = {
  creditNotes: PortalCreditNoteListItem[];
};

export function PortalCreditNotesSection({ creditNotes }: PortalCreditNotesSectionProps) {
  const table = useListTable<PortalCreditNoteListItem>({
    tableId: "portal-credit-notes",
    data: creditNotes,
    defaultSortKey: "issuedAt",
    defaultSortDirection: "desc",
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    defaultPageSize: 25,
    getSortValue: (row, key) => {
      if (key === "issuedAt") return row.issuedAt;
      if (key === "total") return row.total;
      if (key === "number") return row.number;
      return (row as Record<string, unknown>)[key];
    },
  });

  return (
    <section className="space-y-3">
      <h2 className="font-heading text-lg font-semibold tracking-tight">Credit notes</h2>
      {creditNotes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No credit notes yet.
        </p>
      ) : (
        <Card className="overflow-hidden py-0">
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {table.pageRows.map((note) => (
                <li key={note.id}>
                  <Link
                    href={withPortalReturn(note.href)}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 sm:px-5"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{note.number}</p>
                        <Badge
                          variant={creditNoteStatusVariant(note.status as CreditNoteStatus)}
                          className="capitalize"
                        >
                          {creditNoteStatusLabel(note.status as CreditNoteStatus)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {creditNoteKindLabel(note.kind as CreditNoteKind)} for {note.invoiceNumber}
                        {" · "}
                        Issued {formatDate(note.issuedAt)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium tabular-nums">
                      {formatMoney(note.total, note.currency)}
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
