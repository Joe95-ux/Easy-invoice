export async function uploadCompanyLogoFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/company/logo", {
    method: "POST",
    body: formData,
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Upload failed");
  return body.logoUrl as string;
}

export async function importCompanyLogoFromUrl(sourceUrl: string): Promise<string> {
  const response = await fetch("/api/company/logo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceUrl }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Import failed");
  return body.logoUrl as string;
}

export async function uploadPendingCompanyLogo(options: {
  file?: File | null;
  sourceUrl?: string | null;
}): Promise<string | null> {
  if (options.file) return uploadCompanyLogoFile(options.file);
  if (options.sourceUrl) return importCompanyLogoFromUrl(options.sourceUrl);
  return null;
}
