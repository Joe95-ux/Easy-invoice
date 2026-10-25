export const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL ?? process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@invoicedesk.app";

/** Pro contact requests are tagged and promised a next-business-day reply. */
export const PRO_SUPPORT_SLA = "next business day";

export function supportEmailSubject(subject: string, priority: boolean): string {
  return priority
    ? `[Pro priority] Invoice Desk support: ${subject}`
    : `Invoice Desk support: ${subject}`;
}
