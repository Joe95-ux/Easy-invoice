"use client";

import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import type { SortDirection } from "@/lib/table/list-table";
import { cn } from "@/lib/utils";

type SortableTableHeadProps = {
  label: string;
  column: string;
  sortKey: string | null;
  sortDirection: SortDirection;
  onSort: (column: string) => void;
  className?: string;
};

export function SortableTableHead({
  label,
  column,
  sortKey,
  sortDirection,
  onSort,
  className,
}: SortableTableHeadProps) {
  const isActive = sortKey === column;
  const Icon = !isActive ? ArrowUpDownIcon : sortDirection === "asc" ? ArrowUpIcon : ArrowDownIcon;

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1 rounded-sm text-inherit transition-colors hover:text-foreground",
          isActive ? "text-foreground" : "text-foreground/80",
        )}
      >
        {label}
        <Icon className={cn("size-3.5", !isActive && "opacity-40")} />
      </button>
    </TableHead>
  );
}
