"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, MailIcon, UserIcon } from "lucide-react";
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
import { cn } from "@/lib/utils";

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
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !formId) return;

    let cancelled = false;
    setLoading(true);
    setDetail(null);
    setSelectedId(null);

    void (async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/forms/${formId}`);
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Failed to load responses");
        if (cancelled) return;
        const form = body.form as FormDetail;
        setDetail(form);
        setSelectedId(form.submissions[0]?.id ?? null);
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

  const selected =
    detail?.submissions.find((submission) => submission.id === selectedId) ??
    detail?.submissions[0] ??
    null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{formName ?? detail?.name ?? "Form responses"}</DialogTitle>
          <DialogDescription>
            Review the answers submitted for this intake form.
          </DialogDescription>
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
            <>
              {detail.submissions.length > 1 ? (
                <div className="flex flex-wrap gap-2">
                  {detail.submissions.map((submission, index) => (
                    <button
                      key={submission.id}
                      type="button"
                      onClick={() => setSelectedId(submission.id)}
                      className={cn(
                        "cursor-pointer rounded-lg border px-3 py-1.5 text-left text-sm transition-colors",
                        selected?.id === submission.id
                          ? "border-foreground/20 bg-muted text-foreground"
                          : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )}
                    >
                      Response {detail.submissions.length - index}
                      <span className="ml-2 text-xs opacity-80">
                        {formatDate(submission.submittedAt)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              {selected ? (
                <div className="overflow-hidden rounded-xl border">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b bg-muted/40 px-4 py-3">
                    <Badge variant="secondary">{formatDate(selected.submittedAt)}</Badge>
                    {selected.submitterName ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                        <UserIcon className="size-3.5 text-muted-foreground" />
                        {selected.submitterName}
                      </span>
                    ) : null}
                    {selected.submitterEmail ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MailIcon className="size-3.5" />
                        {selected.submitterEmail}
                      </span>
                    ) : null}
                    {!selected.submitterName && !selected.submitterEmail ? (
                      <span className="text-sm text-muted-foreground">Anonymous submitter</span>
                    ) : null}
                  </div>

                  <div className="divide-y">
                    {detail.fields.map((field) => {
                      const answer = selected.answers[field.id]?.trim();
                      return (
                        <div key={field.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
                          <div className="text-sm font-medium text-muted-foreground">
                            {field.label}
                          </div>
                          <div className="whitespace-pre-wrap text-sm text-foreground">
                            {answer || (
                              <span className="text-muted-foreground">No answer</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
