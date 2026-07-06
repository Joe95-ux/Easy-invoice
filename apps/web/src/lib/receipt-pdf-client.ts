import { sanitizePdfFilename } from "@/lib/pdf-filename";
import { runWithLoadingToast } from "@/lib/run-with-loading-toast";

export async function downloadReceiptPdf(
  invoiceId: string,
  paymentId: string,
  filename: string,
): Promise<void> {
  const safeName = sanitizePdfFilename(filename);

  await runWithLoadingToast(
    {
      loading: "Generating receipt PDF…",
      success: "PDF downloaded",
      error: "Could not generate receipt PDF. Is the ai-docs service running?",
    },
    async () => {
      const response = await fetch(
        `/api/invoices/${invoiceId}/payments/${paymentId}/receipt/pdf`,
      );
      if (!response.ok) throw new Error("Failed to generate PDF");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeName}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    },
  );
}
