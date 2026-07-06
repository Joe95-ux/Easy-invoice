import type { InvoiceHtmlData } from "@/lib/invoice-templates/types";
import { SYSTEM_TEMPLATES } from "@/lib/invoice-templates/definitions";
import { renderFromTemplate } from "@/lib/invoice-templates/render";
import { inlineCompanyLogo } from "@/lib/inline-company-logo";
import { companyBrandingFields } from "@/lib/company-branding";
import { getInvoiceForMember } from "@/lib/invoices";
import { buildInvoicePaymentSummary, PAYMENT_METHOD_LABELS } from "@/lib/invoice-payments";
import { ensureSystemTemplates, getDefaultTemplateId, getTemplateById } from "@/lib/templates";

export type { InvoiceHtmlData };

export function invoiceToHtmlData(
  invoice: NonNullable<Awaited<ReturnType<typeof getInvoiceForMember>>>,
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

export async function renderInvoiceHtmlForInvoice(
  invoice: NonNullable<Awaited<ReturnType<typeof getInvoiceForMember>>>,
): Promise<string> {
  await ensureSystemTemplates();
  const data = await inlineCompanyLogo(invoiceToHtmlData(invoice));

  if (invoice.template) {
    return renderFromTemplate(invoice.template.html, invoice.template.css, data);
  }

  if (invoice.templateId) {
    const template = await getTemplateById(invoice.templateId, invoice.companyId);
    if (template) {
      return renderFromTemplate(template.html, template.css, data);
    }
  }

  const defaultId = await getDefaultTemplateId(invoice.companyId);
  if (defaultId) {
    const template = await getTemplateById(defaultId, invoice.companyId);
    if (template) {
      return renderFromTemplate(template.html, template.css, data);
    }
  }

  const classic = SYSTEM_TEMPLATES.find((t) => t.slug === "classic")!;
  return renderFromTemplate(classic.html, classic.css, data);
}