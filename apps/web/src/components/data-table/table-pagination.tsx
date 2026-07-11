"use client";

import { useMemo } from "react";
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
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

function buildPageRange(current: number, total: number): (number | "ellipsis-start" | "ellipsis-end")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis-start" | "ellipsis-end")[] = [1];

  if (current <= 4) {
    pages.push(2, 3, 4, 5, "ellipsis-end", total);
  } else if (current >= total - 3) {
    pages.push("ellipsis-start", total - 4, total - 3, total - 2, total - 1, total);
  } else {
    pages.push("ellipsis-start", current - 1, current, current + 1, "ellipsis-end", total);
  }

  return pages;
}

function buildMobilePageRange(current: number, total: number): (number | "ellipsis-start" | "ellipsis-end")[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis-start" | "ellipsis-end")[] = [1];

  if (current <= 3) {
    pages.push(2, 3, "ellipsis-end", total);
  } else if (current >= total - 2) {
    pages.push("ellipsis-start", total - 2, total - 1, total);
  } else {
    pages.push("ellipsis-start", current, "ellipsis-end", total);
  }

  return pages;
}

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
  const desktopPages = useMemo(() => buildPageRange(page, pageCount), [page, pageCount]);
  const mobilePages = useMemo(() => buildMobilePageRange(page, pageCount), [page, pageCount]);

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

        {/* Desktop pagination */}
        <ButtonGroup className="hidden sm:flex">
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
          {desktopPages.map((p, i) =>
            typeof p === "number" ? (
              <Button
                key={p}
                type="button"
                variant={p === page ? "default" : "outline"}
                size="icon-sm"
                onClick={() => onPageChange(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? "page" : undefined}
                className="tabular-nums"
              >
                {p}
              </Button>
            ) : (
              <span
                key={`${p}-${i}`}
                className="flex size-7 items-center justify-center text-muted-foreground"
                aria-hidden
              >
                <MoreHorizontalIcon className="size-4" />
              </span>
            ),
          )}
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

        {/* Mobile pagination */}
        <ButtonGroup className="flex sm:hidden">
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
          {mobilePages.map((p, i) =>
            typeof p === "number" ? (
              <Button
                key={p}
                type="button"
                variant={p === page ? "default" : "outline"}
                size="icon-sm"
                onClick={() => onPageChange(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? "page" : undefined}
                className="tabular-nums"
              >
                {p}
              </Button>
            ) : (
              <span
                key={`${p}-${i}`}
                className="flex size-7 items-center justify-center text-muted-foreground"
                aria-hidden
              >
                <MoreHorizontalIcon className="size-4" />
              </span>
            ),
          )}
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
