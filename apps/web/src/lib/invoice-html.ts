import type { InvoiceHtmlData } from "@/lib/invoice-templates/types";
import { SYSTEM_TEMPLATES } from "@/lib/invoice-templates/definitions";
import { renderFromTemplate } from "@/lib/invoice-templates/render";
import { inlineCompanyLogo } from "@/lib/inline-company-logo";
import { companyBrandingFields } from "@/lib/company-branding";
import {
  buildCustomFieldDisplayRows,
  normalizeCustomFieldDefinitions,
} from "@/lib/custom-fields";
import { prisma } from "@/lib/db";
import { getInvoiceForMember } from "@/lib/invoices";
import { buildInvoicePaymentSummary, PAYMENT_METHOD_LABELS } from "@/lib/invoice-payments";
import {
  buildPaymentQrImageDataUrl,
  getInvoicePaymentQr,
} from "@/lib/invoice-payment-qr";
import { ensureSystemTemplates, getDefaultTemplateId, getTemplateById } from "@/lib/templates";
import { calculateInvoiceTotals } from "@/lib/calculator";
import { normalizeAppliedTaxes } from "@/lib/tax-rates";

export type { InvoiceHtmlData };

function taxesWithAmounts(
  rawTaxes: unknown,
  taxRate: number,
  taxInclusive: boolean,
  taxCompound: boolean,
  discount: number,
  items: Array<{ quantity: unknown; unitPrice: unknown; taxable?: boolean }>,
) {
  const taxes = normalizeAppliedTaxes(rawTaxes);
  if (taxes.length === 0 && taxRate <= 0) return [];
  const { taxBreakdown } = calculateInvoiceTotals({
    lineItems: items.map((item) => ({
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      taxable: item.taxable !== false,
    })),
    taxes: taxes.map((tax) => ({ name: tax.name, rate: tax.rate })),
    taxRate,
    discount,
    taxInclusive,
    taxCompound,
  });
  if (taxBreakdown.length > 0) {
    return taxBreakdown.map((line) => ({
      name: line.name,
      rate: line.rate,
      amount: line.amount,
    }));
  }
  return taxes;
}

type InvoiceWithRelations = NonNullable<Awaited<ReturnType<typeof getInvoiceForMember>>>;

export type RenderInvoiceHtmlOptions = {
  /** Embed logo as data URL (required for PDF). Browser previews can load remote URLs. */
  inlineLogo?: boolean;
  /** Sync system templates in DB before resolving template. Skip for fast screen previews. */
  ensureTemplates?: boolean;
  /** Include linked scan-to-pay QR when present (default true for invoices). */
  includePaymentQr?: boolean;
};

export function invoiceToHtmlData(
  invoice: InvoiceWithRelations,
): InvoiceHtmlData {
  const paymentSummary = buildInvoicePaymentSummary(invoice);
  const definitions = normalizeCustomFieldDefinitions(
    invoice.company.customFieldDefinitions,
  );
  const customFieldRows = buildCustomFieldDisplayRows(
    definitions,
    "invoice",
    invoice.customFields,
    { forPdf: true },
  );

  return {
    documentKind: "invoice",
    company: {
      name: invoice.company.name,
      logoUrl: invoice.company.logoUrl,
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
    invoice: {
      number: invoice.number,
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      currency: invoice.currency,
      subtotal: Number(invoice.subtotal),
      taxRate: Number(invoice.taxRate),
      taxAmount: Number(invoice.taxAmount),
      taxInclusive: invoice.taxInclusive,
      taxes: taxesWithAmounts(
        invoice.taxes,
        Number(invoice.taxRate),
        invoice.taxInclusive,
        invoice.taxCompound === true,
        Number(invoice.discount),
        invoice.items,
      ),
      discount: Number(invoice.discount),
      total: Number(invoice.total),
      notes: invoice.notes,
      amountPaid: paymentSummary.amountPaid,
      balanceDue: paymentSummary.balanceDue,
    },
    customFields: customFieldRows.map((row) => ({
      id: row.id,
      label: row.label,
      value: row.value,
      multiline: row.multiline,
    })),
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      amount: Number(item.amount),
      sectionTitle: item.sectionTitle,
      sectionSortOrder: item.sectionSortOrder,
      sortOrder: item.sortOrder,
    })),
    installments: paymentSummary.installments.map((row) => ({
      dueDate: row.dueDate,
      amount: row.amount,
      label: row.label,
      paidAmount: row.paidAmount,
      balanceDue: row.balanceDue,
      isPaid: row.isPaid,
    })),
    payments: invoice.payments.map((payment) => ({
      paidAt: payment.paidAt,
      amount: Number(payment.amount),
      method: PAYMENT_METHOD_LABELS[payment.method],
      reference: payment.reference,
      receiptNumber: payment.receiptNumber,
    })),
  };
}

async function resolveInvoiceTemplate(
  invoice: InvoiceWithRelations,
  ensureTemplates: boolean,
): Promise<{ html: string; css: string | null }> {
  if (invoice.template) {
    return { html: invoice.template.html, css: invoice.template.css };
  }

  const lookupTemplate = (templateId: string) =>
    prisma.invoiceTemplate.findFirst({
      where: {
        id: templateId,
        OR: [{ isSystem: true, companyId: null }, { companyId: invoice.companyId }],
      },
    });

  if (invoice.templateId) {
    const template = await lookupTemplate(invoice.templateId);
    if (template) return { html: template.html, css: template.css };
  }

  if (invoice.company.defaultTemplateId) {
    const template = await lookupTemplate(invoice.company.defaultTemplateId);
    if (template) return { html: template.html, css: template.css };
  }

  if (ensureTemplates) {
    const defaultId = await getDefaultTemplateId(invoice.companyId);
    if (defaultId) {
      const template = await getTemplateById(defaultId, invoice.companyId);
      if (template) return { html: template.html, css: template.css };
    }
  }

  const classic = SYSTEM_TEMPLATES.find((t) => t.slug === "classic")!;
  return { html: classic.html, css: classic.css };
}

export async function renderInvoiceHtmlForInvoice(
  invoice: InvoiceWithRelations,
  options: RenderInvoiceHtmlOptions = {},
): Promise<string> {
  const { inlineLogo = true, ensureTemplates = true, includePaymentQr = true } = options;

  if (ensureTemplates) {
    await ensureSystemTemplates();
  }

  let data = invoiceToHtmlData(invoice);

  if (includePaymentQr) {
    const paymentQr = await getInvoicePaymentQr(invoice.id, invoice.companyId);
    if (paymentQr?.qrCode.status === "ACTIVE") {
      data = {
        ...data,
        paymentQr: {
          imageDataUrl: await buildPaymentQrImageDataUrl(paymentQr.scanUrl),
          label: paymentQr.label,
        },
      };
    }
  }

  if (inlineLogo) {
    data = await inlineCompanyLogo(data);
  }

  const { html, css } = await resolveInvoiceTemplate(invoice, ensureTemplates);
  return renderFromTemplate(html, css, data);
}