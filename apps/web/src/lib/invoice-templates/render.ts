import type { InvoiceHtmlData } from "@/lib/invoice-templates/types";

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

function buildSections(data: InvoiceHtmlData) {
  const { company, client, invoice, items } = data;

  const companyAddress = formatAddress([
    company.address,
    company.city,
    company.state,
    company.zip,
    company.country,
  ]);

  const companyDetails = [
    companyAddress ? `<div class="party-detail">${escapeHtml(companyAddress)}</div>` : "",
    company.email ? `<div class="party-detail">${escapeHtml(company.email)}</div>` : "",
    company.phone ? `<div class="party-detail">${escapeHtml(company.phone)}</div>` : "",
  ]
    .filter(Boolean)
    .join("");

  const invoiceMeta = [
    `<div><strong>${escapeHtml(invoice.number)}</strong></div>`,
    `<div>Issue date: ${invoice.issueDate.toLocaleDateString("en-US")}</div>`,
    invoice.dueDate
      ? `<div>Due date: ${invoice.dueDate.toLocaleDateString("en-US")}</div>`
      : "",
    `<div>Status: ${escapeHtml(invoice.status)}</div>`,
  ]
    .filter(Boolean)
    .join("");

  const clientSection = [
    `<div class="party-name">${escapeHtml(client?.name ?? "—")}</div>`,
    client?.address
      ? `<div class="party-detail">${escapeHtml(client.address)}</div>`
      : "",
    client?.email ? `<div class="party-detail">${escapeHtml(client.email)}</div>` : "",
    client?.phone ? `<div class="party-detail">${escapeHtml(client.phone)}</div>` : "",
  ]
    .filter(Boolean)
    .join("");

  const lineItems = items
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

  const totals = [
    `<div class="totals-row"><span>Subtotal</span><span>${formatMoney(invoice.subtotal, invoice.currency)}</span></div>`,
    invoice.discount > 0
      ? `<div class="totals-row"><span>Discount</span><span>-${formatMoney(invoice.discount, invoice.currency)}</span></div>`
      : "",
    invoice.taxAmount > 0
      ? `<div class="totals-row"><span>Tax (${(invoice.taxRate * 100).toFixed(1)}%)</span><span>${formatMoney(invoice.taxAmount, invoice.currency)}</span></div>`
      : "",
    `<div class="totals-row total"><span>Total</span><span>${formatMoney(invoice.total, invoice.currency)}</span></div>`,
  ]
    .filter(Boolean)
    .join("");

  const notes = invoice.notes
    ? `<div class="notes"><div class="notes-label">Notes</div><div>${escapeHtml(invoice.notes)}</div></div>`
    : "";

  return {
    company_name: escapeHtml(company.name),
    company_details: companyDetails,
    invoice_number: escapeHtml(invoice.number),
    invoice_meta: invoiceMeta,
    client_section: clientSection,
    line_items: lineItems,
    totals,
    notes,
  };
}

export function renderFromTemplate(
  templateHtml: string,
  templateCss: string | null,
  data: InvoiceHtmlData,
): string {
  const sections = buildSections(data);
  let html = templateHtml;

  for (const [key, value] of Object.entries(sections)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }

  html = html.replace("{{styles}}", templateCss ?? "");

  return html;
}
