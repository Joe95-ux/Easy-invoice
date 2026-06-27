export const watermarkStyles = `
  .page { position: relative; min-height: 100vh; }
  .watermark {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    opacity: 0.07;
    z-index: 0;
    pointer-events: none;
  }
  .watermark img { width: 300px; max-width: 70vw; height: auto; object-fit: contain; }
  .page-content { position: relative; z-index: 1; }
  .invoice-footer {
    margin-top: 40px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
    text-align: center;
    font-size: 11px;
    color: #6b7280;
    line-height: 1.5;
  }
  .terms-notes { margin-top: 32px; }
  .terms-notes-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #374151;
    margin-bottom: 8px;
  }
`;

export const tableBandStyles = `
  table.line-items tbody tr.band-odd { background: #ffffff; }
  table.line-items tbody tr.band-even { background: #f4f4f5; }
  table.line-items tbody tr.band-even td { border-bottom-color: #ebebed; }
`;

const sharedBody = `
  {{watermark}}
  <div class="page-content">
    <div class="header">
      <div class="company-info">
        <div class="company-name">{{company_name}}</div>
        {{company_details}}
      </div>
      <div class="invoice-side">
        <div class="invoice-title">{{document_title}}</div>
        <div class="invoice-meta">{{invoice_meta}}</div>
      </div>
    </div>
    <div class="parties">
      <div class="party">
        <div class="party-label">Bill to</div>
        {{client_section}}
      </div>
    </div>
    <table class="line-items">
      <thead>
        <tr>
          <th>Description</th>
          <th class="num">Qty</th>
          <th class="num">Unit price</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>{{line_items}}</tbody>
    </table>
    <div class="totals">{{totals}}</div>
    {{terms_notes}}
    {{invoice_footer}}
  </div>
`;

const modernBody = `
  {{watermark}}
  <div class="page-content">
    <div class="header">
      <div class="brand">
        <div class="company-name">{{company_name}}</div>
        <div class="company-meta">{{company_details}}</div>
      </div>
      <div class="doc">
        <div class="doc-title">{{document_title}}</div>
        <div class="doc-number">#{{invoice_number}}</div>
      </div>
    </div>
    <div class="body-inner">
      <div class="meta-grid">
        <div class="bill-to">
          <div class="block-label">Bill to</div>
          {{client_section}}
        </div>
        <div class="doc-meta">{{invoice_meta}}</div>
      </div>
      <table class="line-items">
        <thead>
          <tr>
            <th>Description</th>
            <th class="num">Qty</th>
            <th class="num">Unit price</th>
            <th class="num">Amount</th>
          </tr>
        </thead>
        <tbody>{{line_items}}</tbody>
      </table>
      <div class="totals-wrap"><div class="totals">{{totals}}</div></div>
      {{terms_notes}}
      {{invoice_footer}}
    </div>
  </div>
`;

const auroraBody = `
  {{watermark}}
  <div class="accent-bar"></div>
  <div class="page-content">
    <div class="header">
      <div class="brand">
        <div class="company-name">{{company_name}}</div>
        <div class="company-meta">{{company_details}}</div>
      </div>
      <div class="doc">
        <div class="doc-title">{{document_title}}</div>
        <div class="doc-number">#{{invoice_number}}</div>
      </div>
    </div>
    <div class="meta-grid">
      <div class="bill-to">
        <div class="block-label">Bill to</div>
        {{client_section}}
      </div>
      <div class="doc-meta">{{invoice_meta}}</div>
    </div>
    <table class="line-items">
      <thead>
        <tr>
          <th>Description</th>
          <th class="num">Qty</th>
          <th class="num">Unit price</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>{{line_items}}</tbody>
    </table>
    <div class="totals-wrap"><div class="totals">{{totals}}</div></div>
    {{terms_notes}}
    {{invoice_footer}}
  </div>
`;

const onyxBody = `
  {{watermark}}
  <div class="page-content">
    <div class="masthead">
      <div class="company-name">{{company_name}}</div>
      <div class="doc-title">{{document_title}}</div>
    </div>
    <div class="rule"></div>
    <div class="info-row">
      <div class="info-block">
        <div class="block-label">Billed to</div>
        {{client_section}}
      </div>
      <div class="info-block">
        <div class="block-label">From</div>
        <div class="party-name">{{company_name}}</div>
        {{company_details}}
      </div>
      <div class="info-block info-meta">
        <div class="block-label">Details</div>
        {{invoice_meta}}
      </div>
    </div>
    <table class="line-items">
      <thead>
        <tr>
          <th>Description</th>
          <th class="num">Qty</th>
          <th class="num">Unit price</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>{{line_items}}</tbody>
    </table>
    <div class="totals-wrap"><div class="totals">{{totals}}</div></div>
    {{terms_notes}}
    {{invoice_footer}}
  </div>
`;

export type SystemTemplateDefinition = {
  name: string;
  slug: string;
  isDefault: boolean;
  html: string;
  css: string;
};

export const SYSTEM_TEMPLATES: SystemTemplateDefinition[] = [
  {
    name: "Classic",
    slug: "classic",
    isDefault: true,
    css: `
      ${watermarkStyles}
      ${tableBandStyles}
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #111; }
      .page-content { padding: 40px; }
      .header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 36px; }
      .company-name { font-size: 20px; font-weight: bold; margin-bottom: 6px; }
      .party-detail { color: #555; line-height: 1.55; font-size: 12px; }
      .invoice-title { font-size: 28px; font-weight: bold; color: #2563eb; text-align: right; }
      .invoice-meta { text-align: right; margin-top: 10px; color: #555; line-height: 1.7; font-size: 12px; }
      .parties { margin-bottom: 28px; }
      .party-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-bottom: 8px; }
      .party-name { font-weight: bold; font-size: 14px; margin-bottom: 4px; }
      table.line-items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      th { background: #f4f4f5; text-align: left; padding: 10px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #666; border-bottom: 2px solid #e4e4e7; }
      td { padding: 10px 12px; border-bottom: 1px solid #e4e4e7; vertical-align: top; }
      .num { text-align: right; white-space: nowrap; }
      .totals { margin-left: auto; width: 280px; }
      .totals-row { display: flex; justify-content: space-between; padding: 5px 0; }
      .totals-row.total { font-weight: bold; font-size: 16px; border-top: 2px solid #111; margin-top: 8px; padding-top: 10px; }
    `,
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><title>{{page_title}} {{invoice_number}}</title><style>{{styles}}</style></head><body class="page">${sharedBody}</body></html>`,
  },
  {
    name: "Modern",
    slug: "modern",
    isDefault: false,
    css: `
      ${watermarkStyles}
      ${tableBandStyles}
      table.line-items tbody tr.band-even { background: #f8fafc; }
      table.line-items tbody tr.band-even td { border-bottom-color: #e2e8f0; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #0f172a; }
      .page-content { padding: 0; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 28px; background: #0f172a; color: #fff; padding: 36px 44px; border-top: 4px solid #38bdf8; }
      .brand { max-width: 60%; }
      .company-name { font-size: 21px; font-weight: 700; letter-spacing: -0.01em; margin-bottom: 10px; color: #fff; }
      .company-meta .party-detail { color: #94a3b8; line-height: 1.6; font-size: 12px; }
      .doc { text-align: right; flex-shrink: 0; }
      .doc-title { font-size: 26px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: #fff; }
      .doc-number { display: inline-block; margin-top: 12px; padding: 5px 14px; border-radius: 999px; background: rgba(56, 189, 248, 0.16); color: #7dd3fc; font-weight: 700; font-size: 12px; letter-spacing: 0.03em; }
      .body-inner { padding: 32px 44px 44px; }
      .meta-grid { display: flex; justify-content: space-between; align-items: flex-start; gap: 28px; margin-bottom: 30px; }
      .block-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 8px; }
      .party-name { font-weight: 700; font-size: 15px; margin-bottom: 4px; color: #0f172a; }
      .party-detail { color: #64748b; line-height: 1.6; font-size: 12px; }
      .doc-meta { text-align: right; color: #475569; line-height: 1.85; font-size: 12px; }
      table.line-items { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
      th { text-align: left; padding: 11px 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #0f172a; border-bottom: 2px solid #0f172a; }
      th.num { text-align: right; }
      td { padding: 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; color: #334155; }
      .num { text-align: right; white-space: nowrap; }
      .totals-wrap { display: flex; justify-content: flex-end; }
      .totals { width: 300px; }
      .totals-row { display: flex; justify-content: space-between; padding: 6px 0; color: #475569; font-size: 13px; }
      .totals-row.total { font-weight: 800; font-size: 16px; color: #0f172a; border-top: 2px solid #0f172a; margin-top: 8px; padding-top: 12px; }
      .terms-notes { margin-top: 30px; }
      .terms-notes-label { color: #0f172a; }
      .invoice-footer { border-top-color: #e2e8f0; color: #94a3b8; }
    `,
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><title>{{page_title}} {{invoice_number}}</title><style>{{styles}}</style></head><body class="page">${modernBody}</body></html>`,
  },
  {
    name: "Minimal",
    slug: "minimal",
    isDefault: false,
    css: `
      ${watermarkStyles}
      ${tableBandStyles}
      table.line-items tbody tr.band-even { background: #f9fafb; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #111827; }
      .page-content { padding: 44px 48px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 32px; margin-bottom: 36px; padding-bottom: 20px; border-bottom: 2px solid #111827; }
      .company-name { font-size: 18px; font-weight: 700; margin-bottom: 6px; letter-spacing: -0.01em; }
      .party-detail { color: #4b5563; line-height: 1.6; font-size: 12px; }
      .invoice-title { font-size: 26px; font-weight: 800; letter-spacing: 0.04em; text-align: right; }
      .invoice-meta { text-align: right; margin-top: 10px; line-height: 1.75; color: #374151; font-size: 12px; }
      .parties { margin-bottom: 28px; }
      .party-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; margin-bottom: 8px; }
      .party-name { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
      table.line-items { width: 100%; border-collapse: collapse; margin: 8px 0 24px; }
      th { text-align: left; padding: 10px 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; border-bottom: 2px solid #111827; }
      td { padding: 12px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
      .num { text-align: right; white-space: nowrap; }
      .totals { margin-left: auto; width: 300px; margin-top: 8px; }
      .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
      .totals-row.total { font-size: 16px; font-weight: 800; border-top: 2px solid #111827; margin-top: 10px; padding-top: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
      .terms-notes { margin-top: 36px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
      .terms-notes-label { color: #111827; }
      .invoice-footer { font-size: 12px; color: #4b5563; font-weight: 500; }
    `,
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><title>{{page_title}} {{invoice_number}}</title><style>{{styles}}</style></head><body class="page">${sharedBody}</body></html>`,
  },
  {
    name: "Aurora",
    slug: "aurora",
    isDefault: false,
    css: `
      ${watermarkStyles}
      ${tableBandStyles}
      table.line-items tbody tr.band-even { background: #fafaff; }
      table.line-items tbody tr.band-even td { border-bottom-color: #eef2f7; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #0f172a; }
      .accent-bar { height: 8px; background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 55%, #d946ef 100%); }
      .page-content { padding: 38px 44px 44px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 28px; margin-bottom: 34px; }
      .company-name { font-size: 22px; font-weight: 700; color: #4f46e5; letter-spacing: -0.02em; margin-bottom: 8px; }
      .party-detail { color: #64748b; line-height: 1.6; font-size: 12px; }
      .doc { text-align: right; }
      .doc-title { font-size: 30px; font-weight: 800; letter-spacing: 0.14em; color: #0f172a; }
      .doc-number { display: inline-block; margin-top: 10px; padding: 4px 14px; border-radius: 999px; background: #eef2ff; color: #4f46e5; font-weight: 700; font-size: 12px; letter-spacing: 0.02em; }
      .meta-grid { display: flex; justify-content: space-between; align-items: flex-start; gap: 28px; margin-bottom: 28px; }
      .block-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 8px; }
      .party-name { font-weight: 700; font-size: 15px; margin-bottom: 4px; color: #0f172a; }
      .doc-meta { text-align: right; color: #475569; line-height: 1.85; font-size: 12px; }
      table.line-items { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
      th { text-align: left; padding: 11px 14px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6366f1; background: #eef2ff; }
      th.num { text-align: right; }
      td { padding: 12px 14px; border-bottom: 1px solid #eef2f7; vertical-align: top; }
      .num { text-align: right; white-space: nowrap; }
      .totals-wrap { display: flex; justify-content: flex-end; }
      .totals { width: 300px; background: #f8fafc; border: 1px solid #eef2f7; border-radius: 14px; padding: 16px 20px; }
      .totals-row { display: flex; justify-content: space-between; padding: 5px 0; color: #475569; font-size: 13px; }
      .totals-row.total { font-weight: 800; font-size: 16px; color: #4f46e5; border-top: 1px solid #e2e8f0; margin-top: 8px; padding-top: 12px; }
      .terms-notes { margin-top: 30px; }
      .terms-notes-label { color: #4f46e5; }
      .invoice-footer { border-top-color: #eef2f7; color: #94a3b8; }
    `,
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><title>{{page_title}} {{invoice_number}}</title><style>{{styles}}</style></head><body class="page">${auroraBody}</body></html>`,
  },
  {
    name: "Onyx",
    slug: "onyx",
    isDefault: false,
    css: `
      ${watermarkStyles}
      ${tableBandStyles}
      table.line-items tbody tr.band-even { background: #fafaf9; }
      table.line-items tbody tr.band-even td { border-bottom-color: #e7e5e4; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Georgia, 'Times New Roman', serif; font-size: 12px; color: #1c1917; }
      .page-content { padding: 48px 52px; }
      .masthead { display: flex; justify-content: space-between; align-items: baseline; gap: 24px; }
      .company-name { font-size: 25px; font-weight: 700; letter-spacing: -0.01em; }
      .doc-title { font-size: 20px; font-weight: 400; letter-spacing: 0.34em; text-transform: uppercase; color: #78716c; }
      .rule { height: 3px; background: #1c1917; margin: 14px 0 30px; }
      .info-row { display: flex; justify-content: space-between; gap: 32px; margin-bottom: 34px; }
      .info-block { flex: 1; color: #44403c; line-height: 1.75; }
      .info-block.info-meta { text-align: right; }
      .block-label { font-family: Helvetica, Arial, sans-serif; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: #a8a29e; margin-bottom: 8px; }
      .party-name { font-size: 14px; font-weight: 700; margin-bottom: 4px; color: #1c1917; }
      .party-detail { color: #57534e; line-height: 1.65; font-size: 12px; }
      table.line-items { width: 100%; border-collapse: collapse; margin-bottom: 22px; }
      th { font-family: Helvetica, Arial, sans-serif; text-align: left; padding: 10px 10px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #78716c; border-bottom: 2px solid #1c1917; }
      th.num { text-align: right; }
      td { padding: 13px 10px; border-bottom: 1px solid #e7e5e4; vertical-align: top; }
      .num { text-align: right; white-space: nowrap; }
      .totals-wrap { display: flex; justify-content: flex-end; }
      .totals { width: 310px; }
      .totals-row { display: flex; justify-content: space-between; padding: 7px 2px; color: #57534e; font-size: 13px; }
      .totals-row.total { font-family: Helvetica, Arial, sans-serif; background: #1c1917; color: #ffffff; padding: 13px 16px; margin-top: 10px; font-size: 15px; font-weight: 700; letter-spacing: 0.02em; }
      .terms-notes { margin-top: 34px; padding-top: 20px; border-top: 1px solid #e7e5e4; }
      .terms-notes-label { color: #1c1917; }
      .invoice-footer { border-top-color: #e7e5e4; color: #a8a29e; font-style: italic; }
    `,
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><title>{{page_title}} {{invoice_number}}</title><style>{{styles}}</style></head><body class="page">${onyxBody}</body></html>`,
  },
];
