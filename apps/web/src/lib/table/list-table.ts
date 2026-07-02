export type SortDirection = "asc" | "desc";

export const DEFAULT_PAGE_SIZE_OPTIONS = [15, 25, 50] as const;

export function compareListValues(
  a: unknown,
  b: unknown,
  direction: SortDirection,
): number {
  const factor = direction === "asc" ? 1 : -1;
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") {
    return (a - b) * factor;
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true }) * factor;
}

export function matchesSearchQuery(
  row: Record<string, unknown>,
  query: string,
  keys: string[],
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return keys.some((key) => {
    const value = row[key];
    if (value == null) return false;
    return String(value).toLowerCase().includes(normalized);
  });
}

export function paginateRows<T>(rows: T[], page: number, pageSize: number) {
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), pageCount);
  const start = (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);

  return {
    rows: rows.slice(start, end),
    total,
    pageCount,
    page: safePage,
    start: total === 0 ? 0 : start + 1,
    end,
  };
}

export function readStoredPageSize(
  tableId: string,
  options: readonly number[],
  fallback: number,
): number {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(`list-table:${tableId}:page-size`);
    const parsed = stored ? Number(stored) : fallback;
    return options.includes(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function writeStoredPageSize(tableId: string, pageSize: number) {
  try {
    localStorage.setItem(`list-table:${tableId}:page-size`, String(pageSize));
  } catch {
    // ignore quota / private mode
  }
}
