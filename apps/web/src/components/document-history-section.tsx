"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CopyIcon,
  EyeIcon,
  HistoryIcon,
  Loader2Icon,
  RotateCcwIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DocumentPreviewDrawer,
  type PreviewCompany,
} from "@/components/document-preview-drawer";
import type { DocumentRevisionSource } from "@/lib/document-revisions/types";
import type { DocumentSnapshot, RevisionListItem, RevisionPermissions } from "@/lib/document-revisions/types";
import { formatDate } from "@/lib/invoices";
import type { DocumentKind } from "@/lib/invoice-templates/types";

type TemplateOption = { id: string; slug: string; name: string };

type DocumentHistorySectionProps = {
  kind: DocumentKind;
  documentId: string;
  company: PreviewCompany;
  client: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  templates: TemplateOption[];
};

const SOURCE_LABELS: Record<DocumentRevisionSource, string> = {
  CREATE: "Created",
  EDIT: "Edited",
  RESTORE: "Restored",
  STATUS: "Status",
  SEND: "Sent",
};

function apiBase(kind: DocumentKind, documentId: string) {
  return kind === "estimate"
    ? `/api/estimates/${documentId}/revisions`
    : `/api/invoices/${documentId}/revisions`;
}

function snapshotToPreview(
  snapshot: DocumentSnapshot,
  kind: DocumentKind,
  company: PreviewCompany,
  client: DocumentHistorySectionProps["client"],
  templates: TemplateOption[],
) {
  const template = templates.find((row) => row.id === snapshot.templateId);
  return {
    kind,
    templateSlug: template?.slug,
    company,
    number: snapshot.number,
    client,
    issueDate: snapshot.issueDate,
    expiryDate: kind === "estimate" ? snapshot.validUntil ?? undefined : snapshot.dueDate ?? undefined,
    currency: snapshot.currency,
    notes: snapshot.notes ?? undefined,
    items: snapshot.lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    totals: {
      subtotal: snapshot.subtotal,
      taxAmount: snapshot.taxAmount,
      total: snapshot.total,
    },
    taxRate: snapshot.taxRate * 100,
    discount: snapshot.discount,
  };
}

export function DocumentHistorySection({
  kind,
  documentId,
  company,
  client,
  templates,
}: DocumentHistorySectionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [revisions, setRevisions] = useState<RevisionListItem[]>([]);
  const [permissions, setPermissions] = useState<RevisionPermissions>({
    canRestoreInPlace: false,
    canDuplicateFromVersion: false,
  });

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewRevision, setPreviewRevision] = useState<{
    revisionNumber: number;
    snapshot: DocumentSnapshot;
  } | null>(null);

  const [confirmAction, setConfirmAction] = useState<{
    type: "restore" | "duplicate";
    revision: RevisionListItem;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadRevisions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(apiBase(kind, documentId));
      if (!response.ok) throw new Error("Failed to load history");
      const data = (await response.json()) as {
        revisions: RevisionListItem[];
        permissions: RevisionPermissions;
      };
      setRevisions(data.revisions);
      setPermissions(data.permissions);
    } catch {
      toast.error("Could not load revision history");
    } finally {
      setLoading(false);
    }
  }, [documentId, kind]);

  useEffect(() => {
    void loadRevisions();
  }, [loadRevisions]);

  async function handleView(revision: RevisionListItem) {
    if (!revision.hasSnapshot) return;
    setPreviewLoading(true);
    setPreviewOpen(true);
    try {
      const response = await fetch(`${apiBase(kind, documentId)}/${revision.id}`);
      if (!response.ok) throw new Error("Failed to load version");
      const data = (await response.json()) as {
        revision: { revisionNumber: number; snapshot: DocumentSnapshot };
      };
      setPreviewRevision({
        revisionNumber: data.revision.revisionNumber,
        snapshot: data.revision.snapshot,
      });
    } catch {
      setPreviewOpen(false);
      toast.error("Could not load this version");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleConfirmAction() {
    if (!confirmAction) return;
    setActionLoading(true);
    const { type, revision } = confirmAction;
    const endpoint =
      type === "restore"
        ? `${apiBase(kind, documentId)}/${revision.id}/restore`
        : `${apiBase(kind, documentId)}/${revision.id}/duplicate`;

    try {
      const response = await fetch(endpoint, { method: "POST" });
      const data = (await response.json()) as {
        error?: string;
        invoice?: { id: string };
        estimate?: { id: string };
      };
      if (!response.ok) throw new Error(data.error ?? "Action failed");

      if (type === "restore") {
        toast.success(`Restored version ${revision.revisionNumber}`);
        setConfirmAction(null);
        router.refresh();
        void loadRevisions();
      } else {
        const newId = data.invoice?.id ?? data.estimate?.id;
        if (!newId) throw new Error("Duplicate created but no id returned");
        toast.success(`Created draft from version ${revision.revisionNumber}`);
        setConfirmAction(null);
        router.push(kind === "estimate" ? `/estimates/${newId}` : `/invoices/${newId}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  const previewOptions =
    previewRevision &&
    snapshotToPreview(previewRevision.snapshot, kind, company, client, templates);

  const label = kind === "estimate" ? "estimate" : "invoice";

  return (
    <>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HistoryIcon className="size-4 text-muted-foreground" />
            Revision history
          </CardTitle>
          <CardDescription>
            Snapshots are saved when you create or edit this {label}. Sent documents can be
            duplicated from a past version.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2Icon className="size-5 animate-spin" />
            </div>
          ) : revisions.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No revision history yet.</p>
          ) : (
            <ol className="space-y-3">
              {revisions.map((revision) => (
                <li
                  key={revision.id}
                  className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">v{revision.revisionNumber}</span>
                      <Badge variant="secondary" className="text-xs">
                        {SOURCE_LABELS[revision.source]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(new Date(revision.createdAt))}
                      </span>
                    </div>
                    <p className="text-sm">{revision.summary}</p>
                    {revision.actorEmail && (
                      <p className="text-xs text-muted-foreground">by {revision.actorEmail}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {revision.hasSnapshot && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void handleView(revision)}
                      >
                        <EyeIcon className="size-4" />
                        View
                      </Button>
                    )}
                    {revision.hasSnapshot && permissions.canRestoreInPlace && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setConfirmAction({ type: "restore", revision })
                        }
                      >
                        <RotateCcwIcon className="size-4" />
                        Restore
                      </Button>
                    )}
                    {revision.hasSnapshot && permissions.canDuplicateFromVersion && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setConfirmAction({ type: "duplicate", revision })
                        }
                      >
                        <CopyIcon className="size-4" />
                        Duplicate
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {previewOptions && (
        <DocumentPreviewDrawer
          open={previewOpen}
          onOpenChange={(open) => {
            setPreviewOpen(open);
            if (!open) setPreviewRevision(null);
          }}
          {...previewOptions}
        />
      )}

      {previewOpen && previewLoading && !previewRevision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      <Dialog open={Boolean(confirmAction)} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === "restore" ? "Restore this version?" : "Duplicate as new draft?"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === "restore" ? (
                <>
                  This will replace the current draft with version {confirmAction.revision.revisionNumber}.
                  A new restore entry will be added to history.
                </>
              ) : (
                <>
                  A new draft {label} will be created from version{" "}
                  {confirmAction?.revision.revisionNumber}. The original {label} stays unchanged.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-muted-foreground">{confirmAction?.revision.summary}</p>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmAction(null)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirmAction()}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2Icon className="size-4 animate-spin" />}
              {confirmAction?.type === "restore" ? "Restore" : "Create draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
