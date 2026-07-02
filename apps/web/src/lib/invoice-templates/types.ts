import type { LogoBg, LogoPlacement } from "@/lib/company-branding";

export type DocumentKind = "invoice" | "estimate";

export type InvoiceHtmlData = {
  documentKind?: DocumentKind;
  company: {
    name: string;
    logoUrl?: string | null;
    logoBg?: LogoBg | null;
    logoPlacement?: LogoPlacement | null;
    brandColor?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    country?: string | null;
  };
  client: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  } | null;
  invoice: {
    number: string;
    status: string;
    issueDate: Date;
    dueDate?: Date | null;
    currency: string;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    discount: number;
    total: number;
    notes?: string | null;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
};
