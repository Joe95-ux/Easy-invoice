"use client";

import { Fragment } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/invoices";
import {
  groupLineItemsIntoSections,
  hasNamedSections,
  sectionSubtotal,
} from "@/lib/line-item-sections";

export type DocumentLineItemRow = {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  sectionTitle?: string | null;
  sectionSortOrder?: number;
  sortOrder?: number;
};

type DocumentLineItemsTableProps = {
  items: DocumentLineItemRow[];
  currency: string;
  stickyColumnWidths?: [string, string];
};

export function DocumentLineItemsTable({
  items,
  currency,
  stickyColumnWidths = ["11rem", "4rem"],
}: DocumentLineItemsTableProps) {
  const showSections = hasNamedSections(items);
  const sections = showSections ? groupLineItemsIntoSections(items) : null;

  return (
    <Table stickyColumnWidths={stickyColumnWidths}>
      <TableHeader>
        <TableRow>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Rate</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sections
          ? sections.map((section) => {
              const subtotal = sectionSubtotal(section.items);
              const title = section.title.trim() || "Items";
              return (
                <Fragment key={section.key}>
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={4}
                      className="bg-muted/40 pt-4 pb-2 text-xs font-semibold tracking-wide text-foreground uppercase"
                    >
                      {title}
                    </TableCell>
                  </TableRow>
                  {section.items.map((item, index) => (
                    <TableRow key={`${section.key}-${index}`}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{Number(item.quantity)}</TableCell>
                      <TableCell className="text-right">
                        {formatMoney(item.unitPrice, currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(item.quantity * item.unitPrice, currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={3} className="text-muted-foreground">
                      {title} subtotal
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(subtotal, currency)}
                    </TableCell>
                  </TableRow>
                </Fragment>
              );
            })
          : items.map((item, index) => (
              <TableRow key={item.id ?? index}>
                <TableCell>{item.description}</TableCell>
                <TableCell className="text-right">{Number(item.quantity)}</TableCell>
                <TableCell className="text-right">
                  {formatMoney(item.unitPrice, currency)}
                </TableCell>
                <TableCell className="text-right">
                  {formatMoney(item.amount, currency)}
                </TableCell>
              </TableRow>
            ))}
      </TableBody>
    </Table>
  );
}
