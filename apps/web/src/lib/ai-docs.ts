import type { DocumentExtractionMode, InvoiceDraft, ParseDocumentResponse } from "@/lib/schemas/invoice";
import { invoiceDraftSchema, parseDocumentResponseSchema } from "@/lib/schemas/invoice";

const AI_DOCS_URL = process.env.AI_DOCS_SERVICE_URL ?? "http://localhost:8000";
const AI_DOCS_SECRET = process.env.AI_DOCS_SERVICE_SECRET ?? "";

/**
 * Document extraction can take several minutes for scanned PDFs (vision OCR).
 * Vercel Pro caps serverless routes at 300s unless Enterprise — lower this in prod if needed.
 */
export const DOCUMENT_PARSE_MAX_DURATION_SECONDS = Number(
  process.env.DOCUMENT_PARSE_MAX_DURATION_SECONDS ?? 480,
);

/** Browser wait for upload + dev cold-compile + extraction. */
export const DOCUMENT_PARSE_CLIENT_TIMEOUT_MS =
  DOCUMENT_PARSE_MAX_DURATION_SECONDS * 1000;

/** Keep below route maxDuration to leave room for auth + upload handling. */
const AI_DOCS_TIMEOUT_MS = (DOCUMENT_PARSE_MAX_DURATION_SECONDS - 30) * 1000;

export type ParseInvoiceContext = {
  localeHint?: string;
  companyName?: string;
  companyCurrency?: string;
  outputLanguage?: string;
  referenceDate?: string;
  documentKind?: "invoice" | "estimate";
  extractionMode?: DocumentExtractionMode;
  knownClientName?: string;
};

export type ParseDocumentContext = ParseInvoiceContext & {
  extractionMode: DocumentExtractionMode;
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
      document_kind: context.documentKind ?? "invoice",
      extraction_mode: context.extractionMode ?? "full",
      locale_hint: context.localeHint,
      company_name: context.companyName,
      company_currency: context.companyCurrency,
      output_language: context.outputLanguage ?? "en",
      reference_date: context.referenceDate,
      known_client_name: context.knownClientName,
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

export async function transcribeAudio(
  audio: Blob,
  filename = "recording.webm",
): Promise<string> {
  const formData = new FormData();
  formData.append("file", audio, filename);

  const response = await fetch(`${AI_DOCS_URL}/transcribe`, {
    method: "POST",
    headers: {
      "X-Service-Secret": AI_DOCS_SECRET,
    },
    body: formData,
  });

  if (!response.ok) {
    let message = `Transcription failed (${response.status})`;
    try {
      const data = (await response.json()) as { detail?: string };
      if (data.detail) message = data.detail;
    } catch {
      const text = await response.text();
      if (text) message = text;
    }
    throw new Error(message);
  }

  const data = (await response.json()) as { text?: string };
  if (!data.text?.trim()) {
    throw new Error("No speech detected in recording");
  }

  return data.text.trim();
}

export async function parseDocumentFromFile(
  file: Blob,
  filename: string,
  context: ParseDocumentContext,
): Promise<ParseDocumentResponse> {
  const formData = new FormData();
  formData.append("file", file, filename);
  formData.append("document_kind", context.documentKind ?? "invoice");
  formData.append("extraction_mode", context.extractionMode);
  if (context.localeHint) formData.append("locale_hint", context.localeHint);
  if (context.companyName) formData.append("company_name", context.companyName);
  if (context.companyCurrency) formData.append("company_currency", context.companyCurrency);
  formData.append("output_language", context.outputLanguage ?? "en");
  if (context.referenceDate) formData.append("reference_date", context.referenceDate);
  if (context.knownClientName) formData.append("known_client_name", context.knownClientName);

  let response: Response;
  try {
    response = await fetch(`${AI_DOCS_URL}/parse-document`, {
      method: "POST",
      headers: {
        "X-Service-Secret": AI_DOCS_SECRET,
      },
      body: formData,
      signal: AbortSignal.timeout(AI_DOCS_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error(
        "Document extraction timed out. Try a smaller PDF or a single-page scan.",
      );
    }
    throw new Error(
      "Could not reach the document extraction service. Is the ai-docs service running?",
    );
  }

  if (!response.ok) {
    let message = `Document parse failed (${response.status})`;
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
  return parseDocumentResponseSchema.parse(data);
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
