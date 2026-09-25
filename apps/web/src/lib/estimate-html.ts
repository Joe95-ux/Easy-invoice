import type { InvoiceHtmlData } from "@/lib/invoice-templates/types";
import { SYSTEM_TEMPLATES } from "@/lib/invoice-templates/definitions";
import { renderFromTemplate } from "@/lib/invoice-templates/render";
import { inlineCompanyLogo } from "@/lib/inline-company-logo";
import { companyBrandingFields } from "@/lib/company-branding";
import {
  buildCustomFieldDisplayRows,
  normalizeCustomFieldDefinitions,
} from "@/lib/custom-fields";
import { getEstimateForMember } from "@/lib/estimates";
import { ensureSystemTemplates, getDefaultTemplateId, getTemplateById } from "@/lib/templates";
import { calculateInvoiceTotals } from "@/lib/calculator";
import { normalizeAppliedTaxes } from "@/lib/tax-rates";

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

export function estimateToHtmlData(
  estimate: NonNullable<Awaited<ReturnType<typeof getEstimateForMember>>>,
): InvoiceHtmlData {
  const accepted =
    estimate.status === "ACCEPTED" &&
    (estimate.signerName || estimate.signatureDataUrl || estimate.acceptedAt);

  const definitions = normalizeCustomFieldDefinitions(
    estimate.company.customFieldDefinitions,
  );
  const customFieldRows = buildCustomFieldDisplayRows(
    definitions,
    "estimate",
    estimate.customFields,
    { forPdf: true },
  );

  return {
    documentKind: "estimate",
    company: {
      name: estimate.company.name,
      logoUrl: estimate.company.logoUrl,
      email: estimate.company.email,
      phone: estimate.company.phone,
      address: estimate.company.address,
      city: estimate.company.city,
      state: estimate.company.state,
      zip: estimate.company.zip,
      country: estimate.company.country,
      ...companyBrandingFields(estimate.company),
    },
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
      taxInclusive: estimate.taxInclusive,
      taxes: taxesWithAmounts(
        estimate.taxes,
        Number(estimate.taxRate),
        estimate.taxInclusive,
        estimate.taxCompound === true,
        Number(estimate.discount),
        estimate.items,
      ),
      discount: Number(estimate.discount),
      total: Number(estimate.total),
      notes: estimate.notes,
      scope: estimate.scope,
    },
    customFields: customFieldRows.map((row) => ({
      id: row.id,
      label: row.label,
      value: row.value,
      multiline: row.multiline,
    })),
    items: estimate.items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      amount: Number(item.amount),
      sectionTitle: item.sectionTitle,
      sectionSortOrder: item.sectionSortOrder,
      sortOrder: item.sortOrder,
    })),
    ...(accepted
      ? {
          acceptance: {
            signerName: estimate.signerName,
            signatureDataUrl: estimate.signatureDataUrl,
            acceptedAt: estimate.acceptedAt,
            acceptanceMethod: estimate.acceptanceMethod,
          },
        }
      : {}),
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
