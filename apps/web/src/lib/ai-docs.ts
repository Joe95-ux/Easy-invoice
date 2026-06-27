import type { InvoiceDraft } from "@/lib/schemas/invoice";
import { invoiceDraftSchema } from "@/lib/schemas/invoice";

const AI_DOCS_URL = process.env.AI_DOCS_SERVICE_URL ?? "http://localhost:8000";
const AI_DOCS_SECRET = process.env.AI_DOCS_SERVICE_SECRET ?? "";

export type ParseInvoiceContext = {
  localeHint?: string;
  companyName?: string;
  companyCurrency?: string;
  outputLanguage?: string;
  referenceDate?: string;
};

export async function parseInvoiceFromText(
  text: string,
  context: ParseInvoiceContext = {},
): Promise<InvoiceDraft> {
  const response = await fetch(`${AI_DOCS_URL}/parse-invoice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Service-Secret": AI_DOCS_SECRET,
    },
    body: JSON.stringify({
      text,
      locale_hint: context.localeHint,
      company_name: context.companyName,
      company_currency: context.companyCurrency,
      output_language: context.outputLanguage ?? "en",
      reference_date: context.referenceDate,
    }),
  });

  if (!response.ok) {
    let message = `AI parse failed (${response.status})`;
    try {
      const data = (await response.json()) as { detail?: string };
      if (data.detail) message = data.detail;
    } catch {
      const text = await response.text();
      if (text) message = text;
    }
    throw new Error(message);
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
