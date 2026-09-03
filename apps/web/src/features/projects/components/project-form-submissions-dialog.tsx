"use client";

import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/invoices";
import type { FormFieldDef } from "@/lib/schemas/project-form";

type SubmissionRow = {
  id: string;
  answers: Record<string, string>;
  submitterName: string | null;
  submitterEmail: string | null;
  submittedAt: string;
};

type FormDetail = {
  id: string;
  name: string;
  fields: FormFieldDef[];
  submissions: SubmissionRow[];
};

type ProjectFormSubmissionsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  formId: string | null;
  formName?: string;
};

export function ProjectFormSubmissionsDialog({
  open,
  onOpenChange,
  projectId,
  formId,
  formName,
}: ProjectFormSubmissionsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<FormDetail | null>(null);

  useEffect(() => {
    if (!open || !formId) return;

    let cancelled = false;
    setLoading(true);
    setDetail(null);

    void (async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/forms/${formId}`);
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Failed to load responses");
        if (!cancelled) setDetail(body.form);
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Could not load responses");
          onOpenChange(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, formId, projectId, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{formName ?? detail?.name ?? "Form responses"}</DialogTitle>
          <DialogDescription>Answers submitted by the client for this job.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Loading responses…
            </div>
          ) : !detail || detail.submissions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No responses yet.
            </p>
          ) : (
            detail.submissions.map((submission) => (
              <div key={submission.id} className="space-y-3 rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="secondary">
                    {formatDate(submission.submittedAt)}
                  </Badge>
                  {submission.submitterName || submission.submitterEmail ? (
                    <span className="text-muted-foreground">
                      {[submission.submitterName, submission.submitterEmail]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  ) : null}
                </div>
                <dl className="space-y-3">
                  {detail.fields.map((field) => (
                    <div key={field.id}>
                      <dt className="text-xs font-medium text-muted-foreground">{field.label}</dt>
                      <dd className="mt-1 whitespace-pre-wrap text-sm">
                        {submission.answers[field.id]?.trim() || "—"}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
