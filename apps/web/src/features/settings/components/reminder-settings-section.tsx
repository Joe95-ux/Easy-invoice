"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BellRingIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { describeReminderSchedule } from "@/lib/reminders/settings";
import { describeEstimateReminderSchedule } from "@/lib/reminders/estimate-settings";
import type { ReminderSettingsInput } from "@/lib/schemas/reminders";

type ReminderSettingsSectionProps = {
  initialSettings: ReminderSettingsInput;
};

function formatDaysInput(days: number[]): string {
  return days.join(", ");
}

function parseDaysInput(value: string): number[] {
  return value
    .split(",")
    .map((part) => parseInt(part.trim(), 10))
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 90);
}

export function ReminderSettingsSection({ initialSettings }: ReminderSettingsSectionProps) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [daysBeforeInput, setDaysBeforeInput] = useState(formatDaysInput(initialSettings.reminderDaysBefore));
  const [daysAfterInput, setDaysAfterInput] = useState(formatDaysInput(initialSettings.reminderDaysAfter));
  const [estimateDaysBeforeInput, setEstimateDaysBeforeInput] = useState(
    formatDaysInput(initialSettings.estimateReminderDaysBefore),
  );
  const [saving, setSaving] = useState(false);
  const [savingSwitch, setSavingSwitch] = useState<keyof ReminderSettingsInput | null>(null);

  function buildPayload(overrides?: Partial<ReminderSettingsInput>): ReminderSettingsInput {
    return {
      ...settings,
      reminderDaysBefore: parseDaysInput(daysBeforeInput),
      reminderDaysAfter: parseDaysInput(daysAfterInput),
      estimateReminderDaysBefore: parseDaysInput(estimateDaysBeforeInput),
      ...overrides,
    };
  }

  async function toggleSetting<K extends keyof ReminderSettingsInput>(
    key: K,
    value: ReminderSettingsInput[K],
  ) {
    const previous = { ...settings };
    const payload = buildPayload({ [key]: value });

    setSettings((prev) => ({ ...prev, [key]: value }));
    setSavingSwitch(key);

    try {
      const response = await fetch("/api/company/reminder-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to save reminder settings");

      setSettings(body.settings);
      setDaysBeforeInput(formatDaysInput(body.settings.reminderDaysBefore));
      setDaysAfterInput(formatDaysInput(body.settings.reminderDaysAfter));
      setEstimateDaysBeforeInput(formatDaysInput(body.settings.estimateReminderDaysBefore));
      router.refresh();
    } catch (error) {
      setSettings(previous);
      toast.error(error instanceof Error ? error.message : "Could not save settings");
    } finally {
      setSavingSwitch(null);
    }
  }

  async function handleSave() {
    const payload = buildPayload();

    setSaving(true);
    try {
      const response = await fetch("/api/company/reminder-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to save reminder settings");

      setSettings(body.settings);
      setDaysBeforeInput(formatDaysInput(body.settings.reminderDaysBefore));
      setDaysAfterInput(formatDaysInput(body.settings.reminderDaysAfter));
      setEstimateDaysBeforeInput(formatDaysInput(body.settings.estimateReminderDaysBefore));
      toast.success("Reminder settings saved");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  const schedulePreview = describeReminderSchedule(buildPayload());
  const estimateSchedulePreview = describeEstimateReminderSchedule(buildPayload());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRingIcon className="size-4" />
          Payment reminders
        </CardTitle>
        <CardDescription>
          Automatically email clients about unpaid invoices. You can pause reminders per invoice or send one manually.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-1">
            <Label htmlFor="reminders-enabled">Automatic reminders</Label>
            <p className="text-sm text-muted-foreground">
              Send scheduled emails for sent invoices with a due date and client email.
            </p>
          </div>
          <Switch
            id="reminders-enabled"
            checked={settings.remindersEnabled}
            onCheckedChange={(checked) => void toggleSetting("remindersEnabled", checked)}
            disabled={savingSwitch !== null}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="days-before">Days before due date</Label>
            <Input
              id="days-before"
              value={daysBeforeInput}
              onChange={(e) => setDaysBeforeInput(e.target.value)}
              placeholder="7, 3"
              disabled={!settings.remindersEnabled}
            />
            <p className="text-xs text-muted-foreground">Comma-separated, e.g. 7, 3</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="days-after">Days after due date (overdue)</Label>
            <Input
              id="days-after"
              value={daysAfterInput}
              onChange={(e) => setDaysAfterInput(e.target.value)}
              placeholder="1, 7, 14"
              disabled={!settings.remindersEnabled}
            />
            <p className="text-xs text-muted-foreground">Comma-separated, e.g. 1, 7, 14</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-1">
            <Label htmlFor="reminder-on-due">Remind on due date</Label>
            <p className="text-sm text-muted-foreground">Send an email on the day payment is due.</p>
          </div>
          <Switch
            id="reminder-on-due"
            checked={settings.reminderOnDueDate}
            onCheckedChange={(checked) => void toggleSetting("reminderOnDueDate", checked)}
            disabled={!settings.remindersEnabled || savingSwitch !== null}
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-1">
            <Label htmlFor="reminder-pdf">Attach PDF</Label>
            <p className="text-sm text-muted-foreground">Include the invoice PDF in reminder emails.</p>
          </div>
          <Switch
            id="reminder-pdf"
            checked={settings.reminderIncludePdf}
            onCheckedChange={(checked) => void toggleSetting("reminderIncludePdf", checked)}
            disabled={savingSwitch !== null}
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-1">
            <Label htmlFor="payment-receipt-emails">Payment receipt emails</Label>
            <p className="text-sm text-muted-foreground">
              Email clients a receipt PDF and updated invoice when a payment is recorded on a sent invoice.
            </p>
          </div>
          <Switch
            id="payment-receipt-emails"
            checked={settings.paymentReceiptEmailsEnabled}
            onCheckedChange={(checked) =>
              void toggleSetting("paymentReceiptEmailsEnabled", checked)
            }
            disabled={savingSwitch !== null}
          />
        </div>

        <div className="rounded-lg bg-muted/50 p-4 text-sm">
          <p className="font-medium">Invoice schedule preview</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            {schedulePreview.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>

        <div className="border-t pt-6">
          <div className="mb-4">
            <h3 className="font-heading text-base font-semibold">Estimate follow-ups</h3>
            <p className="text-sm text-muted-foreground">
              Nudge clients before an estimate expires. Past the valid-until date, open estimates are marked expired automatically.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-1">
                <Label htmlFor="estimate-reminders-enabled">Automatic estimate follow-ups</Label>
                <p className="text-sm text-muted-foreground">
                  Email clients about open estimates that have a valid-until date.
                </p>
              </div>
              <Switch
                id="estimate-reminders-enabled"
                checked={settings.estimateRemindersEnabled}
                onCheckedChange={(checked) =>
                  void toggleSetting("estimateRemindersEnabled", checked)
                }
                disabled={savingSwitch !== null}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimate-days-before">Days before valid-until</Label>
              <Input
                id="estimate-days-before"
                value={estimateDaysBeforeInput}
                onChange={(e) => setEstimateDaysBeforeInput(e.target.value)}
                placeholder="7, 3"
                disabled={!settings.estimateRemindersEnabled}
              />
              <p className="text-xs text-muted-foreground">Comma-separated, e.g. 7, 3</p>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-1">
                <Label htmlFor="estimate-on-expiry">Remind on valid-until day</Label>
                <p className="text-sm text-muted-foreground">
                  Send a last-day follow-up when the estimate expires today.
                </p>
              </div>
              <Switch
                id="estimate-on-expiry"
                checked={settings.estimateReminderOnExpiryDay}
                onCheckedChange={(checked) =>
                  void toggleSetting("estimateReminderOnExpiryDay", checked)
                }
                disabled={!settings.estimateRemindersEnabled || savingSwitch !== null}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-1">
                <Label htmlFor="estimate-reminder-pdf">Attach estimate PDF</Label>
                <p className="text-sm text-muted-foreground">
                  Include the estimate PDF in follow-up emails.
                </p>
              </div>
              <Switch
                id="estimate-reminder-pdf"
                checked={settings.estimateReminderIncludePdf}
                onCheckedChange={(checked) =>
                  void toggleSetting("estimateReminderIncludePdf", checked)
                }
                disabled={savingSwitch !== null}
              />
            </div>

            <div className="rounded-lg bg-muted/50 p-4 text-sm">
              <p className="font-medium">Estimate schedule preview</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                {estimateSchedulePreview.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2Icon className="animate-spin" />
              Saving...
            </>
          ) : (
            "Save reminder settings"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
