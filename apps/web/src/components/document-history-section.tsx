"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  EyeIcon,
  HistoryIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  RotateCcwIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
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
import { formatDateTime } from "@/lib/invoices";
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

const SOURCE_CONFIG: Record<
  DocumentRevisionSource,
  { label: string; variant: "default" | "secondary" | "destructive" | "success" | "warning" | "info" | "outline" }
> = {
  CREATE: { label: "Created", variant: "default" },
  EDIT: { label: "Edited", variant: "info" },
  RESTORE: { label: "Restored", variant: "warning" },
  STATUS: { label: "Status", variant: "outline" },
  SEND: { label: "Sent", variant: "success" },
  VIEWED: { label: "Viewed", variant: "secondary" },
  REMINDER: { label: "Reminder", variant: "destructive" },
  PAYMENT_CONFIRMATION: { label: "Payment email", variant: "success" },
};

const PAGE_SIZE = 10;

function buildPageRange(current: number, total: number): (number | "ellipsis-start" | "ellipsis-end")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "ellipsis-start" | "ellipsis-end")[] = [1];
  if (current <= 4) {
    pages.push(2, 3, 4, 5, "ellipsis-end", total);
  } else if (current >= total - 3) {
    pages.push("ellipsis-start", total - 4, total - 3, total - 2, total - 1, total);
  } else {
    pages.push("ellipsis-start", current - 1, current, current + 1, "ellipsis-end", total);
  }
  return pages;
}

function buildMobilePageRange(current: number, total: number): (number | "ellipsis-start" | "ellipsis-end")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "ellipsis-start" | "ellipsis-end")[] = [1];
  if (current <= 3) {
    pages.push(2, 3, "ellipsis-end", total);
  } else if (current >= total - 2) {
    pages.push("ellipsis-start", total - 2, total - 1, total);
  } else {
    pages.push("ellipsis-start", current, "ellipsis-end", total);
  }
  return pages;
}

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
    installments: snapshot.installments?.map((row) => ({
      dueDate: row.dueDate,
      amount: row.amount,
      label: row.label,
    })),
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
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
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

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const loadRevisions = useCallback(async (targetPage: number) => {
    setLoading(true);
    try {
      const url = `${apiBase(kind, documentId)}?page=${targetPage}&pageSize=${PAGE_SIZE}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to load history");
      const data = (await response.json()) as {
        revisions: RevisionListItem[];
        totalCount: number;
        page: number;
        pageSize: number;
        permissions: RevisionPermissions;
      };
      setRevisions(data.revisions);
      setTotalCount(data.totalCount);
      setPermissions(data.permissions);
    } catch {
      toast.error("Could not load revision history");
    } finally {
      setLoading(false);
    }
  }, [documentId, kind]);

  useEffect(() => {
    void loadRevisions(page);
  }, [loadRevisions, page]);

  function handlePageChange(newPage: number) {
    if (newPage < 1 || newPage > pageCount) return;
    setPage(newPage);
  }

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
        setPage(1);
        void loadRevisions(1);
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

  const desktopPages = useMemo(() => buildPageRange(page, pageCount), [page, pageCount]);
  const mobilePages = useMemo(() => buildMobilePageRange(page, pageCount), [page, pageCount]);

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HistoryIcon className="size-4 text-muted-foreground" />
            Revision history
          </CardTitle>
          <CardDescription>
            Each version is a full snapshot of the document at that point. Restore returns a
            draft to an earlier version; sent documents can be duplicated from history.
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
            <>
              <ol className="space-y-3">
                {revisions.map((revision) => (
                  <li
                    key={revision.id}
                    className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">v{revision.revisionNumber}</span>
                        <Badge variant={SOURCE_CONFIG[revision.source].variant} className="text-xs">
                          {SOURCE_CONFIG[revision.source].label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(revision.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm">{revision.summary}</p>
                      {revision.actorName && (
                        <p className="text-xs text-muted-foreground">
                          by {revision.actorName}
                          {revision.actorEmail &&
                            revision.actorName.toLowerCase() !== revision.actorEmail.toLowerCase() && (
                              <span className="text-muted-foreground/70">
                                {" "}
                                · {revision.actorEmail}
                              </span>
                            )}
                        </p>
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

              {pageCount > 1 && (
                <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-muted-foreground">
                    Showing {rangeStart}–{rangeEnd} of {totalCount}
                  </p>

                  {/* Desktop pagination */}
                  <ButtonGroup className="hidden sm:flex">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeftIcon className="size-4" />
                    </Button>
                    {desktopPages.map((p, i) =>
                      typeof p === "number" ? (
                        <Button
                          key={p}
                          type="button"
                          variant={p === page ? "default" : "outline"}
                          size="icon-sm"
                          onClick={() => handlePageChange(p)}
                          aria-label={`Page ${p}`}
                          aria-current={p === page ? "page" : undefined}
                          className="tabular-nums"
                        >
                          {p}
                        </Button>
                      ) : (
                        <span
                          key={`${p}-${i}`}
                          className="flex size-7 items-center justify-center text-muted-foreground"
                          aria-hidden
                        >
                          <MoreHorizontalIcon className="size-4" />
                        </span>
                      ),
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= pageCount}
                      aria-label="Next page"
                    >
                      <ChevronRightIcon className="size-4" />
                    </Button>
                  </ButtonGroup>

                  {/* Mobile pagination */}
                  <ButtonGroup className="flex sm:hidden">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeftIcon className="size-4" />
                    </Button>
                    {mobilePages.map((p, i) =>
                      typeof p === "number" ? (
                        <Button
                          key={p}
                          type="button"
                          variant={p === page ? "default" : "outline"}
                          size="icon-sm"
                          onClick={() => handlePageChange(p)}
                          aria-label={`Page ${p}`}
                          aria-current={p === page ? "page" : undefined}
                          className="tabular-nums"
                        >
                          {p}
                        </Button>
                      ) : (
                        <span
                          key={`${p}-${i}`}
                          className="flex size-7 items-center justify-center text-muted-foreground"
                          aria-hidden
                        >
                          <MoreHorizontalIcon className="size-4" />
                        </span>
                      ),
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= pageCount}
                      aria-label="Next page"
                    >
                      <ChevronRightIcon className="size-4" />
                    </Button>
                  </ButtonGroup>
                </div>
              )}
            </>
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
