import { Resend } from "resend";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(apiKey);
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
