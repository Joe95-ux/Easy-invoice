import type { InvoiceHtmlData } from "@/lib/invoice-templates/types";
import { SYSTEM_TEMPLATES } from "@/lib/invoice-templates/definitions";
import { renderFromTemplate } from "@/lib/invoice-templates/render";
import { inlineCompanyLogo } from "@/lib/inline-company-logo";
import { companyBrandingFields } from "@/lib/company-branding";
import { prisma } from "@/lib/db";
import { getInvoiceForMember } from "@/lib/invoices";
import { buildInvoicePaymentSummary, PAYMENT_METHOD_LABELS } from "@/lib/invoice-payments";
import { ensureSystemTemplates, getDefaultTemplateId, getTemplateById } from "@/lib/templates";

export type { InvoiceHtmlData };

type InvoiceWithRelations = NonNullable<Awaited<ReturnType<typeof getInvoiceForMember>>>;

export type RenderInvoiceHtmlOptions = {
  /** Embed logo as data URL (required for PDF). Browser previews can load remote URLs. */
  inlineLogo?: boolean;
  /** Sync system templates in DB before resolving template. Skip for fast screen previews. */
  ensureTemplates?: boolean;
};

export function invoiceToHtmlData(
  invoice: InvoiceWithRelations,
): InvoiceHtmlData {
  const paymentSummary = buildInvoicePaymentSummary(invoice);

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
      discount: Number(invoice.discount),
      total: Number(invoice.total),
      notes: invoice.notes,
      amountPaid: paymentSummary.amountPaid,
      balanceDue: paymentSummary.balanceDue,
    },
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      amount: Number(item.amount),
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
  const { inlineLogo = true, ensureTemplates = true } = options;

  if (ensureTemplates) {
    await ensureSystemTemplates();
  }

  let data = invoiceToHtmlData(invoice);
  if (inlineLogo) {
    data = await inlineCompanyLogo(data);
  }

  const { html, css } = await resolveInvoiceTemplate(invoice, ensureTemplates);
  return renderFromTemplate(html, css, data);
}