import type { DocumentKind, InvoiceHtmlData } from "@/lib/invoice-templates/types";

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

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** WeasyPrint repeats @page backgrounds on every page; position:fixed often only paints once. */
function buildWatermarkPageCss(logoUrl: string | null | undefined): string {
  if (!logoUrl) return "";

  const safeHref = logoUrl
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="300" height="300" viewBox="0 0 300 300">` +
    `<image xlink:href="${safeHref}" href="${safeHref}" width="300" height="300" preserveAspectRatio="xMidYMid meet" opacity="0.07"/>` +
    `</svg>`;

  const svgDataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  const cssUrl = `url("${svgDataUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")`;

  return `
@page {
  background-image: ${cssUrl};
  background-position: center center;
  background-repeat: no-repeat;
  background-size: 300px auto;
}
`.trim();
}

function documentLabels(kind: DocumentKind) {
  if (kind === "estimate") {
    return {
      title: "ESTIMATE",
      pageTitle: "Estimate",
      dateLabel: "Estimate Date",
      numberLabel: "Estimate #",
      expiryLabel: "Valid Until",
      totalLabel: "Total estimate",
      footerPrefix: "Thank you for considering",
    };
  }

  return {
    title: "INVOICE",
    pageTitle: "Invoice",
    dateLabel: "Invoice Date",
    numberLabel: "Invoice #",
    expiryLabel: "Due Date",
    totalLabel: "Total due",
    footerPrefix: "Thank you for choosing",
  };
}

function buildSections(data: InvoiceHtmlData) {
  const { company, client, invoice, items } = data;
  const kind = data.documentKind ?? "invoice";
  const labels = documentLabels(kind);

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
    `<div>${labels.dateLabel}: ${formatDate(invoice.issueDate)}</div>`,
    `<div>${labels.numberLabel}: ${escapeHtml(invoice.number)}</div>`,
    invoice.dueDate ? `<div>${labels.expiryLabel}: ${formatDate(invoice.dueDate)}</div>` : "",
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
      (item, index) => `
      <tr class="${index % 2 === 0 ? "band-odd" : "band-even"}">
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
    `<div class="totals-row total"><span>${labels.totalLabel}</span><span>${formatMoney(invoice.total, invoice.currency)}</span></div>`,
  ]
    .filter(Boolean)
    .join("");

  const termsNotes = invoice.notes
    ? `<div class="terms-notes"><div class="terms-notes-label">Terms &amp; Notes</div><div>${escapeHtml(invoice.notes)}</div></div>`
    : "";

  const watermark = company.logoUrl
    ? `<div class="watermark"><img src="${escapeHtml(company.logoUrl)}" alt="" /></div>`
    : "";

  const invoiceFooter = `<div class="invoice-footer">${labels.footerPrefix} ${escapeHtml(company.name)}</div>`;

  return {
    document_title: labels.title,
    page_title: labels.pageTitle,
    company_name: escapeHtml(company.name),
    company_details: companyDetails,
    invoice_number: escapeHtml(invoice.number),
    invoice_meta: invoiceMeta,
    client_section: clientSection,
    line_items: lineItems,
    totals,
    terms_notes: termsNotes,
    watermark,
    invoice_footer: invoiceFooter,
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

  html = html.replace(
    "{{styles}}",
    `${templateCss ?? ""}\n${buildWatermarkPageCss(data.company.logoUrl)}`,
  );

  return html;
}
