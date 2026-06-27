"use client";

import { AiDocumentParseTab } from "@/features/invoices/components/ai-document-parse-tab";
import type { InvoiceDraft } from "@/lib/schemas/invoice";

type AiInvoiceTabProps = {
  onDraft: (draft: InvoiceDraft) => void;
};

export function AiInvoiceTab({ onDraft }: AiInvoiceTabProps) {
  return <AiDocumentParseTab variant="invoice" onDraft={onDraft} />;
}
