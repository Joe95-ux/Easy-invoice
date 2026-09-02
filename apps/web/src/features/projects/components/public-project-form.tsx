"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      <div className="rounded-xl border bg-background p-6 text-sm text-muted-foreground">
        This form has been submitted. You can close this page.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border bg-background p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="submitter-name">Your name</Label>
          <Input
            id="submitter-name"
            value={submitterName}
            onChange={(event) => setSubmitterName(event.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="submitter-email">Your email</Label>
          <Input
            id="submitter-email"
            type="email"
            value={submitterEmail}
            onChange={(event) => setSubmitterEmail(event.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>

      {fields.map((field) => (
        <div key={field.id} className="space-y-2">
          <Label htmlFor={field.id}>
            {field.label}
            {field.required ? <span className="text-destructive"> *</span> : null}
          </Label>
          {field.type === "textarea" ? (
            <Textarea
              id={field.id}
              value={answers[field.id] ?? ""}
              onChange={(event) =>
                setAnswers((prev) => ({ ...prev, [field.id]: event.target.value }))
              }
              rows={4}
              required={field.required}
            />
          ) : (
            <Input
              id={field.id}
              type={field.type === "email" ? "email" : field.type === "url" ? "url" : "text"}
              value={answers[field.id] ?? ""}
              onChange={(event) =>
                setAnswers((prev) => ({ ...prev, [field.id]: event.target.value }))
              }
              required={field.required}
            />
          )}
        </div>
      ))}

      <Button type="submit" className="w-full" disabled={submitting}>
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
