import type { DocumentRevisionSource, DocumentType, EstimateStatus, InvoiceStatus } from "@easy-invoice/db";

export type { DocumentRevisionSource, DocumentType };

export type DocumentSnapshotLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  sortOrder: number;
  timeEntryIds?: string[];
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
  lineItems: DocumentSnapshotLineItem[];
};

export type RevisionListItem = {
  id: string;
  revisionNumber: number;
  summary: string;
  source: DocumentRevisionSource;
  createdAt: string;
  actorEmail: string | null;
  hasSnapshot: boolean;
};

export type RevisionPermissions = {
  canRestoreInPlace: boolean;
  canDuplicateFromVersion: boolean;
};
