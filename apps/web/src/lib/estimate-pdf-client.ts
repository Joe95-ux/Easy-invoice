export async function downloadEstimatePdf(estimateId: string, estimateNumber: string): Promise<void> {
  const response = await fetch(`/api/estimates/${estimateId}/pdf`);
  if (!response.ok) throw new Error("Failed to generate PDF");

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${estimateNumber}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
