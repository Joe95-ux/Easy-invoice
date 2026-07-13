export const watermarkStyles = `
  .watermark {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    opacity: 0.07;
    z-index: 0;
    pointer-events: none;
  }
  @media screen {
    .page { min-height: 100vh; }
  }
  .watermark img { width: 300px; max-width: 70vw; height: auto; object-fit: contain; }
  .company-logo { margin-bottom: 10px; }
  .company-logo img {
    display: block;
    max-height: 52px;
    max-width: 200px;
    width: auto;
    height: auto;
    object-fit: contain;
  }
  .company-logo--white {
    display: inline-block;
    background: #ffffff;
    padding: 8px 10px;
    border-radius: 8px;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06);
  }
  .company-logo--dark {
    display: inline-block;
    background: #0f172a;
    padding: 8px 10px;
    border-radius: 8px;
  }
  .company-logo--none {
    display: inline-block;
  }
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
  .terms-notes-body {
    color: #475569;
    line-height: 1.65;
    white-space: pre-wrap;
  }
  .payment-info { margin-top: 28px; }
  .payment-info-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #374151;
    margin-bottom: 10px;
  }
  .payment-info-row {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    text-align: left;
    line-height: 1.55;
    font-size: 12px;
    color: #475569;
    margin-bottom: 8px;
  }
  .payment-info-method {
    font-weight: 600;
    color: #1f2937;
    min-width: 6.5rem;
    flex-shrink: 0;
  }
  .payment-info-detail {
    color: #475569;
    white-space: pre-wrap;
    flex: 1;
    min-width: 0;
  }
  .totals.totals--wide { width: min(100%, 420px) !important; }
  .payment-schedule-block { margin-top: 20px; width: 100%; }
  .payment-block-label {
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .payment-schedule-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  .payment-schedule-table th,
  .payment-schedule-table td {
    padding: 8px 10px;
    border-bottom: 1px solid #e4e4e7;
    text-align: left;
    vertical-align: top;
  }
  .payment-schedule-table th {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #666;
  }
  .payment-schedule-table .num { text-align: right; white-space: nowrap; }
  .payment-history { margin-top: 16px; font-size: 12px; color: #475569; }
  .payment-history-row { line-height: 1.55; }
`;

export const tableBandStyles = `
  table.line-items tbody tr.band-odd { background: transparent; }
  table.line-items tbody tr.band-even { background: rgba(15, 23, 42, 0.03); }
  table.line-items tbody tr.band-even td { border-bottom-color: rgba(15, 23, 42, 0.06); }
`;

const sharedBody = `
  {{watermark}}
  <div class="page-content">
    <div class="header">
      <div class="company-info">
        {{company_logo}}
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
    <div class="totals {{totals_class}}">{{totals}}</div>
    {{payment_schedule}}
    {{payment_info}}
    {{terms_notes}}
    {{invoice_footer}}
  </div>
`;

const modernBody = `
  {{watermark}}
  <div class="page-content">
    <div class="header header-dark">
      <div class="brand">
        {{company_logo}}
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
      <div class="totals-wrap"><div class="totals {{totals_class}}">{{totals}}</div></div>
      {{payment_schedule}}
      {{payment_info}}
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
        {{company_logo}}
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
    <div class="totals-wrap"><div class="totals {{totals_class}}">{{totals}}</div></div>
    {{payment_schedule}}
    {{payment_info}}
    {{terms_notes}}
    {{invoice_footer}}
  </div>
`;

const onyxBody = `
  {{watermark}}
  <div class="page-content">
    <div class="masthead">
      {{company_logo}}
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
    <div class="totals-wrap"><div class="totals {{totals_class}}">{{totals}}</div></div>
    {{payment_schedule}}
    {{payment_info}}
    {{terms_notes}}
    {{invoice_footer}}
  </div>
`;

const telegraphBody = `
  {{watermark}}
  <div class="page-content">
    <div class="segment-rule" aria-hidden="true"><span></span><span></span><span></span></div>
    <div class="header">
      <div class="header-main">
        {{company_logo}}
        <div class="company-name">{{company_name}}</div>
        <div class="company-meta">{{company_details}}</div>
      </div>
      <div class="header-doc">
        <div class="doc-title">{{document_title}}</div>
        <div class="doc-number">#{{invoice_number}}</div>
      </div>
    </div>
    <div class="segment-rule" aria-hidden="true"><span></span><span></span></div>
    <div class="meta-row">
      <div class="meta-block">
        <div class="block-label">[ bill_to ]</div>
        {{client_section}}
      </div>
      <div class="meta-block meta-dates">
        <div class="block-label">[ details ]</div>
        {{invoice_meta}}
      </div>
    </div>
    <div class="segment-rule short" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
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
    <div class="segment-rule" aria-hidden="true"><span></span><span></span></div>
    <div class="totals-wrap"><div class="totals {{totals_class}}">{{totals}}</div></div>
    {{payment_schedule}}
    {{payment_info}}
    {{terms_notes}}
    <div class="segment-rule footer-rule" aria-hidden="true"><span></span></div>
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
      .page-content { padding: 32px; }
      .header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 36px; }
      .company-name { font-size: 20px; font-weight: bold; margin-bottom: 6px; }
      .party-detail { color: #555; line-height: 1.55; font-size: 12px; }
      .invoice-title { font-size: 28px; font-weight: bold; color: #2563eb; text-align: right; }
      .invoice-meta { text-align: right; margin-top: 10px; color: #555; line-height: 1.7; font-size: 12px; }
      .parties { margin-bottom: 28px; }
      .party-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-bottom: 8px; }
      .party-name { font-weight: bold; font-size: 14px; margin-bottom: 4px; }
      table.line-items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      th { background: rgba(244, 244, 245, 0.55); text-align: left; padding: 10px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #666; border-bottom: 2px solid #e4e4e7; }
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
    name: "Telegraph",
    slug: "telegraph",
    isDefault: false,
    css: `
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap');
      ${watermarkStyles}
      @page { background-color: #f7f6f3; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body {
        margin: 0;
        padding: 0;
        min-height: 100%;
        background: transparent;
      }
      body {
        font-family: 'IBM Plex Mono', 'Courier New', Courier, monospace;
        font-size: 11px;
        color: #141414;
        letter-spacing: -0.01em;
      }
      .page-content { padding: 32px 36px 40px; }
      .segment-rule {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 22px 0;
      }
      .segment-rule.short { margin: 18px 0; }
      .segment-rule.footer-rule { margin: 28px 0 20px; }
      .segment-rule span {
        display: block;
        height: 1px;
        background: #141414;
      }
      .segment-rule span:nth-child(1) { flex: 3; }
      .segment-rule span:nth-child(2) { flex: 1.2; opacity: 0.35; }
      .segment-rule span:nth-child(3) { flex: 2; opacity: 0.55; }
      .segment-rule span:nth-child(4) { flex: 0.8; opacity: 0.25; }
      .segment-rule.short span:nth-child(1) { flex: 1.5; }
      .segment-rule.short span:nth-child(2) { flex: 2.5; }
      .segment-rule.short span:nth-child(3) { flex: 0.6; opacity: 0.3; }
      .segment-rule.short span:nth-child(4) { flex: 1.8; opacity: 0.5; }
      .segment-rule.footer-rule span { flex: 1; opacity: 0.4; }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 32px;
      }
      .header-main { max-width: 58%; }
      .company-name {
        font-size: 17px;
        font-weight: 600;
        letter-spacing: -0.03em;
        margin-bottom: 10px;
        text-transform: uppercase;
      }
      .company-meta .party-detail { color: #525252; line-height: 1.75; font-size: 11px; }
      .header-doc { text-align: right; flex-shrink: 0; }
      .doc-title {
        font-size: 22px;
        font-weight: 600;
        letter-spacing: 0.22em;
        text-transform: uppercase;
      }
      .doc-number {
        margin-top: 8px;
        font-size: 11px;
        color: #525252;
        letter-spacing: 0.06em;
      }
      .meta-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 36px;
      }
      .meta-block { flex: 1; }
      .meta-dates { text-align: right; max-width: 42%; }
      .block-label {
        font-size: 10px;
        font-weight: 500;
        letter-spacing: 0.12em;
        color: #737373;
        margin-bottom: 10px;
        text-transform: lowercase;
      }
      .party-name { font-weight: 600; font-size: 13px; margin-bottom: 6px; }
      .party-detail { color: #525252; line-height: 1.75; font-size: 11px; }
      .meta-dates { color: #404040; line-height: 1.85; font-size: 11px; }
      table.line-items { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
      table.line-items tbody tr.band-odd { background: transparent; }
      table.line-items tbody tr.band-even { background: rgba(20, 20, 20, 0.03); }
      th {
        text-align: left;
        padding: 10px 8px;
        font-size: 9px;
        font-weight: 600;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #525252;
        border-top: 1px dashed #a3a3a3;
        border-bottom: 1px dashed #141414;
      }
      th.num { text-align: right; }
      td {
        padding: 11px 8px;
        border-bottom: 1px dashed #d4d4d4;
        vertical-align: top;
        font-size: 11px;
      }
      table.line-items tbody tr:last-child td { border-bottom: 1px dashed #737373; }
      .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
      .totals-wrap { display: flex; justify-content: flex-end; margin-top: 6px; }
      .totals {
        width: 300px;
        border: 1px dashed #a3a3a3;
        padding: 14px 16px;
        background: rgba(255, 255, 255, 0.45);
      }
      .totals-row {
        display: flex;
        justify-content: space-between;
        padding: 5px 0;
        color: #404040;
        font-size: 11px;
        font-variant-numeric: tabular-nums;
      }
      .totals-row.total {
        font-weight: 600;
        font-size: 13px;
        color: #141414;
        border-top: 1px dashed #141414;
        margin-top: 8px;
        padding-top: 10px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .terms-notes {
        margin-top: 28px;
        padding: 14px 0 0;
        border-top: 1px dashed #d4d4d4;
      }
      .terms-notes-label {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.12em;
        text-transform: lowercase;
        color: #737373;
        margin-bottom: 8px;
      }
      .terms-notes div:last-child,
      .terms-notes-body { color: #404040; line-height: 1.75; }
      .invoice-footer {
        border-top: none;
        margin-top: 0;
        padding-top: 0;
        text-align: left;
        font-size: 10px;
        color: #737373;
        letter-spacing: 0.04em;
      }
    `,
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><title>{{page_title}} {{invoice_number}}</title><style>{{styles}}</style></head><body class="page">${telegraphBody}</body></html>`,
  },
  {
    name: "Aurora",
    slug: "aurora",
    isDefault: false,
    css: `
      ${watermarkStyles}
      ${tableBandStyles}
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
      th { text-align: left; padding: 11px 14px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6366f1; background: rgba(238, 242, 255, 0.55); }
      th.num { text-align: right; }
      td { padding: 12px 14px; border-bottom: 1px solid #eef2f7; vertical-align: top; }
      .num { text-align: right; white-space: nowrap; }
      .totals-wrap { display: flex; justify-content: flex-end; }
      .totals { width: 300px; background: rgba(248, 250, 252, 0.6); border: 1px solid #eef2f7; border-radius: 14px; padding: 16px 20px; }
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
