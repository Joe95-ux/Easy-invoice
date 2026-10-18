import { formatDate, formatMoney } from "@/lib/invoices";
import { formatPhoneForDisplay } from "@/lib/phone";

export type StatementInvoiceRow = {
  number: string;
  issueDate: string;
  dueDate: string | null;
  status: string;
  total: number;
  credits: number;
  lateFees: number;
  paid: number;
  balanceDue: number;
  daysPastDue: number | null;
};

export type StatementHtmlData = {
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
  };
  client: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    country?: string | null;
  };
  statement: {
    number: string;
    issuedAt: Date;
    currency: string;
    totalDue: number;
    current: number;
    days1to30: number;
    days31to60: number;
    days61plus: number;
  };
  invoices: StatementInvoiceRow[];
  viewUrl?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatAddress(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(", ");
}

export function renderStatementHtml(data: StatementHtmlData): string {
  const { company, client, statement, invoices } = data;
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
  const rows = invoices
    .map(
      (row) => `<tr>
        <td>${escapeHtml(row.number)}</td>
        <td>${escapeHtml(formatDate(new Date(row.issueDate)))}</td>
        <td>${row.dueDate ? escapeHtml(formatDate(new Date(row.dueDate))) : "—"}</td>
        <td>${row.daysPastDue != null && row.daysPastDue > 0 ? `${row.daysPastDue}d` : "Current"}</td>
        <td class="num">${formatMoney(row.balanceDue, statement.currency)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Statement ${escapeHtml(statement.number)}</title>
  <style>
    @page { size: A4; margin: 48px; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111827; font-size: 13px; line-height: 1.5; margin: 0; }
    .header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb; }
    .logo img { max-height: 48px; max-width: 180px; object-fit: contain; }
    .doc-title { font-size: 28px; font-weight: 700; margin: 0 0 4px; }
    .muted { color: #6b7280; }
    .name { font-weight: 600; margin: 0 0 4px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { text-align: left; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; }
    .num { text-align: right; }
    .aging { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0 28px; }
    .aging div { background: #f9fafb; border-radius: 8px; padding: 12px; }
    .aging span { display: block; font-size: 11px; color: #6b7280; }
    .aging strong { font-size: 16px; }
    .total { font-size: 18px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      ${logoHtml}
      <p class="name">${escapeHtml(company.name)}</p>
      ${company.email ? `<p>${escapeHtml(company.email)}</p>` : ""}
      ${company.phone ? `<p>${escapeHtml(formatPhoneForDisplay(company.phone, { defaultCountry: company.country }))}</p>` : ""}
      ${companyAddress ? `<p>${escapeHtml(companyAddress)}</p>` : ""}
    </div>
    <div style="text-align:right">
      <h1 class="doc-title">Statement</h1>
      <p class="muted">${escapeHtml(statement.number)}</p>
      <p class="muted">${escapeHtml(formatDate(statement.issuedAt))}</p>
    </div>
  </div>
  <p class="muted">Bill to</p>
  <p class="name">${escapeHtml(client.name)}</p>
  ${client.email ? `<p>${escapeHtml(client.email)}</p>` : ""}
  ${client.address ? `<p>${escapeHtml(client.address)}</p>` : ""}

  <div class="aging">
    <div><span>Current</span><strong>${formatMoney(statement.current, statement.currency)}</strong></div>
    <div><span>1–30 days</span><strong>${formatMoney(statement.days1to30, statement.currency)}</strong></div>
    <div><span>31–60 days</span><strong>${formatMoney(statement.days31to60, statement.currency)}</strong></div>
    <div><span>61+ days</span><strong>${formatMoney(statement.days61plus, statement.currency)}</strong></div>
  </div>

  <table>
    <thead>
      <tr><th>Invoice</th><th>Issued</th><th>Due</th><th>Aging</th><th class="num">Balance</th></tr>
    </thead>
    <tbody>${rows || `<tr><td colspan="5">No open invoices</td></tr>`}</tbody>
  </table>
  <p class="total">Amount due: ${formatMoney(statement.totalDue, statement.currency)}</p>
  ${data.viewUrl ? `<p><a href="${escapeHtml(data.viewUrl)}">View this statement online</a></p>` : ""}
  <p class="muted">If you have already sent payment, please disregard this statement.</p>
</body>
</html>`;
}
