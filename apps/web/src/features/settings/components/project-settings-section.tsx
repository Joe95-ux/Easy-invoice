"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BriefcaseIcon } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type ProjectSettingsSectionProps = {
  createProjectOnEstimateAccept: boolean;
};

export function ProjectSettingsSection({
  createProjectOnEstimateAccept: initialValue,
}: ProjectSettingsSectionProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  async function handleToggle(checked: boolean) {
    const previous = enabled;
    setEnabled(checked);
    setSaving(true);
    try {
      const response = await fetch("/api/company/project-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ createProjectOnEstimateAccept: checked }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to save");
      setEnabled(body.settings.createProjectOnEstimateAccept);
      router.refresh();
    } catch (error) {
      setEnabled(previous);
      toast.error(error instanceof Error ? error.message : "Could not save setting");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BriefcaseIcon className="size-4" />
          Projects
        </CardTitle>
        <CardDescription>
          Optional job containers for estimates, invoices, and time. Invoices stay freestanding unless
          you link them.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-1">
            <Label htmlFor="create-project-on-accept">Create project when an estimate is accepted</Label>
            <p className="text-sm text-muted-foreground">
              Automatically starts a project from the estimate (name, client, budget) when a client or
              teammate accepts it. You can still create projects manually anytime.
            </p>
          </div>
          <Switch
            id="create-project-on-accept"
            checked={enabled}
            onCheckedChange={(checked) => void handleToggle(checked)}
            disabled={saving}
          />
        </div>
      </CardContent>
    </Card>
  );
}
