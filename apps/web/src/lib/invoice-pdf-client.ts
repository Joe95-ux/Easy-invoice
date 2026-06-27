export async function downloadInvoicePdf(invoiceId: string, invoiceNumber: string): Promise<void> {
  const response = await fetch(`/api/invoices/${invoiceId}/pdf`);
  if (!response.ok) throw new Error("Failed to generate PDF");

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${invoiceNumber}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
