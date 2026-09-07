"use client";

import { useState } from "react";
import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { FormFieldDef } from "@/lib/schemas/project-form";

type PublicProjectFormProps = {
  token: string;
  fields: FormFieldDef[];
  alreadySubmitted: boolean;
};

export function PublicProjectForm({ token, fields, alreadySubmitted }: PublicProjectFormProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.id, ""])),
  );
  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(alreadySubmitted);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    for (const field of fields) {
      if (field.required && !answers[field.id]?.trim()) {
        toast.error(`${field.label} is required`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/public/forms/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          submitterName: submitterName.trim() || null,
          submitterEmail: submitterEmail.trim() || null,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not submit");
      setDone(true);
      toast.success("Thanks — your answers were sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit form");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-10 text-center shadow-sm">
        <CheckCircle2Icon className="size-8 text-success" />
        <div className="space-y-1">
          <p className="text-base font-medium text-foreground">Response submitted</p>
          <p className="text-sm text-muted-foreground">
            Thanks — you can close this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="submitter-name"
          label="Your name"
          value={submitterName}
          onChange={setSubmitterName}
          placeholder="Optional"
          autoComplete="name"
        />
        <FormField
          id="submitter-email"
          label="Your email"
          type="email"
          value={submitterEmail}
          onChange={setSubmitterEmail}
          placeholder="Optional"
          autoComplete="email"
        />
      </div>

      <div className="space-y-4 border-t pt-5">
        {fields.map((field) =>
          field.type === "textarea" ? (
            <Field key={field.id}>
              <FieldLabel htmlFor={field.id}>
                {field.label}
                {field.required ? <span className="text-destructive"> *</span> : null}
              </FieldLabel>
              <FieldContent>
                <Textarea
                  id={field.id}
                  value={answers[field.id] ?? ""}
                  onChange={(event) =>
                    setAnswers((prev) => ({ ...prev, [field.id]: event.target.value }))
                  }
                  rows={4}
                  required={field.required}
                />
              </FieldContent>
            </Field>
          ) : (
            <FormField
              key={field.id}
              id={field.id}
              label={field.label}
              type={field.type === "email" ? "email" : field.type === "url" ? "url" : "text"}
              value={answers[field.id] ?? ""}
              onChange={(value) =>
                setAnswers((prev) => ({ ...prev, [field.id]: value }))
              }
              required={field.required}
            />
          ),
        )}
      </div>

      <Button type="submit" size="lg" className="h-9 w-full" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2Icon className="animate-spin" />
            Sending…
          </>
        ) : (
          "Submit"
        )}
      </Button>
    </form>
  );
}
