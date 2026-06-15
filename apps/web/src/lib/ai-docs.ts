import type { InvoiceDraft } from "@/lib/schemas/invoice";
import { invoiceDraftSchema } from "@/lib/schemas/invoice";

const AI_DOCS_URL = process.env.AI_DOCS_SERVICE_URL ?? "http://localhost:8000";
const AI_DOCS_SECRET = process.env.AI_DOCS_SERVICE_SECRET ?? "";

export async function parseInvoiceFromText(
  text: string,
  localeHint?: string,
): Promise<InvoiceDraft> {
  const response = await fetch(`${AI_DOCS_URL}/parse-invoice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Service-Secret": AI_DOCS_SECRET,
    },
    body: JSON.stringify({ text, locale_hint: localeHint }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI parse failed: ${error}`);
  }

  const data = await response.json();
  return invoiceDraftSchema.parse(data);
}

export async function renderInvoicePdf(html: string): Promise<Buffer> {
  const response = await fetch(`${AI_DOCS_URL}/render-pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Service-Secret": AI_DOCS_SECRET,
    },
    body: JSON.stringify({ html }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PDF render failed: ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
