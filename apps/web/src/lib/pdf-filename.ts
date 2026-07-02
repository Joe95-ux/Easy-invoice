function slugifySegment(value: string, maxLength: number): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);
}

export function suggestPdfFilename(companyName: string, documentNumber: string): string {
  const company = slugifySegment(companyName, 60);
  const number = slugifySegment(documentNumber, 40);

  if (company && number) return `${company}-${number}`;
  return number || company || "document";
}

export function sanitizePdfFilename(input: string): string {
  const base = input
    .trim()
    .replace(/\.pdf$/i, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return base || "document";
}
