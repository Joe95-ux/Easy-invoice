import { Resend } from "resend";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(apiKey);
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

type SendInvoiceEmailInput = {
  to: string;
  companyName: string;
  invoiceNumber: string;
  total: string;
  pdfBuffer: Buffer;
  viewUrl?: string;
};

export async function sendInvoiceEmail(input: SendInvoiceEmailInput) {
  const from = process.env.RESEND_FROM_EMAIL ?? "Easy Invoice <onboarding@resend.dev>";
  const resend = getResend();

  const viewLink = input.viewUrl
    ? `<p><a href="${input.viewUrl}">View invoice online</a></p>`
    : "";

  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject: `Invoice ${input.invoiceNumber} from ${input.companyName}`,
    html: `
      <p>Hello,</p>
      <p>Please find attached invoice <strong>${input.invoiceNumber}</strong> from <strong>${input.companyName}</strong>.</p>
      <p>Total due: <strong>${input.total}</strong></p>
      ${viewLink}
      <p>Thank you for your business.</p>
    `,
    attachments: [
      {
        filename: `${input.invoiceNumber}.pdf`,
        content: input.pdfBuffer,
      },
    ],
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

type SendEstimateEmailInput = {
  to: string;
  companyName: string;
  estimateNumber: string;
  total: string;
  pdfBuffer: Buffer;
  viewUrl?: string;
};

export async function sendEstimateEmail(input: SendEstimateEmailInput) {
  const from = process.env.RESEND_FROM_EMAIL ?? "Easy Invoice <onboarding@resend.dev>";
  const resend = getResend();

  const viewLink = input.viewUrl
    ? `<p><a href="${input.viewUrl}">View estimate online</a></p>`
    : "";

  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject: `Estimate ${input.estimateNumber} from ${input.companyName}`,
    html: `
      <p>Hello,</p>
      <p>Please find attached estimate <strong>${input.estimateNumber}</strong> from <strong>${input.companyName}</strong>.</p>
      <p>Total estimate: <strong>${input.total}</strong></p>
      ${viewLink}
      <p>We look forward to working with you.</p>
    `,
    attachments: [
      {
        filename: `${input.estimateNumber}.pdf`,
        content: input.pdfBuffer,
      },
    ],
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

type SendTeamInviteEmailInput = {
  to: string;
  companyName: string;
  role: string;
  inviteUrl: string;
  inviterEmail: string;
};

export async function sendTeamInviteEmail(input: SendTeamInviteEmailInput) {
  const from = process.env.RESEND_FROM_EMAIL ?? "Easy Invoice <onboarding@resend.dev>";
  const resend = getResend();

  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject: `You're invited to join ${input.companyName} on Invoice Desk`,
    html: `
      <p>Hello,</p>
      <p><strong>${input.inviterEmail}</strong> invited you to join <strong>${input.companyName}</strong> on Invoice Desk as a <strong>${input.role.toLowerCase()}</strong>.</p>
      <p><a href="${input.inviteUrl}">Accept invitation</a></p>
      <p>This link expires in 7 days. If you don't have an account yet, you'll be asked to sign up first.</p>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

type SendFeedbackEmailInput = {
  fromEmail: string;
  companyName: string;
  message: string;
};

export async function sendFeedbackEmail(input: SendFeedbackEmailInput) {
  const from = process.env.RESEND_FROM_EMAIL ?? "Invoice Desk <onboarding@resend.dev>";
  const supportEmail =
    process.env.SUPPORT_EMAIL ?? process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@invoicedesk.app";
  const resend = getResend();

  const escapedMessage = input.message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");

  const { data, error } = await resend.emails.send({
    from,
    to: supportEmail,
    replyTo: input.fromEmail,
    subject: `Invoice Desk feedback from ${input.fromEmail}`,
    html: `
      <p><strong>From:</strong> ${input.fromEmail}</p>
      <p><strong>Company:</strong> ${input.companyName}</p>
      <hr />
      <p>${escapedMessage}</p>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

type SendContactEmailInput = {
  fromEmail: string;
  companyName: string;
  subject: string;
  topic: string;
  message: string;
};

export async function sendContactEmail(input: SendContactEmailInput) {
  const from = process.env.RESEND_FROM_EMAIL ?? "Invoice Desk <onboarding@resend.dev>";
  const supportEmail =
    process.env.SUPPORT_EMAIL ?? process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@invoicedesk.app";
  const resend = getResend();

  const escapedMessage = input.message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");

  const escapedSubject = input.subject
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const { data, error } = await resend.emails.send({
    from,
    to: supportEmail,
    replyTo: input.fromEmail,
    subject: `Invoice Desk support: ${input.subject}`,
    html: `
      <p><strong>From:</strong> ${input.fromEmail}</p>
      <p><strong>Company:</strong> ${input.companyName}</p>
      <p><strong>Topic:</strong> ${input.topic}</p>
      <p><strong>Subject:</strong> ${escapedSubject}</p>
      <hr />
      <p>${escapedMessage}</p>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

type SendPaymentConfirmationEmailInput = {
  to: string;
  companyName: string;
  invoiceNumber: string;
  receiptNumber: string;
  amount: string;
  invoicePdfBuffer: Buffer;
  receiptPdfBuffer: Buffer;
};

export async function sendPaymentConfirmationEmail(input: SendPaymentConfirmationEmailInput) {
  const from = process.env.RESEND_FROM_EMAIL ?? "Easy Invoice <onboarding@resend.dev>";
  const resend = getResend();

  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject: `Payment received — Receipt ${input.receiptNumber} for Invoice ${input.invoiceNumber}`,
    html: `
      <p>Hello,</p>
      <p>Thank you for your payment of <strong>${input.amount}</strong> to <strong>${input.companyName}</strong>.</p>
      <p>Receipt <strong>${input.receiptNumber}</strong> has been issued for invoice <strong>${input.invoiceNumber}</strong>.</p>
      <p>Attached are your payment receipt and the updated invoice showing payments received.</p>
      <p>Thank you for your business.</p>
    `,
    attachments: [
      {
        filename: `${input.receiptNumber}.pdf`,
        content: input.receiptPdfBuffer,
      },
      {
        filename: `${input.invoiceNumber}.pdf`,
        content: input.invoicePdfBuffer,
      },
    ],
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

type SendAuditAlertEmailInput = {
  to: string[];
  companyName: string;
  actionLabel: string;
  summary: string;
  actorLabel: string;
  occurredAt: Date;
  activityUrl: string;
};

export async function sendAuditAlertEmail(input: SendAuditAlertEmailInput) {
  const from = process.env.RESEND_FROM_EMAIL ?? "Easy Invoice <onboarding@resend.dev>";
  const resend = getResend();

  const escapedSummary = input.summary
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const occurredAt = input.occurredAt.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject: `[${input.companyName}] ${input.actionLabel}`,
    html: `
      <p>A sensitive activity was recorded on your Invoice Desk account.</p>
      <p><strong>Company:</strong> ${input.companyName}</p>
      <p><strong>Action:</strong> ${input.actionLabel}</p>
      <p><strong>Details:</strong> ${escapedSummary}</p>
      <p><strong>By:</strong> ${input.actorLabel}</p>
      <p><strong>When:</strong> ${occurredAt}</p>
      <p><a href="${input.activityUrl}">View activity log</a></p>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
