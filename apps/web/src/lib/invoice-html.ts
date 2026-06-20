type InvoiceHtmlData = {
  company: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    country?: string | null;
  };
  client: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  } | null;
  invoice: {
    number: string;
    status: string;
    issueDate: Date;
    dueDate?: Date | null;
    currency: string;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    discount: number;
    total: number;
    notes?: string | null;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
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

function formatAddress(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(", ");
}

export function renderInvoiceHtml(data: InvoiceHtmlData): string {
  const { company, client, invoice, items } = data;
  const companyAddress = formatAddress([
    company.address,
    company.city,
    company.state,
    company.zip,
    company.country,
  ]);
  const clientAddress = client?.address ?? "";

  const rows = items
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.description)}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${formatMoney(item.unitPrice, invoice.currency)}</td>
        <td class="num">${formatMoney(item.amount, invoice.currency)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${escapeHtml(invoice.number)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #111; padding: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .company-name { font-size: 22px; font-weight: bold; margin-bottom: 6px; }
    .invoice-title { font-size: 28px; font-weight: bold; color: #2563eb; text-align: right; }
    .invoice-meta { text-align: right; margin-top: 8px; color: #555; line-height: 1.6; }
    .parties { display: flex; gap: 40px; margin-bottom: 32px; }
    .party { flex: 1; }
    .party-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin-bottom: 6px; }
    .party-name { font-weight: bold; font-size: 14px; margin-bottom: 4px; }
    .party-detail { color: #555; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f4f4f5; text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #666; border-bottom: 2px solid #e4e4e7; }
    td { padding: 10px 12px; border-bottom: 1px solid #e4e4e7; vertical-align: top; }
    .num { text-align: right; white-space: nowrap; }
    .totals { margin-left: auto; width: 260px; }
    .totals-row { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals-row.total { font-weight: bold; font-size: 16px; border-top: 2px solid #111; margin-top: 8px; padding-top: 8px; }
    .notes { margin-top: 32px; padding: 16px; background: #f9fafb; border-radius: 6px; }
    .notes-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">${escapeHtml(company.name)}</div>
      ${companyAddress ? `<div class="party-detail">${escapeHtml(companyAddress)}</div>` : ""}
      ${company.email ? `<div class="party-detail">${escapeHtml(company.email)}</div>` : ""}
      ${company.phone ? `<div class="party-detail">${escapeHtml(company.phone)}</div>` : ""}
    </div>
    <div>
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-meta">
        <div><strong>${escapeHtml(invoice.number)}</strong></div>
        <div>Issue date: ${invoice.issueDate.toLocaleDateString("en-US")}</div>
        ${invoice.dueDate ? `<div>Due date: ${invoice.dueDate.toLocaleDateString("en-US")}</div>` : ""}
        <div>Status: ${escapeHtml(invoice.status)}</div>
      </div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">Bill to</div>
      <div class="party-name">${escapeHtml(client?.name ?? "—")}</div>
      ${clientAddress ? `<div class="party-detail">${escapeHtml(clientAddress)}</div>` : ""}
      ${client?.email ? `<div class="party-detail">${escapeHtml(client.email)}</div>` : ""}
      ${client?.phone ? `<div class="party-detail">${escapeHtml(client.phone)}</div>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="num">Qty</th>
        <th class="num">Rate</th>
        <th class="num">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div class="totals-row"><span>Subtotal</span><span>${formatMoney(invoice.subtotal, invoice.currency)}</span></div>
    ${invoice.discount > 0 ? `<div class="totals-row"><span>Discount</span><span>-${formatMoney(invoice.discount, invoice.currency)}</span></div>` : ""}
    ${invoice.taxAmount > 0 ? `<div class="totals-row"><span>Tax (${(invoice.taxRate * 100).toFixed(1)}%)</span><span>${formatMoney(invoice.taxAmount, invoice.currency)}</span></div>` : ""}
    <div class="totals-row total"><span>Total</span><span>${formatMoney(invoice.total, invoice.currency)}</span></div>
  </div>

  ${invoice.notes ? `<div class="notes"><div class="notes-label">Notes</div><div>${escapeHtml(invoice.notes)}</div></div>` : ""}
</body>
</html>`;
}

export function invoiceToHtmlData(
  invoice: Awaited<ReturnType<typeof import("@/lib/invoices").getInvoiceForMember>>,
) {
  if (!invoice) throw new Error("Invoice not found");

  return {
    company: invoice.company,
    client: invoice.client,
    invoice: {
      number: invoice.number,
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      currency: invoice.currency,
      subtotal: Number(invoice.subtotal),
      taxRate: Number(invoice.taxRate),
      taxAmount: Number(invoice.taxAmount),
      discount: Number(invoice.discount),
      total: Number(invoice.total),
      notes: invoice.notes,
    },
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      amount: Number(item.amount),
    })),
  };
}
