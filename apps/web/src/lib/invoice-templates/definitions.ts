import type { InvoiceHtmlData } from "@/lib/invoice-templates/types";

export type SystemTemplateDefinition = {
  name: string;
  slug: string;
  isDefault: boolean;
  html: string;
  css: string;
};

function baseStyles(accent: string): string {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #111; padding: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .company-name { font-size: 22px; font-weight: bold; margin-bottom: 6px; }
    .invoice-title { font-size: 28px; font-weight: bold; color: ${accent}; text-align: right; }
    .invoice-meta { text-align: right; margin-top: 8px; color: #555; line-height: 1.6; }
    .parties { display: flex; gap: 40px; margin-bottom: 32px; }
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
  `;
}

const sharedBody = `
  <div class="header">
    <div>
      <div class="company-name">{{company_name}}</div>
      {{company_details}}
    </div>
    <div>
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-meta">{{invoice_meta}}</div>
    </div>
  </div>
  <div class="parties">
    <div class="party">
      <div class="party-label">Bill to</div>
      {{client_section}}
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
    <tbody>{{line_items}}</tbody>
  </table>
  <div class="totals">{{totals}}</div>
  {{notes}}
`;

export const SYSTEM_TEMPLATES: SystemTemplateDefinition[] = [
  {
    name: "Classic",
    slug: "classic",
    isDefault: true,
    css: baseStyles("#2563eb"),
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><title>Invoice {{invoice_number}}</title><style>{{styles}}</style></head><body>${sharedBody}</body></html>`,
  },
  {
    name: "Modern",
    slug: "modern",
    isDefault: false,
    css: `
      ${baseStyles("#0f172a")}
      body { padding: 0; }
      .header { background: #0f172a; color: #fff; padding: 32px 40px; margin: 0 0 32px; }
      .company-name, .invoice-title { color: #fff; }
      .invoice-meta, .party-detail { color: #cbd5e1; }
      .content { padding: 0 40px 40px; }
      th { background: #f1f5f9; }
    `,
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><title>Invoice {{invoice_number}}</title><style>{{styles}}</style></head><body><div class="header"><div><div class="company-name">{{company_name}}</div>{{company_details}}</div><div><div class="invoice-title">INVOICE</div><div class="invoice-meta">{{invoice_meta}}</div></div></div><div class="content"><div class="parties"><div class="party"><div class="party-label">Bill to</div>{{client_section}}</div></div><table><thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead><tbody>{{line_items}}</tbody></table><div class="totals">{{totals}}</div>{{notes}}</div></body></html>`,
  },
  {
    name: "Minimal",
    slug: "minimal",
    isDefault: false,
    css: `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Georgia, serif; font-size: 13px; color: #111; padding: 48px; }
      .header { border-bottom: 1px solid #111; padding-bottom: 24px; margin-bottom: 32px; }
      .company-name { font-size: 18px; letter-spacing: 0.02em; margin-bottom: 8px; }
      .invoice-title { font-size: 14px; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 16px; }
      .invoice-meta { margin-top: 12px; line-height: 1.8; }
      .party-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
      .party-name { font-size: 16px; margin-bottom: 4px; }
      .party-detail { color: #444; line-height: 1.6; }
      table { width: 100%; border-collapse: collapse; margin: 32px 0 24px; }
      th, td { padding: 10px 0; border-bottom: 1px solid #ddd; text-align: left; }
      th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: normal; }
      .num { text-align: right; }
      .totals { margin-left: auto; width: 240px; margin-top: 16px; }
      .totals-row { display: flex; justify-content: space-between; padding: 6px 0; }
      .totals-row.total { border-top: 1px solid #111; margin-top: 8px; padding-top: 12px; font-size: 15px; }
      .notes { margin-top: 40px; padding-top: 24px; border-top: 1px solid #ddd; }
      .notes-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
    `,
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><title>Invoice {{invoice_number}}</title><style>{{styles}}</style></head><body><div class="header"><div class="company-name">{{company_name}}</div>{{company_details}}<div class="invoice-title">Invoice {{invoice_number}}</div><div class="invoice-meta">{{invoice_meta}}</div></div><div class="party-label">Bill to</div>{{client_section}}<table><thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead><tbody>{{line_items}}</tbody></table><div class="totals">{{totals}}</div>{{notes}}</body></html>`,
  },
];
