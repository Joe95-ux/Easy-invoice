/** Normalize AI / user date strings to YYYY-MM-DD for form date pickers. */
export function normalizeDraftDate(value: unknown): string | null | undefined {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString().slice(0, 10);
}
