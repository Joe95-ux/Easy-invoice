import { runWithLoadingToast } from "@/lib/run-with-loading-toast";

export async function downloadEstimatePdf(
  estimateId: string,
  estimateNumber: string,
): Promise<void> {
  await runWithLoadingToast(
    {
      loading: "Generating estimate PDF…",
      success: "PDF downloaded",
      error: "Could not generate PDF. Is the ai-docs service running?",
    },
    async () => {
      const response = await fetch(`/api/estimates/${estimateId}/pdf`);
      if (!response.ok) throw new Error("Failed to generate PDF");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${estimateNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    },
  );
}
