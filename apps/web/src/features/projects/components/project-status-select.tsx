"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectStatus } from "@/lib/db";
import { projectStatusLabel } from "@/lib/projects";

const STATUS_OPTIONS: ProjectStatus[] = ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"];

type ProjectStatusSelectProps = {
  projectId: string;
  status: ProjectStatus;
};

export function ProjectStatusSelect({ projectId, status }: ProjectStatusSelectProps) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [saving, setSaving] = useState(false);

  async function handleChange(next: string | null) {
    if (!next || next === value) return;
    const previous = value;
    setValue(next as ProjectStatus);
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to update status");
      toast.success(`Status set to ${projectStatusLabel(next as ProjectStatus)}`);
      router.refresh();
    } catch (error) {
      setValue(previous);
      toast.error(error instanceof Error ? error.message : "Could not update status");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Select
      value={value}
      onValueChange={handleChange}
      disabled={saving}
      items={STATUS_OPTIONS.map((option) => ({
        value: option,
        label: projectStatusLabel(option),
      }))}
    >
      <SelectTrigger className="w-full sm:w-40" aria-label="Project status">
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
  );
}
