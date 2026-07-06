import { renderInvoicePdf } from "@/lib/ai-docs";
import { renderReceiptHtmlForPayment } from "@/lib/receipt-html";

export async function generateReceiptPdfBuffer(paymentId: string, companyId: string) {
  const html = await renderReceiptHtmlForPayment(paymentId, companyId);
  if (!html) return null;

  const pdfBuffer = await renderInvoicePdf(html);
  return { pdfBuffer, html };
}
