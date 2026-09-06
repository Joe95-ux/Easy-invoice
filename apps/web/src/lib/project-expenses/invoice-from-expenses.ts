/** Build a new-invoice URL that preloads billable project expenses as line items. */
export function invoiceFromExpensesUrl(options: {
  clientId: string;
  expenseIds: string[];
  projectId?: string;
}) {
  const params = new URLSearchParams({
    clientId: options.clientId,
  });
  if (options.expenseIds.length) {
    params.set("expenseIds", options.expenseIds.join(","));
  }
  if (options.projectId) {
    params.set("projectId", options.projectId);
  }
  return `/invoices/new?${params.toString()}`;
}
