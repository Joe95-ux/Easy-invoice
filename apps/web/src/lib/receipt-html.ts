import type { PaymentMethod } from "@easy-invoice/db";
import { companyBrandingFields } from "@/lib/company-branding";
import { PAYMENT_METHOD_LABELS } from "@/lib/invoice-payments-utils";
import { prisma } from "@/lib/db";

export type ReceiptHtmlData = {
  company: {
    name: string;
    logoUrl?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    country?: string | null;
    logoBg?: string | null;
    logoPlacement?: string | null;
    brandColor?: string | null;
  };
  client: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  } | null;
  receipt: {
    number: string;
    paidAt: Date;
    amount: number;
    method: string;
    reference?: string | null;
    note?: string | null;
  };
  invoice: {
    number: string;
    currency: string;
    total: number;
    amountPaid: number;
    balanceDue: number;
  };
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatAddress(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(", ");
}

async function inlineLogoUrl(logoUrl: string | null | undefined): Promise<string | null | undefined> {
  if (!logoUrl || logoUrl.startsWith("data:")) return logoUrl;

  try {
    const response = await fetch(logoUrl, {
      signal: AbortSignal.timeout(12_000),
      headers: { Accept: "image/*" },
    });
    if (!response.ok) return logoUrl;

    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "image/png";
    if (!contentType.startsWith("image/")) return logoUrl;

    const base64 = Buffer.from(await response.arrayBuffer()).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch {
    return logoUrl;
  }
}

function renderReceiptHtml(data: ReceiptHtmlData): string {
  const { company, client, receipt, invoice } = data;
  const companyAddress = formatAddress([
    company.address,
    company.city,
    company.state,
    company.zip,
    company.country,
  ]);

  const logoHtml = company.logoUrl
    ? `<div class="logo"><img src="${escapeHtml(company.logoUrl)}" alt="" /></div>`
    : "";

  const clientLines = client
    ? [
        `<p class="name">${escapeHtml(client.name)}</p>`,
        client.email ? `<p>${escapeHtml(client.email)}</p>` : "",
        client.phone ? `<p>${escapeHtml(client.phone)}</p>` : "",
        client.address ? `<p>${escapeHtml(client.address)}</p>` : "",
      ].join("")
    : `<p class="name">—</p>`;

  const referenceLine = receipt.reference
    ? `<tr><td>Reference</td><td>${escapeHtml(receipt.reference)}</td></tr>`
    : "";
  const noteLine = receipt.note
    ? `<tr><td>Note</td><td>${escapeHtml(receipt.note)}</td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Receipt ${escapeHtml(receipt.number)}</title>
  <style>
    @page { size: A4; margin: 48px; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #111827;
      font-size: 13px;
      line-height: 1.5;
      margin: 0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      margin-bottom: 32px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }
    .logo img { max-height: 48px; max-width: 180px; object-fit: contain; }
    .doc-title {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin: 0 0 4px;
    }
    .doc-number { font-size: 14px; color: #6b7280; }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 28px;
    }
    .block-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6b7280;
      margin-bottom: 8px;
    }
    .name { font-weight: 600; margin: 0 0 4px; }
    .amount-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin-bottom: 28px;
    }
    .amount-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #6b7280;
      margin-bottom: 8px;
    }
    .amount-value {
      font-size: 32px;
      font-weight: 700;
      color: #059669;
    }
    table.details {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 28px;
    }
    table.details td {
      padding: 10px 0;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: top;
    }
    table.details td:first-child {
      width: 40%;
      color: #6b7280;
    }
    .invoice-summary {
      background: #f9fafb;
      border-radius: 8px;
      padding: 16px;
      font-size: 12px;
    }
    .invoice-summary p { margin: 0 0 6px; }
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      ${logoHtml}
      <p class="name">${escapeHtml(company.name)}</p>
      ${company.email ? `<p>${escapeHtml(company.email)}</p>` : ""}
      ${company.phone ? `<p>${escapeHtml(company.phone)}</p>` : ""}
      ${companyAddress ? `<p>${escapeHtml(companyAddress)}</p>` : ""}
    </div>
    <div style="text-align: right;">
      <h1 class="doc-title">Receipt</h1>
      <p class="doc-number">${escapeHtml(receipt.number)}</p>
      <p class="doc-number">Paid ${formatDate(receipt.paidAt)}</p>
    </div>
  </div>

  <div class="grid">
    <div>
      <div class="block-label">Received from</div>
      ${clientLines}
    </div>
    <div>
      <div class="block-label">Payment details</div>
      <p class="name">${escapeHtml(receipt.method)}</p>
      <p>Date: ${formatDate(receipt.paidAt)}</p>
    </div>
  </div>

  <div class="amount-box">
    <div class="amount-label">Amount received</div>
    <div class="amount-value">${formatMoney(receipt.amount, invoice.currency)}</div>
  </div>

  <table class="details">
    <tr><td>Receipt number</td><td>${escapeHtml(receipt.number)}</td></tr>
    <tr><td>Invoice number</td><td>${escapeHtml(invoice.number)}</td></tr>
    <tr><td>Payment method</td><td>${escapeHtml(receipt.method)}</td></tr>
    ${referenceLine}
    ${noteLine}
  </table>

  <div class="invoice-summary">
    <p><strong>Invoice ${escapeHtml(invoice.number)}</strong></p>
    <p>Invoice total: ${formatMoney(invoice.total, invoice.currency)}</p>
    <p>Total paid to date: ${formatMoney(invoice.amountPaid, invoice.currency)}</p>
    <p>Balance due: ${formatMoney(invoice.balanceDue, invoice.currency)}</p>
  </div>

  <div class="footer">
    Thank you for your payment — ${escapeHtml(company.name)}
  </div>
</body>
</html>`;
}

export async function renderReceiptHtmlForPayment(
  paymentId: string,
  companyId: string,
): Promise<string | null> {
  const payment = await prisma.invoicePayment.findFirst({
    where: {
      id: paymentId,
      invoice: { companyId },
    },
    include: {
      invoice: {
        include: {
          client: true,
          company: true,
          payments: { select: { amount: true } },
        },
      },
    },
  });

  if (!payment || !payment.receiptNumber) return null;

  const invoice = payment.invoice;
  const amountPaid = invoice.payments.reduce(
    (sum, row) => sum + Number(row.amount),
    0,
  );
  const total = Number(invoice.total);
  const balanceDue = Math.max(0, Math.round((total - amountPaid) * 100) / 100);

  const data: ReceiptHtmlData = {
    company: {
      name: invoice.company.name,
      logoUrl: await inlineLogoUrl(invoice.company.logoUrl),
      email: invoice.company.email,
      phone: invoice.company.phone,
      address: invoice.company.address,
      city: invoice.company.city,
      state: invoice.company.state,
      zip: invoice.company.zip,
      country: invoice.company.country,
      ...companyBrandingFields(invoice.company),
    },
    client: invoice.client,
    receipt: {
      number: payment.receiptNumber,
      paidAt: payment.paidAt,
      amount: Number(payment.amount),
      method: PAYMENT_METHOD_LABELS[payment.method as PaymentMethod],
      reference: payment.reference,
      note: payment.note,
    },
    invoice: {
      number: invoice.number,
      currency: invoice.currency,
      total,
      amountPaid,
      balanceDue,
    },
  };

  return renderReceiptHtml(data);
}
