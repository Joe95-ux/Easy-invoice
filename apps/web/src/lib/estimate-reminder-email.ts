import { Resend } from "resend";
import type { ReminderKind } from "@/lib/db";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(apiKey);
}

type SendEstimateReminderEmailInput = {
  to: string;
  companyName: string;
  estimateNumber: string;
  total: string;
  validUntilLabel: string;
  viewUrl: string;
  portalUrl?: string;
  kind: ReminderKind;
  pdfBuffer?: Buffer;
};

function reminderCopy(
  kind: ReminderKind,
  companyName: string,
  estimateNumber: string,
  validUntilLabel: string,
) {
  switch (kind) {
    case "BEFORE_DUE":
      return {
        subject: `Reminder: Estimate ${estimateNumber} from ${companyName} is valid until ${validUntilLabel}`,
        lead: `This is a friendly reminder that estimate <strong>${estimateNumber}</strong> from <strong>${companyName}</strong> is valid until <strong>${validUntilLabel}</strong>.`,
      };
    case "ON_DUE":
      return {
        subject: `Last day: Estimate ${estimateNumber} from ${companyName} expires today`,
        lead: `Estimate <strong>${estimateNumber}</strong> from <strong>${companyName}</strong> expires <strong>today (${validUntilLabel})</strong>.`,
      };
    case "MANUAL":
    default:
      return {
        subject: `Follow-up: Estimate ${estimateNumber} from ${companyName}`,
        lead: `This is a follow-up about estimate <strong>${estimateNumber}</strong> from <strong>${companyName}</strong>, valid until <strong>${validUntilLabel}</strong>.`,
      };
  }
}

export async function sendEstimateReminderEmail(input: SendEstimateReminderEmailInput) {
  const from = process.env.RESEND_FROM_EMAIL ?? "Easy Invoice <onboarding@resend.dev>";
  const resend = getResend();
  const { subject, lead } = reminderCopy(
    input.kind,
    input.companyName,
    input.estimateNumber,
    input.validUntilLabel,
  );

  const attachments = input.pdfBuffer
    ? [{ filename: `${input.estimateNumber}.pdf`, content: input.pdfBuffer }]
    : undefined;

  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject,
    html: `
      <p>Hello,</p>
      <p>${lead}</p>
      <p>Estimate total: <strong>${input.total}</strong></p>
      <p><a href="${input.viewUrl}">Review and respond to this estimate</a></p>
      ${
        input.portalUrl
          ? `<p style="margin-top:12px;font-size:14px"><a href="${input.portalUrl}">Open your client portal</a> to see all invoices and estimates.</p>`
          : ""
      }
      <p>If you have already replied, please disregard this message.</p>
      <p>— ${input.companyName}</p>
    `,
    attachments,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
