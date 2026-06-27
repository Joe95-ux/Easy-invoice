import type { InvoiceHtmlData } from "@/lib/invoice-templates/types";
import { SYSTEM_TEMPLATES } from "@/lib/invoice-templates/definitions";
import { renderFromTemplate } from "@/lib/invoice-templates/render";
import { getEstimateForMember } from "@/lib/estimates";
import { ensureSystemTemplates, getDefaultTemplateId, getTemplateById } from "@/lib/templates";

async function inlineCompanyLogo(data: InvoiceHtmlData): Promise<InvoiceHtmlData> {
  const logoUrl = data.company.logoUrl;
  if (!logoUrl || logoUrl.startsWith("data:")) return data;

  try {
    const response = await fetch(logoUrl);
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

export function estimateToHtmlData(
  estimate: NonNullable<Awaited<ReturnType<typeof getEstimateForMember>>>,
): InvoiceHtmlData {
  return {
    documentKind: "estimate",
    company: estimate.company,
    client: estimate.client,
    invoice: {
      number: estimate.number,
      status: estimate.status,
      issueDate: estimate.issueDate,
      dueDate: estimate.validUntil,
      currency: estimate.currency,
      subtotal: Number(estimate.subtotal),
      taxRate: Number(estimate.taxRate),
      taxAmount: Number(estimate.taxAmount),
      discount: Number(estimate.discount),
      total: Number(estimate.total),
      notes: estimate.notes,
    },
    items: estimate.items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      amount: Number(item.amount),
    })),
  };
}

export async function renderEstimateHtmlForEstimate(
  estimate: NonNullable<Awaited<ReturnType<typeof getEstimateForMember>>>,
): Promise<string> {
  await ensureSystemTemplates();
  const data = await inlineCompanyLogo(estimateToHtmlData(estimate));

  if (estimate.template) {
    return renderFromTemplate(estimate.template.html, estimate.template.css, data);
  }

  if (estimate.templateId) {
    const template = await getTemplateById(estimate.templateId, estimate.companyId);
    if (template) {
      return renderFromTemplate(template.html, template.css, data);
    }
  }

  const defaultId = await getDefaultTemplateId(estimate.companyId);
  if (defaultId) {
    const template = await getTemplateById(defaultId, estimate.companyId);
    if (template) {
      return renderFromTemplate(template.html, template.css, data);
    }
  }

  const classic = SYSTEM_TEMPLATES.find((t) => t.slug === "classic")!;
  return renderFromTemplate(classic.html, classic.css, data);
}
