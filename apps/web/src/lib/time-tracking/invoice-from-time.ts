/** Build a new-invoice URL that jumps into the unbilled-time flow. */
export function invoiceFromTimeUrl(options: {
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
  return `/invoices/new?${params.toString()}`;
}
