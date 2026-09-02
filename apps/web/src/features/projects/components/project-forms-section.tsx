"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ClipboardListIcon, CopyIcon, LinkIcon, Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { serializeProjectForm } from "@/lib/project-forms";

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
  const [creating, setCreating] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);

  async function handleCreate() {
    setCreating(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Requirements" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to create form");
      setForms((prev) => [body.form, ...prev]);
      toast.success("Requirements form added");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create form");
    } finally {
      setCreating(false);
    }
  }

  async function handleShare(formId: string) {
    setSharingId(formId);
    try {
      const response = await fetch(`/api/projects/${projectId}/forms/${formId}/share`, {
        method: "POST",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to create link");

      setForms((prev) => prev.map((form) => (form.id === formId ? body.form : form)));
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

  return (
    <Card className="overflow-hidden py-0">
      <CardHeader className="flex flex-row items-start justify-between gap-3 border-b py-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardListIcon className="size-4" />
            Forms
          </CardTitle>
          <CardDescription>
            Collect requirements from the client for this job. Not a standalone form product —
            forms stay on the project.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => void handleCreate()} disabled={creating}>
          {creating ? <Loader2Icon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
          Add requirements form
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {forms.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No intake forms yet. Add one, then share the link with your client.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Responses</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.map((form) => (
                <TableRow key={form.id}>
                  <TableCell className="font-medium">{form.name}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(form.status)}>{statusLabel(form.status)}</Badge>
                  </TableCell>
                  <TableCell>{form.submissionCount}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {form.publicToken ? (
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
                          Get share link
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
