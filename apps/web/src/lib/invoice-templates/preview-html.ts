import { SYSTEM_TEMPLATES } from "@/lib/invoice-templates/definitions";
import { renderFromTemplate } from "@/lib/invoice-templates/render";
import type { DocumentKind, InvoiceHtmlData } from "@/lib/invoice-templates/types";
import type { CompanyPaymentMethod } from "@/lib/company-payment-methods";

/** Sample terms shown in template previews (payment methods live separately). */
export const SAMPLE_TERMS_NOTES = `Payment due within 14 days.
Thank you for your business.`;

export const SAMPLE_PAYMENT_METHODS: CompanyPaymentMethod[] = [
  { label: "PayPal", value: "billing@yourcompany.com" },
  { label: "Zelle", value: "(555) 123-4567" },
  { label: "Cash App", value: "$YourBusiness" },
  {
    label: "Bank transfer",
    value: "Chase Bank\nAccount name: Your Company LLC\nRouting: 021000021\nAccount: ****4821",
  },
];

/** @deprecated Prefer SAMPLE_TERMS_NOTES + SAMPLE_PAYMENT_METHODS */
export const SAMPLE_PAYMENT_NOTES = SAMPLE_TERMS_NOTES;

export type PreviewCompany = {
  name: string;
  logoUrl?: string | null;
  logoBg?: "white" | "dark" | "none" | null;
  logoPlacement?: "watermark" | "header" | null;
  brandColor?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  paymentMethods?: CompanyPaymentMethod[] | null;
};

/** Use sample payment methods when browsing templates so previews match carousel thumbs. */
export function companyForTemplatePreview(company: PreviewCompany): PreviewCompany {
  return {
    ...company,
    paymentMethods: company.paymentMethods?.length
      ? company.paymentMethods
      : SAMPLE_PAYMENT_METHODS,
  };
}

export type PreviewLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export type PreviewInstallment = {
  dueDate: string;
  amount: number;
  label?: string | null;
  paidAmount?: number;
  balanceDue?: number;
  isPaid?: boolean;
};

export type BuildDocumentHtmlOptions = {
  kind: DocumentKind;
  templateSlug?: string;
  company: PreviewCompany;
  number: string;
  client: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  issueDate: string;
  expiryDate?: string;
  currency: string;
  notes?: string;
  items: PreviewLineItem[];
  totals: { subtotal: number; taxAmount: number; total: number };
  taxRate: number;
  discount: number;
  installments?: PreviewInstallment[];
  amountPaid?: number;
  balanceDue?: number;
};

export function pickTemplate(slug?: string) {
  return (
    SYSTEM_TEMPLATES.find((template) => template.slug === slug) ??
    SYSTEM_TEMPLATES.find((template) => template.isDefault) ??
    SYSTEM_TEMPLATES[0]
  );
}

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function absoluteLogoUrl(logoUrl?: string | null): string | null {
  if (!logoUrl) return null;
  if (/^(https?:|data:)/i.test(logoUrl)) return logoUrl;
  if (typeof window !== "undefined" && logoUrl.startsWith("/")) {
    return `${window.location.origin}${logoUrl}`;
  }
  return logoUrl;
}

export function buildDocumentHtml(options: BuildDocumentHtmlOptions): string {
  const template = pickTemplate(options.templateSlug);
  if (!template) return "";

  const items = options.items
    .filter(
      (item) =>
        item.description.trim() !== "" ||
        item.quantity !== 0 ||
        item.unitPrice !== 0,
    )
    .map((item) => ({
      description: item.description.trim() || "Item or service",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.quantity * item.unitPrice,
    }));

  const installments = (options.installments ?? []).map((row) => {
    const amount = row.amount;
    const paidAmount = row.paidAmount ?? 0;
    const balanceDue = row.balanceDue ?? Math.max(0, amount - paidAmount);
    return {
      dueDate: parseDate(row.dueDate) ?? new Date(),
      amount,
      label: row.label ?? null,
      paidAmount,
      balanceDue,
      isPaid: row.isPaid ?? balanceDue <= 0.001,
    };
  });

  const data: InvoiceHtmlData = {
    documentKind: options.kind,
    company: {
      ...options.company,
      logoUrl: absoluteLogoUrl(options.company.logoUrl),
      paymentMethods: options.company.paymentMethods ?? null,
    },
    client: {
      name: options.client.name.trim() ? options.client.name : "Client name",
      email: options.client.email ?? null,
      phone: options.client.phone ?? null,
      address: options.client.address ?? null,
    },
    invoice: {
      number: options.number,
      status: "DRAFT",
      issueDate: parseDate(options.issueDate) ?? new Date(),
      dueDate: parseDate(options.expiryDate),
      currency: options.currency,
      subtotal: options.totals.subtotal,
      taxRate: options.taxRate / 100,
      taxAmount: options.totals.taxAmount,
      discount: options.discount,
      total: options.totals.total,
      notes: options.notes?.trim() ? options.notes : null,
      amountPaid: options.amountPaid,
      balanceDue: options.balanceDue,
    },
    items,
    ...(installments.length > 0 ? { installments } : {}),
  };

  return renderFromTemplate(template.html, template.css, data);
}

/**
 * Representative sample data so template thumbnails always look populated and
 * consistent, regardless of what the user has typed so far.
 */
export function buildSampleDocumentHtml(
  kind: DocumentKind,
  templateSlug: string,
  company: PreviewCompany,
  currency: string,
): string {
  const items: PreviewLineItem[] = [
    { description: "Design & discovery", quantity: 1, unitPrice: 1200 },
    { description: "Development", quantity: 12, unitPrice: 90 },
    { description: "Project management", quantity: 4, unitPrice: 75 },
  ];
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = subtotal * 0.075;

  return buildDocumentHtml({
    kind,
    templateSlug,
    company: {
      ...company,
      paymentMethods: company.paymentMethods?.length
        ? company.paymentMethods
        : SAMPLE_PAYMENT_METHODS,
    },
    number: "0001",
    client: {
      name: "Acme Studios",
      email: "billing@acme.co",
      address: "120 Market St, San Francisco, CA",
    },
    issueDate: new Date().toISOString().slice(0, 10),
    expiryDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    currency,
    notes: SAMPLE_TERMS_NOTES,
    items,
    totals: { subtotal, taxAmount, total: subtotal + taxAmount },
    taxRate: 7.5,
    discount: 0,
  });
}
