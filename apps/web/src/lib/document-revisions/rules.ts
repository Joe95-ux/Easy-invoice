import type { CreditNoteStatus, EstimateStatus, InvoiceStatus } from "@easy-invoice/db";
import type { DocumentType, RevisionPermissions } from "@/lib/document-revisions/types";

type RevisionStatus = InvoiceStatus | EstimateStatus | CreditNoteStatus;

export function canRestoreInPlace(
  documentType: DocumentType,
  status: RevisionStatus,
): boolean {
  if (documentType === "CREDIT_NOTE" || documentType === "STATEMENT") return false;
  return status === "DRAFT";
}

export function canDuplicateFromVersion(
  documentType: DocumentType,
  status: RevisionStatus,
  options?: { hasConvertedInvoice?: boolean },
): boolean {
  if (documentType === "CREDIT_NOTE" || documentType === "STATEMENT") return false;
  if (documentType === "INVOICE") {
    return status === "SENT" || status === "VIEWED" || status === "OVERDUE" || status === "PARTIALLY_PAID";
  }

  if (status === "ACCEPTED" && options?.hasConvertedInvoice) return false;
  return (
    status === "SENT" ||
    status === "VIEWED" ||
    status === "DECLINED" ||
    status === "EXPIRED" ||
    status === "ACCEPTED"
  );
}

export function getRevisionPermissions(
  documentType: DocumentType,
  status: RevisionStatus,
  options?: { hasConvertedInvoice?: boolean },
): RevisionPermissions {
  return {
    canRestoreInPlace: canRestoreInPlace(documentType, status),
    canDuplicateFromVersion: canDuplicateFromVersion(documentType, status, options),
  };
}
