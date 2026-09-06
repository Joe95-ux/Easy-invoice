"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2Icon, MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import {
  FormTemplateEditorDialog,
  type FormTemplateListItem,
} from "@/features/settings/components/form-template-editor-dialog";

export function FormTemplatesPageContent() {
  const [templates, setTemplates] = useState<FormTemplateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<FormTemplateListItem | null>(null);
  const [deleting, setDeleting] = useState<FormTemplateListItem | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/form-templates");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to load templates");
      setTemplates(body.templates ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(template: FormTemplateListItem) {
    setEditing(template);
    setEditorOpen(true);
  }

  function handleSaved(template: FormTemplateListItem) {
    setTemplates((current) => {
      const index = current.findIndex((item) => item.id === template.id);
      if (index === -1) {
        return [...current, template].sort((a, b) => a.name.localeCompare(b.name));
      }
      const next = [...current];
      next[index] = template;
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeletePending(true);
    try {
      const response = await fetch(`/api/form-templates/${deleting.id}`, {
        method: "DELETE",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Failed to delete");
      setTemplates((current) => current.filter((item) => item.id !== deleting.id));
      toast.success("Template deleted");
      setDeleting(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete template");
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Form templates"
        description="Reusable intake forms for projects. Starter templates appear automatically for new companies."
        actions={
          <Button className={pageHeaderActionClass} onClick={openCreate}>
            <PlusIcon className="size-4" />
            New template
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Loading templates…
        </div>
      ) : templates.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
          No form templates yet. Create one to reuse on projects.
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Description</TableHead>
                <TableHead className="w-24 text-right">Fields</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell className="hidden max-w-md truncate text-muted-foreground sm:table-cell">
                    {template.description || "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {template.fields.length}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label={`Actions for ${template.name}`}
                      >
                        <MoreHorizontalIcon className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(template)}>
                          <PencilIcon className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleting(template)}
                        >
                          <Trash2Icon className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <FormTemplateEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editing}
        onSaved={handleSaved}
      />

      <ConfirmActionDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete form template?"
        description={
          deleting
            ? `“${deleting.name}” will be removed. Project forms that used it keep their questions.`
            : ""
        }
        confirmLabel="Delete"
        confirming={deletePending}
        onConfirm={() => void handleDelete()}
        destructive
      />
    </>
  );
}
