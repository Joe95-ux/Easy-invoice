import type { EstimateStatus, InvoiceStatus } from "@easy-invoice/db";
import type { DocumentType, RevisionPermissions } from "@/lib/document-revisions/types";

export function canRestoreInPlace(
  documentType: DocumentType,
  status: InvoiceStatus | EstimateStatus,
): boolean {
  return status === "DRAFT";
}

export function canDuplicateFromVersion(
  documentType: DocumentType,
  status: InvoiceStatus | EstimateStatus,
  options?: { hasConvertedInvoice?: boolean },
): boolean {
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
  status: InvoiceStatus | EstimateStatus,
  options?: { hasConvertedInvoice?: boolean },
): RevisionPermissions {
  return {
    canRestoreInPlace: canRestoreInPlace(documentType, status),
    canDuplicateFromVersion: canDuplicateFromVersion(documentType, status, options),
  };
}
