import type { InvoiceHtmlData } from "@/lib/invoice-templates/types";
import { SYSTEM_TEMPLATES } from "@/lib/invoice-templates/definitions";
import { renderFromTemplate } from "@/lib/invoice-templates/render";
import { getInvoiceForMember } from "@/lib/invoices";
import { ensureSystemTemplates, getDefaultTemplateId, getTemplateById } from "@/lib/templates";

export type { InvoiceHtmlData };

async function inlineCompanyLogo(data: InvoiceHtmlData): Promise<InvoiceHtmlData> {
  const logoUrl = data.company.logoUrl;
  if (!logoUrl || logoUrl.startsWith("data:")) return data;

  try {
    const response = await fetch(logoUrl, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return data;

    const contentType = response.headers.get("content-type") ?? "image/png";
    const base64 = Buffer.from(await response.arrayBuffer()).toString("base64");
    return {
      ...data,
      company: {
        ...data.company,
        logoUrl: `data:${contentType};base64,${base64}`,
      },
    };
  } catch {
    return data;
  }
}

export function invoiceToHtmlData(
  invoice: NonNullable<Awaited<ReturnType<typeof getInvoiceForMember>>>,
): InvoiceHtmlData {
  return {
    documentKind: "invoice",
    company: invoice.company,
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
    },
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      amount: Number(item.amount),
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