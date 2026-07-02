import { NextResponse } from "next/server";
import type { DocumentType } from "@easy-invoice/db";
import { requireApiMember } from "@/lib/api/validation";
import {
  getDocumentRevision,
  getDocumentRevisionPermissions,
  listDocumentRevisions,
} from "@/lib/document-revisions/service";
import { getEstimateForMember } from "@/lib/estimates";
import { getInvoiceForMember } from "@/lib/invoices";

type RouteContext = { params: Promise<{ id: string }> };

async function getDocumentStatus(
  documentType: DocumentType,
  companyId: string,
  documentId: string,
) {
  if (documentType === "INVOICE") {
    const invoice = await getInvoiceForMember(documentId, companyId);
    if (!invoice) return null;
    return {
      status: invoice.status,
      hasConvertedInvoice: false,
    };
  }

  const estimate = await getEstimateForMember(documentId, companyId);
  if (!estimate) return null;
  return {
    status: estimate.status,
    hasConvertedInvoice: Boolean(estimate.convertedInvoice),
  };
}

export async function handleListRevisions(
  documentType: DocumentType,
  context: RouteContext,
) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const doc = await getDocumentStatus(documentType, member.companyId, id);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const revisions = await listDocumentRevisions(member.companyId, documentType, id);
  const permissions = getDocumentRevisionPermissions(
    documentType,
    doc.status,
    { hasConvertedInvoice: doc.hasConvertedInvoice },
  );

  return NextResponse.json({ revisions, permissions });
}

export async function handleGetRevision(
  documentType: DocumentType,
  documentId: string,
  revisionId: string,
  companyId: string,
) {
  const revision = await getDocumentRevision(companyId, revisionId);
  if (
    !revision ||
    revision.documentType !== documentType ||
    revision.documentId !== documentId
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    revision: {
      id: revision.id,
      revisionNumber: revision.revisionNumber,
      summary: revision.summary,
      source: revision.source,
      createdAt: revision.createdAt.toISOString(),
      actorEmail: revision.member?.email ?? null,
      snapshot: revision.snapshot,
    },
  });
}
