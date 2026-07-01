import { Resend } from "resend";
import type { ReminderKind } from "@/lib/db";
import { formatDate } from "@/lib/invoices";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(apiKey);
}

type SendPaymentReminderEmailInput = {
  to: string;
  companyName: string;
  invoiceNumber: string;
  total: string;
  dueDateLabel: string;
  viewUrl: string;
  kind: ReminderKind;
  pdfBuffer?: Buffer;
};

function reminderCopy(
  kind: ReminderKind,
  companyName: string,
  invoiceNumber: string,
  dueDateLabel: string,
) {
  switch (kind) {
    case "BEFORE_DUE":
      return {
        subject: `Reminder: Invoice ${invoiceNumber} from ${companyName} is due ${dueDateLabel}`,
        lead: `This is a friendly reminder that invoice <strong>${invoiceNumber}</strong> from <strong>${companyName}</strong> is due <strong>${dueDateLabel}</strong>.`,
      };
    case "ON_DUE":
      return {
        subject: `Payment due today: Invoice ${invoiceNumber} from ${companyName}`,
        lead: `Invoice <strong>${invoiceNumber}</strong> from <strong>${companyName}</strong> is due <strong>today (${dueDateLabel})</strong>.`,
      };
    case "OVERDUE":
      return {
        subject: `Overdue: Invoice ${invoiceNumber} from ${companyName}`,
        lead: `Invoice <strong>${invoiceNumber}</strong> from <strong>${companyName}</strong> is past due (was due <strong>${dueDateLabel}</strong>).`,
      };
    case "MANUAL":
    default:
      return {
        subject: `Payment reminder: Invoice ${invoiceNumber} from ${companyName}`,
        lead: `This is a reminder about invoice <strong>${invoiceNumber}</strong> from <strong>${companyName}</strong>, due <strong>${dueDateLabel}</strong>.`,
      };
  }
}

export async function sendPaymentReminderEmail(input: SendPaymentReminderEmailInput) {
  const from = process.env.RESEND_FROM_EMAIL ?? "Easy Invoice <onboarding@resend.dev>";
  const resend = getResend();
  const { subject, lead } = reminderCopy(
    input.kind,
    input.companyName,
    input.invoiceNumber,
    input.dueDateLabel,
  );

  const attachments = input.pdfBuffer
    ? [{ filename: `${input.invoiceNumber}.pdf`, content: input.pdfBuffer }]
    : undefined;

  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject,
    html: `
      <p>Hello,</p>
      <p>${lead}</p>
      <p>Amount due: <strong>${input.total}</strong></p>
      <p><a href="${input.viewUrl}">View and pay invoice online</a></p>
      <p>If you've already sent payment, please disregard this message.</p>
      <p>— ${input.companyName}</p>
    `,
    attachments,
  });

  if (error) throw new Error(error.message);
  return data;
}

export function formatDueDateLabel(dueDate: Date): string {
  return formatDate(dueDate);
}
