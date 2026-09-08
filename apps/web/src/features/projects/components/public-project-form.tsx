"use client";

import { useMemo, useState } from "react";
import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/forms/form-field";
import { PublicFormImageUpload } from "@/features/projects/components/public-form-image-upload";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  groupFormFieldsIntoSections,
  parseImageAnswer,
  serializeImageAnswer,
  type FormFieldDef,
} from "@/lib/schemas/project-form";
import { cn } from "@/lib/utils";

type PublicProjectFormProps = {
  token: string;
  fields: FormFieldDef[];
  alreadySubmitted: boolean;
  formName: string;
  companyName: string;
  projectName: string;
  clientName?: string | null;
};

function isHalfWidth(field: FormFieldDef) {
  return field.type === "text" || field.type === "email" || field.type === "url" || field.type === "select";
}

export function PublicProjectForm({
  token,
  fields,
  alreadySubmitted,
  formName,
  companyName,
  projectName,
  clientName,
}: PublicProjectFormProps) {
  const sections = useMemo(() => groupFormFieldsIntoSections(fields), [fields]);
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields
        .filter((field) => field.type !== "section")
        .map((field) => [field.id, ""]),
    ),
  );
  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(alreadySubmitted);

  function setAnswer(fieldId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    for (const field of fields) {
      if (field.type === "section" || !field.required) continue;
      if (field.type === "images") {
        if (parseImageAnswer(answers[field.id]).length === 0) {
          toast.error(`${field.label} is required`);
          return;
        }
        continue;
      }
      if (!answers[field.id]?.trim()) {
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
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-center shadow-sm">
        <CheckCircle2Icon className="size-8 text-success" />
        <div className="space-y-1">
          <p className="text-base font-medium text-foreground">Response submitted</p>
          <p className="text-sm text-muted-foreground">Thanks — you can close this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-sm text-muted-foreground">{companyName}</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{formName}</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            For project {projectName}
            {clientName ? ` · ${clientName}` : ""}. Share the details needed before work
            begins — scope, files, and anything that affects delivery.
          </p>
        </div>
        <div className="shrink-0 text-left text-xs leading-relaxed text-muted-foreground sm:text-right">
          Open for responses
          <br />
          Secure submission
        </div>
      </header>

      <form onSubmit={handleSubmit} className="border-t border-border">
        <section className="grid gap-6 border-b border-border py-8 md:grid-cols-[13.75rem_minmax(0,1fr)] md:gap-11">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight">Your contact</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Optional — helps us follow up if anything is unclear.
            </p>
          </div>
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
        </section>

        {sections.map((section) => (
          <section
            key={section.id}
            className="grid gap-6 border-b border-border py-8 md:grid-cols-[13.75rem_minmax(0,1fr)] md:gap-11"
          >
            <div className="min-w-0">
              <h2 className="text-sm font-semibold tracking-tight">{section.title}</h2>
              {section.description ? (
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {section.description}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {section.fields.map((field) => {
                const half = isHalfWidth(field);
                return (
                  <div
                    key={field.id}
                    className={cn(!half && "sm:col-span-2")}
                  >
                    {renderField(field)}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <div className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Submit once you’re ready — the project team is notified right away.
          </p>
          <Button type="submit" size="lg" className="h-9 min-w-40 sm:w-auto" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2Icon className="animate-spin" />
                Sending…
              </>
            ) : (
              "Submit"
            )}
          </Button>
        </div>
      </form>
    </div>
  );

  function renderField(field: FormFieldDef) {
    const requiredMark = field.required ? (
      <span className="text-destructive"> *</span>
    ) : null;

    if (field.type === "textarea") {
      return (
        <Field>
          <FieldLabel htmlFor={field.id}>
            {field.label}
            {requiredMark}
          </FieldLabel>
          {field.description ? (
            <FieldDescription>{field.description}</FieldDescription>
          ) : null}
          <FieldContent>
            <Textarea
              id={field.id}
              value={answers[field.id] ?? ""}
              onChange={(event) => setAnswer(field.id, event.target.value)}
              rows={4}
              required={field.required}
              placeholder="Type your answer"
            />
          </FieldContent>
        </Field>
      );
    }

    if (field.type === "select") {
      const items = (field.options ?? []).map((option) => ({
        value: option.value,
        label: option.label,
      }));
      const selectedLabel =
        items.find((item) => item.value === answers[field.id])?.label ?? "Select…";
      return (
        <Field>
          <FieldLabel htmlFor={field.id}>
            {field.label}
            {requiredMark}
          </FieldLabel>
          {field.description ? (
            <FieldDescription>{field.description}</FieldDescription>
          ) : null}
          <FieldContent>
            <Select
              value={answers[field.id] || null}
              onValueChange={(value) => setAnswer(field.id, value ?? "")}
              items={items}
            >
              <SelectTrigger id={field.id} className="text-foreground data-placeholder:text-muted-foreground">
                <SelectValue placeholder="Select…">
                  {answers[field.id] ? selectedLabel : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldContent>
        </Field>
      );
    }

    if (field.type === "radio") {
      const options = field.options ?? [];
      return (
        <Field>
          <FieldLabel>
            {field.label}
            {requiredMark}
          </FieldLabel>
          {field.description ? (
            <FieldDescription>{field.description}</FieldDescription>
          ) : null}
          <FieldContent>
            <RadioGroup
              value={answers[field.id] || undefined}
              onValueChange={(value) => setAnswer(field.id, value ?? "")}
              className="grid gap-2 sm:grid-cols-3"
            >
              {options.map((option) => {
                const selected = answers[field.id] === option.value;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer flex-col justify-center gap-1 rounded-lg border bg-card p-3 transition-colors",
                      selected
                        ? "border-primary ring-1 ring-primary"
                        : "border-border hover:border-foreground/25",
                    )}
                  >
                    <span className="flex items-start gap-2">
                      <RadioGroupItem value={option.value} className="mt-0.5" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">
                          {option.label}
                        </span>
                        {option.description ? (
                          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                            {option.description}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </label>
                );
              })}
            </RadioGroup>
          </FieldContent>
        </Field>
      );
    }

    if (field.type === "images") {
      return (
        <Field>
          <FieldLabel>
            {field.label}
            {requiredMark}
          </FieldLabel>
          {field.description ? (
            <FieldDescription>{field.description}</FieldDescription>
          ) : null}
          <FieldContent>
            <PublicFormImageUpload
              token={token}
              urls={parseImageAnswer(answers[field.id])}
              maxFiles={field.maxFiles ?? 8}
              onChange={(urls) => setAnswer(field.id, serializeImageAnswer(urls))}
            />
          </FieldContent>
        </Field>
      );
    }

    return (
      <FormField
        id={field.id}
        label={field.label}
        description={field.description ?? undefined}
        type={field.type === "email" ? "email" : field.type === "url" ? "url" : "text"}
        value={answers[field.id] ?? ""}
        onChange={(value) => setAnswer(field.id, value)}
        required={field.required}
        placeholder={field.type === "url" ? "https://" : undefined}
      />
    );
  }
}
