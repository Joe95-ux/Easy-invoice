"use client";

import { useEffect, useMemo, useState } from "react";
import {
  compareListValues,
  DEFAULT_PAGE_SIZE_OPTIONS,
  matchesSearchQuery,
  paginateRows,
  readStoredPageSize,
  type SortDirection,
  writeStoredPageSize,
} from "@/lib/table/list-table";

export type ListTableFilterOption = {
  value: string;
  label: string;
};

type UseListTableOptions<T extends object> = {
  tableId: string;
  data: T[];
  searchKeys?: (keyof T & string)[];
  filterOptions?: ListTableFilterOption[];
  defaultFilter?: string;
  filterFn?: (row: T, filter: string) => boolean;
  defaultSortKey?: string;
  defaultSortDirection?: SortDirection;
  getSortValue?: (row: T, key: string) => unknown;
  pageSizeOptions?: readonly number[];
  defaultPageSize?: number;
};

export function useListTable<T extends object>({
  tableId,
  data,
  searchKeys = [],
  filterOptions,
  defaultFilter = "all",
  filterFn,
  defaultSortKey,
  defaultSortDirection = "desc",
  getSortValue,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  defaultPageSize = DEFAULT_PAGE_SIZE_OPTIONS[0],
}: UseListTableOptions<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState(defaultFilter);
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(() =>
    readStoredPageSize(tableId, pageSizeOptions, defaultPageSize),
  );

  useEffect(() => {
    setPage(1);
  }, [searchQuery, filter, sortKey, sortDirection, pageSize, data.length]);

  const processedRows = useMemo(() => {
    let rows = data;

    if (searchQuery.trim() && searchKeys.length > 0) {
      rows = rows.filter((row) =>
        matchesSearchQuery(row as Record<string, unknown>, searchQuery, searchKeys as string[]),
      );
    }

    if (filterFn && filter !== defaultFilter) {
      rows = rows.filter((row) => filterFn(row, filter));
    }

    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const aValue = getSortValue
          ? getSortValue(a, sortKey)
          : (a as Record<string, unknown>)[sortKey];
        const bValue = getSortValue
          ? getSortValue(b, sortKey)
          : (b as Record<string, unknown>)[sortKey];
        return compareListValues(aValue, bValue, sortDirection);
      });
    }

    return rows;
  }, [
    data,
    searchQuery,
    searchKeys,
    filter,
    filterFn,
    defaultFilter,
    sortKey,
    sortDirection,
    getSortValue,
  ]);

  const pagination = useMemo(
    () => paginateRows(processedRows, page, pageSize),
    [processedRows, page, pageSize],
  );

  function toggleSort(key: string) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection("asc");
      return;
    }

    if (sortDirection === "asc") {
      setSortDirection("desc");
      return;
    }

    setSortKey(null);
    setSortDirection(defaultSortDirection);
  }

  function setPageSize(next: number) {
    setPageSizeState(next);
    writeStoredPageSize(tableId, next);
  }

  return {
    searchQuery,
    setSearchQuery,
    filter,
    setFilter,
    filterOptions,
    sortKey,
    sortDirection,
    toggleSort,
    page: pagination.page,
    setPage,
    pageSize,
    setPageSize,
    pageSizeOptions,
    pageRows: pagination.rows,
    totalCount: pagination.total,
    pageCount: pagination.pageCount,
    rangeStart: pagination.start,
    rangeEnd: pagination.end,
    hasActiveFilters:
      Boolean(searchQuery.trim()) || (filterFn != null && filter !== defaultFilter),
  };
}
