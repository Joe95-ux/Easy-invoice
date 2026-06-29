import type { InvoiceHtmlData } from "@/lib/invoice-templates/types";

const LOGO_FETCH_TIMEOUT_MS = 12_000;

/**
 * WeasyPrint cannot fetch remote images reliably — inline logos as data URLs before PDF render.
 */
export async function inlineCompanyLogo(data: InvoiceHtmlData): Promise<InvoiceHtmlData> {
  const logoUrl = data.company.logoUrl;
  if (!logoUrl || logoUrl.startsWith("data:")) return data;

  try {
    const response = await fetch(logoUrl, {
      signal: AbortSignal.timeout(LOGO_FETCH_TIMEOUT_MS),
      headers: { Accept: "image/*" },
    });
    if (!response.ok) return data;

    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "image/png";
    if (!contentType.startsWith("image/")) return data;

    const base64 = Buffer.from(await response.arrayBuffer()).toString("base64");
    return {
      ...data,
      company: {
        ...data.company,
        logoUrl: `data:${contentType};base64,${base64}`,
      },
    };
  } catch {
    return data;
  }
}
