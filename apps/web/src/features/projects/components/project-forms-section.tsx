"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardListIcon,
  CopyIcon,
  EyeIcon,
  LinkIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProjectAddFormDialog } from "@/features/projects/components/project-add-form-dialog";
import { ProjectFormEditorDialog } from "@/features/projects/components/project-form-editor-dialog";
import { ProjectFormSubmissionsDialog } from "@/features/projects/components/project-form-submissions-dialog";
import { SectionInfoPopover } from "@/features/projects/components/section-info-popover";
import type { serializeProjectForm } from "@/lib/project-forms";

const FORMS_DESCRIPTION =
  "Collect requirements from the client for this job. Edit questions, share a link, then review answers here.";

type ProjectFormRow = ReturnType<typeof serializeProjectForm>;

type ProjectFormsSectionProps = {
  projectId: string;
  forms: ProjectFormRow[];
};

function statusLabel(status: string) {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "SENT":
      return "Awaiting client";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

function statusVariant(status: string): "secondary" | "info" | "success" | "destructive" {
  switch (status) {
    case "SENT":
      return "info";
    case "COMPLETED":
      return "success";
    case "CANCELLED":
      return "destructive";
    default:
      return "secondary";
  }
}

export function ProjectFormsSection({ projectId, forms: initialForms }: ProjectFormsSectionProps) {
  const router = useRouter();
  const [forms, setForms] = useState(initialForms);
  const [addOpen, setAddOpen] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [viewingForm, setViewingForm] = useState<ProjectFormRow | null>(null);
  const [editingForm, setEditingForm] = useState<ProjectFormRow | null>(null);
  const [pendingCancel, setPendingCancel] = useState<ProjectFormRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProjectFormRow | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForms(initialForms);
  }, [initialForms]);

  function upsertForm(form: ProjectFormRow) {
    setForms((prev) => {
      const exists = prev.some((row) => row.id === form.id);
      if (!exists) return [form, ...prev];
      return prev.map((row) => (row.id === form.id ? form : row));
    });
  }

  async function handleShare(formId: string) {
    setSharingId(formId);
    try {
      const response = await fetch(`/api/projects/${projectId}/forms/${formId}/share`, {
        method: "POST",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to create link");

      upsertForm(body.form);
      const url = `${window.location.origin}/f/${body.form.publicToken}`;
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied", { description: url });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create share link");
    } finally {
      setSharingId(null);
    }
  }

  async function handleCopy(token: string) {
    const url = `${window.location.origin}/f/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  async function handleCancel() {
    if (!pendingCancel) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/forms/${pendingCancel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to cancel");
      upsertForm(body.form);
      setPendingCancel(null);
      toast.success("Form cancelled");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel form");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/forms/${pendingDelete.id}`, {
        method: "DELETE",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Failed to delete");
      setForms((prev) => prev.filter((form) => form.id !== pendingDelete.id));
      setPendingDelete(null);
      toast.success("Form deleted");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete form");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card className="overflow-hidden py-0">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b py-4">
          <div className="min-w-0 space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardListIcon className="size-4 shrink-0" />
              Forms
              <span className="lg:hidden">
                <SectionInfoPopover label="About forms">{FORMS_DESCRIPTION}</SectionInfoPopover>
              </span>
            </CardTitle>
            <CardDescription className="hidden lg:block">{FORMS_DESCRIPTION}</CardDescription>
          </div>
          <Button size="sm" className="shrink-0" onClick={() => setAddOpen(true)}>
            <PlusIcon className="size-4" />
            Add form
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {forms.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No intake forms yet. Add one from a template, edit the questions, then share the link.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fields</TableHead>
                  <TableHead>Responses</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell>
                      <div className="font-medium">{form.name}</div>
                      {form.templateName ? (
                        <div className="text-xs text-muted-foreground">{form.templateName}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(form.status)}>{statusLabel(form.status)}</Badge>
                    </TableCell>
                    <TableCell>{form.fieldCount}</TableCell>
                    <TableCell>{form.submissionCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {form.submissionCount > 0 ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setViewingForm(form)}
                          >
                            <EyeIcon className="size-4" />
                            Responses
                          </Button>
                        ) : null}
                        {form.status === "DRAFT" || form.status === "SENT" ? (
                          form.publicToken && form.status !== "DRAFT" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => void handleCopy(form.publicToken!)}
                            >
                              <CopyIcon className="size-4" />
                              Copy link
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={sharingId === form.id}
                              onClick={() => void handleShare(form.id)}
                            >
                              {sharingId === form.id ? (
                                <Loader2Icon className="size-4 animate-spin" />
                              ) : (
                                <LinkIcon className="size-4" />
                              )}
                              Share
                            </Button>
                          )
                        ) : null}
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label="Form actions"
                          >
                            <MoreHorizontalIcon className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingForm(form)}>
                              <PencilIcon className="size-4" />
                              Edit
                            </DropdownMenuItem>
                            {form.submissionCount > 0 ? (
                              <DropdownMenuItem onClick={() => setViewingForm(form)}>
                                <EyeIcon className="size-4" />
                                View responses
                              </DropdownMenuItem>
                            ) : null}
                            {form.publicToken ? (
                              <DropdownMenuItem onClick={() => void handleCopy(form.publicToken!)}>
                                <CopyIcon className="size-4" />
                                Copy link
                              </DropdownMenuItem>
                            ) : form.status !== "CANCELLED" && form.status !== "COMPLETED" ? (
                              <DropdownMenuItem onClick={() => void handleShare(form.id)}>
                                <LinkIcon className="size-4" />
                                Get share link
                              </DropdownMenuItem>
                            ) : null}
                            {form.status !== "CANCELLED" && form.status !== "COMPLETED" ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setPendingCancel(form)}>
                                  Cancel form
                                </DropdownMenuItem>
                              </>
                            ) : null}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setPendingDelete(form)}
                            >
                              <Trash2Icon className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ProjectAddFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        projectId={projectId}
        onCreated={(form) => {
          upsertForm(form as ProjectFormRow);
          setEditingForm(form as ProjectFormRow);
          router.refresh();
        }}
      />

      <ProjectFormEditorDialog
        open={Boolean(editingForm)}
        onOpenChange={(open) => {
          if (!open) setEditingForm(null);
        }}
        projectId={projectId}
        formId={editingForm?.id ?? null}
        onSaved={(form) => {
          upsertForm(form as ProjectFormRow);
          router.refresh();
        }}
      />

      <ProjectFormSubmissionsDialog
        open={Boolean(viewingForm)}
        onOpenChange={(open) => {
          if (!open) setViewingForm(null);
        }}
        projectId={projectId}
        formId={viewingForm?.id ?? null}
        formName={viewingForm?.name}
      />

      <ConfirmActionDialog
        open={Boolean(pendingCancel)}
        onOpenChange={(open) => {
          if (!open && !busy) setPendingCancel(null);
        }}
        title="Cancel form?"
        description={
          <>
            Clients will no longer be able to open the share link for{" "}
            <span className="font-medium text-foreground">
              {pendingCancel?.name ?? "this form"}
            </span>
            .
          </>
        }
        confirmLabel="Cancel form"
        confirmingLabel="Cancelling..."
        confirming={busy}
        onConfirm={handleCancel}
      />

      <ConfirmActionDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open && !busy) setPendingDelete(null);
        }}
        title="Delete form?"
        description={
          <>
            Permanently delete{" "}
            <span className="font-medium text-foreground">
              {pendingDelete?.name ?? "this form"}
            </span>{" "}
            and any responses. This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        confirmingLabel="Deleting..."
        confirming={busy}
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}
