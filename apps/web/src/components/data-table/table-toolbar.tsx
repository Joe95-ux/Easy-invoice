"use client";

import { SearchIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ListTableFilterOption } from "@/hooks/use-list-table";
import { cn } from "@/lib/utils";

type TableToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filter?: string;
  onFilterChange?: (value: string) => void;
  filterOptions?: ListTableFilterOption[];
  filterLabel?: string;
  /** Optional trailing actions (e.g. Export). */
  actions?: ReactNode;
  className?: string;
};

export function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  filter,
  onFilterChange,
  filterOptions,
  filterLabel = "Filter",
  actions,
  className,
}: TableToolbarProps) {
  const showFilter = filterOptions && filterOptions.length > 0 && onFilterChange;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-center",
        className,
      )}
    >
      <div className="relative min-w-0 flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-8 pl-8"
          aria-label={searchPlaceholder}
        />
      </div>

      {showFilter || actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {showFilter ? (
            <Select
              value={filter}
              onValueChange={(value) => value && onFilterChange(value)}
              items={filterOptions}
            >
              <SelectTrigger size="sm" className="w-full sm:w-[9.5rem]" aria-label={filterLabel}>
                <SelectValue placeholder={filterLabel} />
              </SelectTrigger>
              <SelectContent align="end">
                {filterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {actions}
        </div>
      ) : null}
    </div>
  );
}
