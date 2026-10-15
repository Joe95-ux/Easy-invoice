import { sanitizePdfFilename } from "@/lib/pdf-filename";
import { runWithLoadingToast } from "@/lib/run-with-loading-toast";

async function fetchAndSaveCreditNotePdf(id: string, filename: string): Promise<void> {
  const safeName = sanitizePdfFilename(filename);
  const response = await fetch(`/api/credit-notes/${id}/pdf`);
  if (!response.ok) throw new Error("Failed to generate PDF");

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeName}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadCreditNotePdf(id: string, filename: string): Promise<void> {
  await runWithLoadingToast(
    {
      loading: "Generating credit note PDF…",
      success: "PDF downloaded",
      error: "Could not generate PDF. Is the ai-docs service running?",
    },
    () => fetchAndSaveCreditNotePdf(id, filename),
  );
}
