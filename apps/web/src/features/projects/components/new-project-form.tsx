"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FormCard } from "@/components/forms/form-card";
import { FormField } from "@/components/forms/form-field";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { PageScroll } from "@/components/app-shell/app-shell";
import { PageBackLink, PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClientListItem } from "@/lib/clients";
import type { ProjectStatus } from "@/lib/db";
import { createProjectSchema } from "@/lib/schemas/project";
import { projectStatusLabel } from "@/lib/projects";
import { zodFieldErrors } from "@/lib/validation/zod";

const STATUS_OPTIONS: ProjectStatus[] = ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"];

type NewProjectPageProps = {
  clients: ClientListItem[];
  defaultCurrency: string;
};

export function NewProjectForm({ clients, defaultCurrency }: NewProjectPageProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("ACTIVE");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const clientItems = useMemo(
    () => [
      { value: "__none__", label: "No client" },
      ...clients.map((client) => ({ value: client.id, label: client.name })),
    ],
    [clients],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const payload = {
      name,
      clientId: clientId || null,
      status,
      startDate: startDate || null,
      dueDate: dueDate || null,
      currency: defaultCurrency,
      budget: budget.trim() === "" ? null : Number(budget),
      notes: notes.trim() || null,
    };

    const parsed = createProjectSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to create project");

      toast.success("Project created");
      router.push(`/projects/${body.project.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create project");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageScroll className="max-w-3xl">
      <PageBackLink href="/projects">Back to projects</PageBackLink>
      <PageHeader
        title="New project"
        description="A lightweight job container for estimates, invoices, and billable time."
      />

      <FormCard
        title="Project details"
        footer={
          <Button type="submit" form="new-project-form" className="w-full sm:w-auto" disabled={submitting}>
            {submitting ? "Creating…" : "Create project"}
          </Button>
        }
      >
        <form id="new-project-form" className="space-y-4" onSubmit={handleSubmit}>
          <FormField
            label="Name"
            id="project-name"
            value={name}
            onChange={setName}
            required
            error={errors.name}
            placeholder="Kitchen remodel · Smith"
          />

          {clients.length > 0 && (
            <SearchableSelect
              id="project-client"
              label="Client"
              value={clientId || "__none__"}
              options={clientItems}
              onChange={(value) => setClientId(value === "__none__" ? "" : value)}
              placeholder="Optional client"
              description="You can link a client later from an estimate or invoice."
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="project-status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) => value && setStatus(value as ProjectStatus)}
                items={STATUS_OPTIONS.map((option) => ({
                  value: option,
                  label: projectStatusLabel(option),
                }))}
              >
                <SelectTrigger id="project-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {projectStatusLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FormField
              label="Budget"
              id="project-budget"
              type="number"
              min={0}
              step="0.01"
              value={budget}
              onChange={setBudget}
              error={errors.budget}
              placeholder="Optional"
              description={`In ${defaultCurrency}`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Start date"
              id="project-start"
              type="date"
              value={startDate}
              onChange={setStartDate}
            />
            <FormField
              label="Due date"
              id="project-due"
              type="date"
              value={dueDate}
              onChange={setDueDate}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-notes">Notes</Label>
            <Textarea
              id="project-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Internal notes — not shown on invoices"
            />
          </div>
        </form>
      </FormCard>
    </PageScroll>
  );
}
