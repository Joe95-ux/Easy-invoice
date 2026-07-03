import type { DocumentRevisionSource, DocumentType, EstimateStatus, InvoiceStatus } from "@easy-invoice/db";

export type { DocumentRevisionSource, DocumentType };

/** Sources that go through snapshot diff summary (not VIEWED / REMINDER / SEND / CREATE). */
export type ContentRevisionSource = Extract<
  DocumentRevisionSource,
  "EDIT" | "RESTORE" | "STATUS"
>;

export type DocumentSnapshotLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  sortOrder: number;
  timeEntryIds?: string[];
};

export type DocumentSnapshotInstallment = {
  dueDate: string;
  amount: number;
  label?: string | null;
  sortOrder: number;
};

export type DocumentSnapshot = {
  status: InvoiceStatus | EstimateStatus;
  clientId: string | null;
  number: string;
  issueDate: string;
  dueDate?: string | null;
  validUntil?: string | null;
  currency: string;
  taxRate: number;
  discount: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  templateId: string | null;
  remindersPaused?: boolean;
  installments?: DocumentSnapshotInstallment[];
  lineItems: DocumentSnapshotLineItem[];
};

export type RevisionListItem = {
  id: string;
  revisionNumber: number;
  summary: string;
  source: DocumentRevisionSource;
  createdAt: string;
  actorName: string | null;
  actorEmail: string | null;
  hasSnapshot: boolean;
};

export type RevisionPermissions = {
  canRestoreInPlace: boolean;
  canDuplicateFromVersion: boolean;
};
