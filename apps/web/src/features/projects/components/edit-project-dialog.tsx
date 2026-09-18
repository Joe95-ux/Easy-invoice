"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon } from "lucide-react";
import { toast } from "sonner";
import { DatePicker } from "@/components/forms/date-picker";
import { FormField } from "@/components/forms/form-field";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { projectStatusLabel } from "@/lib/projects";
import { updateProjectSchema } from "@/lib/schemas/project";
import { zodFieldErrors } from "@/lib/validation/zod";

const STATUS_OPTIONS: ProjectStatus[] = ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"];

export type EditableProject = {
  id: string;
  name: string;
  status: ProjectStatus;
  clientId: string | null;
  startDate: string | null;
  dueDate: string | null;
  currency: string;
  budget: number | null;
  notes: string | null;
};

type EditProjectDialogProps = {
  project: EditableProject;
  clients: ClientListItem[];
};

function toDateKey(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

export function EditProjectDialog({ project, clients }: EditProjectDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [clientId, setClientId] = useState(project.clientId ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [startDate, setStartDate] = useState(toDateKey(project.startDate));
  const [dueDate, setDueDate] = useState(toDateKey(project.dueDate));
  const [budget, setBudget] = useState(
    project.budget == null ? "" : String(project.budget),
  );
  const [notes, setNotes] = useState(project.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const clientItems = useMemo(
    () => [
      { value: "__none__", label: "No client" },
      ...clients.map((client) => ({ value: client.id, label: client.name })),
    ],
    [clients],
  );

  useEffect(() => {
    if (!open) return;
    setName(project.name);
    setClientId(project.clientId ?? "");
    setStatus(project.status);
    setStartDate(toDateKey(project.startDate));
    setDueDate(toDateKey(project.dueDate));
    setBudget(project.budget == null ? "" : String(project.budget));
    setNotes(project.notes ?? "");
    setErrors({});
  }, [open, project]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();

    const payload = {
      name,
      clientId: clientId || null,
      status,
      startDate: startDate || null,
      dueDate: dueDate || null,
      budget: budget.trim() === "" ? null : Number(budget),
      notes: notes.trim() || null,
    };

    const parsed = updateProjectSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to update project");

      toast.success("Project updated");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update project");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-8 w-full min-h-8 sm:w-auto"
        onClick={() => setOpen(true)}
      >
        <PencilIcon className="size-4" />
        Edit
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
            <DialogDescription>
              Update job details. Status can also be changed from the header.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave}>
            <DialogBody className="space-y-4">
              <FormField
                label="Name"
                id="edit-project-name"
                value={name}
                onChange={setName}
                required
                error={errors.name}
                placeholder="Kitchen remodel · Smith"
              />

              {clients.length > 0 ? (
                <SearchableSelect
                  id="edit-project-client"
                  label="Client"
                  value={clientId || "__none__"}
                  options={clientItems}
                  onChange={(value) => setClientId(value === "__none__" ? "" : value)}
                  placeholder="Optional client"
                />
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-project-status">Status</Label>
                  <Select
                    value={status}
                    onValueChange={(value) => value && setStatus(value as ProjectStatus)}
                    items={STATUS_OPTIONS.map((option) => ({
                      value: option,
                      label: projectStatusLabel(option),
                    }))}
                  >
                    <SelectTrigger id="edit-project-status">
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
                <div className="space-y-2">
                  <Label htmlFor="edit-project-budget">Budget</Label>
                  <Input
                    id="edit-project-budget"
                    type="number"
                    min={0}
                    step="0.01"
                    value={budget}
                    onChange={(event) => setBudget(event.target.value)}
                    placeholder="Optional"
                    aria-invalid={Boolean(errors.budget)}
                    aria-describedby={
                      errors.budget ? "edit-project-budget-error" : "edit-project-budget-hint"
                    }
                  />
                  {errors.budget ? (
                    <p id="edit-project-budget-error" className="text-sm text-destructive">
                      {errors.budget}
                    </p>
                  ) : (
                    <p id="edit-project-budget-hint" className="text-sm text-muted-foreground">
                      In {project.currency}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-project-start">Start date</Label>
                  <DatePicker
                    id="edit-project-start"
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-project-due">Due date</Label>
                  <DatePicker
                    id="edit-project-due"
                    value={dueDate}
                    onChange={setDueDate}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-project-notes">Notes</Label>
                <Textarea
                  id="edit-project-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  placeholder="Internal notes — not shown on invoices"
                />
              </div>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
