import type { InvoiceHtmlData } from "@/lib/invoice-templates/types";
import { SYSTEM_TEMPLATES } from "@/lib/invoice-templates/definitions";
import { renderFromTemplate } from "@/lib/invoice-templates/render";
import { inlineCompanyLogo } from "@/lib/inline-company-logo";
import { companyBrandingFields } from "@/lib/company-branding";
import {
  buildCustomFieldDisplayRows,
  normalizeCustomFieldDefinitions,
  normalizeCustomFieldsPdfPlacement,
} from "@/lib/custom-fields";
import { prisma } from "@/lib/db";
import { getCreditNoteForMember } from "@/lib/credit-notes";
import { calculateInvoiceTotals } from "@/lib/calculator";
import { normalizeAppliedTaxes } from "@/lib/tax-rates";
import { ensureSystemTemplates, getDefaultTemplateId, getTemplateById } from "@/lib/templates";
import { renderInvoicePdf } from "@/lib/ai-docs";

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

type CreditNoteWithRelations = NonNullable<Awaited<ReturnType<typeof getCreditNoteForMember>>>;

export function creditNoteToHtmlData(note: CreditNoteWithRelations): InvoiceHtmlData {
  const definitions = normalizeCustomFieldDefinitions(note.company.customFieldDefinitions);
  const customFieldRows = buildCustomFieldDisplayRows(definitions, "invoice", note.customFields, {
    forPdf: true,
  });

  return {
    documentKind: "credit_note",
    company: {
      name: note.company.name,
      logoUrl: note.company.logoUrl,
      email: note.company.email,
      phone: note.company.phone,
      address: note.company.address,
      city: note.company.city,
      state: note.company.state,
      zip: note.company.zip,
      country: note.company.country,
      ...companyBrandingFields(note.company),
    },
    client: note.client,
    invoice: {
      number: note.number,
      status: note.status,
      issueDate: note.issueDate,
      currency: note.currency,
      subtotal: Number(note.subtotal),
      taxRate: Number(note.taxRate),
      taxAmount: Number(note.taxAmount),
      taxInclusive: note.taxInclusive,
      taxes: taxesWithAmounts(
        note.taxes,
        Number(note.taxRate),
        note.taxInclusive,
        note.taxCompound === true,
        Number(note.discount),
        note.items,
      ),
      discount: Number(note.discount),
      total: Number(note.total),
      notes: [note.reason, note.notes].filter(Boolean).join("\n\n") || note.notes,
      relatedInvoiceNumber: note.invoice.number,
      exchangeRate: note.exchangeRate != null ? Number(note.exchangeRate) : null,
      exchangeRateDate: note.exchangeRateDate
        ? note.exchangeRateDate.toISOString().slice(0, 10)
        : null,
      exchangeRateSource: note.exchangeRateSource,
      homeCurrency: note.company.currency,
      homeCurrencyTotal: note.homeCurrencyTotal != null ? Number(note.homeCurrencyTotal) : null,
      showExchangeRateOnPdf: note.company.fxShowOnPdf !== false,
    },
    customFields: customFieldRows.map((row) => ({
      id: row.id,
      label: row.label,
      value: row.value,
      multiline: row.multiline,
    })),
    customFieldsPlacement: normalizeCustomFieldsPdfPlacement(
      note.company.customFieldsPdfPlacement,
    ),
    items: note.items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      amount: Number(item.amount),
      sectionTitle: item.sectionTitle,
      sectionSortOrder: item.sectionSortOrder,
      sortOrder: item.sortOrder,
    })),
  };
}

async function resolveCreditNoteTemplate(note: CreditNoteWithRelations) {
  const lookupTemplate = (templateId: string) =>
    prisma.invoiceTemplate.findFirst({
      where: {
        id: templateId,
        OR: [{ isSystem: true, companyId: null }, { companyId: note.companyId }],
      },
    });

  if (note.template) {
    return { html: note.template.html, css: note.template.css };
  }
  if (note.templateId) {
    const template = await lookupTemplate(note.templateId);
    if (template) return { html: template.html, css: template.css };
  }
  if (note.company.defaultTemplateId) {
    const template = await lookupTemplate(note.company.defaultTemplateId);
    if (template) return { html: template.html, css: template.css };
  }
  const defaultId = await getDefaultTemplateId(note.companyId);
  if (defaultId) {
    const template = await getTemplateById(defaultId, note.companyId);
    if (template) return { html: template.html, css: template.css };
  }
  const classic = SYSTEM_TEMPLATES.find((t) => t.slug === "classic")!;
  return { html: classic.html, css: classic.css };
}

export async function renderCreditNoteHtml(note: CreditNoteWithRelations): Promise<string> {
  await ensureSystemTemplates();
  const data = await inlineCompanyLogo(creditNoteToHtmlData(note));
  const { html, css } = await resolveCreditNoteTemplate(note);
  return renderFromTemplate(html, css, data);
}

export async function generateCreditNotePdfBuffer(id: string, companyId: string) {
  const note = await getCreditNoteForMember(id, companyId);
  if (!note) return null;
  const html = await renderCreditNoteHtml(note);
  const pdfBuffer = await renderInvoicePdf(html);
  return { creditNote: note, pdfBuffer };
}
