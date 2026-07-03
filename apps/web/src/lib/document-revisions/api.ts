import { type NextRequest, NextResponse } from "next/server";
import type { DocumentType } from "@easy-invoice/db";
import { requireApiMember } from "@/lib/api/validation";
import {
  getDocumentRevision,
  getDocumentRevisionPermissions,
  listDocumentRevisions,
} from "@/lib/document-revisions/service";
import { formatRevisionActor } from "@/lib/member-email";
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
  request?: NextRequest,
) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const doc = await getDocumentStatus(documentType, member.companyId, id);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = request?.nextUrl;
  const page = Math.max(1, Number(url?.searchParams.get("page") ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(url?.searchParams.get("pageSize") ?? 10)));

  const { revisions, totalCount } = await listDocumentRevisions(
    member.companyId,
    documentType,
    id,
    { page, pageSize },
  );
  const permissions = getDocumentRevisionPermissions(
    documentType,
    doc.status,
    { hasConvertedInvoice: doc.hasConvertedInvoice },
  );

  return NextResponse.json({ revisions, totalCount, page, pageSize, permissions });
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
      actorName:
        (revision.metadata as { actorName?: string } | null)?.actorName ??
        formatRevisionActor(revision.member?.name ?? null, revision.member?.email ?? null),
      actorEmail:
        (revision.metadata as { actorEmail?: string } | null)?.actorEmail ??
        revision.member?.email ??
        null,
      snapshot: revision.snapshot,
    },
  });
}
