import type { InvoiceStatus } from "@easy-invoice/db";

export const INVOICE_LIST_PAGE_SIZES = [15, 25, 50] as const;
export type InvoiceListPageSize = (typeof INVOICE_LIST_PAGE_SIZES)[number];

export type InvoiceListSortKey =
  | "dueDate"
  | "createdAt"
  | "number"
  | "total"
  | "status"
  | "clientName";

export type InvoiceListRow = {
  id: string;
  number: string;
  status: InvoiceStatus;
  total: string;
  balanceDue: string;
  currency: string;
  dueDate: string | null;
  clientId: string | null;
  clientName: string | null;
  clientEmail: string | null;
  sentAt: string | null;
};

export type ListInvoicesResult = {
  rows: InvoiceListRow[];
  totalCount: number;
  page: number;
  pageSize: InvoiceListPageSize;
  pageCount: number;
};
