/** Build a new-estimate URL that jumps into the unbilled-time flow. */
export function estimateFromTimeUrl(options: {
  clientId: string;
  timeEntryIds?: string[];
  openPicker?: boolean;
}) {
  const params = new URLSearchParams({
    clientId: options.clientId,
    addTime: options.openPicker ? "1" : "0",
  });
  if (options.timeEntryIds?.length) {
    params.set("timeEntryIds", options.timeEntryIds.join(","));
    params.set("addTime", "0");
  }
  return `/estimates/new?${params.toString()}`;
}
