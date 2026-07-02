"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type TablePaginationProps = {
  page: number;
  pageCount: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  totalCount: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  className?: string;
};

export function TablePagination({
  page,
  pageCount,
  pageSize,
  pageSizeOptions,
  totalCount,
  rangeStart,
  rangeEnd,
  onPageChange,
  onPageSizeChange,
  className,
}: TablePaginationProps) {
  if (totalCount === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-border/60 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-muted-foreground">
        {totalCount === 0
          ? "No results"
          : `Showing ${rangeStart}–${rangeEnd} of ${totalCount}`}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Rows</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => value && onPageSizeChange(Number(value))}
            items={pageSizeOptions.map((option) => ({
              value: String(option),
              label: String(option),
            }))}
          >
            <SelectTrigger
              className="data-[size=default]:h-7 w-[4.5rem] rounded-[min(var(--radius-md),12px)]"
              aria-label="Rows per page"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ButtonGroup>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <ButtonGroupText className="min-w-[3.5rem] justify-center px-2 tabular-nums">
            {page} / {pageCount}
          </ButtonGroupText>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
            aria-label="Next page"
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </ButtonGroup>
      </div>
    </div>
  );
}
