"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BellRingIcon, Loader2Icon, PauseCircleIcon, PlayCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EstimateStatus, ReminderDeliveryStatus, ReminderKind } from "@easy-invoice/db";
import { formatDate } from "@/lib/estimates";

type ReminderRow = {
  id: string;
  kind: ReminderKind;
  status: ReminderDeliveryStatus;
  toEmail: string;
  createdAt: string;
  error?: string | null;
};

type EstimateRemindersSectionProps = {
  estimateId: string;
  status: EstimateStatus;
  clientEmail?: string | null;
  validUntil?: string | null;
  sentAt?: string | null;
  remindersPaused: boolean;
  reminders: ReminderRow[];
};

const KIND_LABELS: Record<ReminderKind, string> = {
  BEFORE_DUE: "Before expiry",
  ON_DUE: "Expires today",
  OVERDUE: "After expiry",
  MANUAL: "Manual",
};

function canSendFollowUp(
  status: EstimateStatus,
  sentAt?: string | null,
  validUntil?: string | null,
) {
  if (!sentAt || !validUntil) return false;
  return status === "SENT" || status === "VIEWED";
}

export function EstimateRemindersSection({
  estimateId,
  status,
  clientEmail,
  validUntil,
  sentAt,
  remindersPaused: initialPaused,
  reminders: initialReminders,
}: EstimateRemindersSectionProps) {
  const router = useRouter();
  const [remindersPaused, setRemindersPaused] = useState(initialPaused);
  const [toggling, setToggling] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);
  const [email, setEmail] = useState(clientEmail ?? "");
  const [sending, setSending] = useState(false);

  const eligible = canSendFollowUp(status, sentAt, validUntil);

  async function togglePaused(checked: boolean) {
    const newPaused = !checked;
    const previous = remindersPaused;
    setRemindersPaused(newPaused);
    setToggling(true);

    try {
      const response = await fetch(`/api/estimates/${estimateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remindersPaused: newPaused }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to update");

      toast.success(newPaused ? "Automatic follow-ups paused" : "Automatic follow-ups resumed");
      router.refresh();
    } catch (error) {
      setRemindersPaused(previous);
      toast.error(error instanceof Error ? error.message : "Could not update follow-ups");
    } finally {
      setToggling(false);
    }
  }

  async function handleSendReminder() {
    setSending(true);
    try {
      const response = await fetch(`/api/estimates/${estimateId}/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || undefined }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to send follow-up");

      toast.success(`Follow-up sent to ${email}`);
      setRemindOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send follow-up");
    } finally {
      setSending(false);
    }
  }

  if (!eligible && initialReminders.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="mt-6">
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BellRingIcon className="size-4" />
              Estimate follow-ups
            </CardTitle>
            <CardDescription>
              {eligible
                ? "Automatic follow-ups run before the valid-until date unless paused."
                : "Follow-up history for this estimate."}
            </CardDescription>
          </div>
          {eligible && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEmail(clientEmail ?? "");
                setRemindOpen(true);
              }}
            >
              Send follow-up
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {eligible && (
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-1">
                <Label htmlFor="estimate-reminders-active" className="flex items-center gap-2">
                  {remindersPaused ? (
                    <PauseCircleIcon className="size-4 text-muted-foreground" />
                  ) : (
                    <PlayCircleIcon className="size-4 text-muted-foreground" />
                  )}
                  Automatic follow-ups
                </Label>
                <p className="text-sm text-muted-foreground">
                  {remindersPaused
                    ? "Paused — scheduled follow-ups will not be sent for this estimate."
                    : "Active — scheduled follow-ups will be sent per company settings."}
                </p>
              </div>
              <Switch
                id="estimate-reminders-active"
                checked={!remindersPaused}
                onCheckedChange={(checked) => void togglePaused(checked)}
                disabled={toggling}
              />
            </div>
          )}

          {initialReminders.length > 0 ? (
            <Table stickyColumnWidths={["6.5rem", "6rem"]}>
              <TableHeader>
                <TableRow>
                  <TableHead>Sent</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialReminders.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatDate(row.createdAt)}</TableCell>
                    <TableCell>{KIND_LABELS[row.kind]}</TableCell>
                    <TableCell className="max-w-[12rem] truncate">{row.toEmail}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === "SENT" ? "success" : "destructive"}>
                        {row.status === "SENT" ? "Sent" : "Failed"}
                      </Badge>
                      {row.error ? (
                        <p className="mt-1 text-xs text-muted-foreground">{row.error}</p>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No follow-ups sent yet.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={remindOpen} onOpenChange={setRemindOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send estimate follow-up</DialogTitle>
            <DialogDescription>
              Email the client a reminder about this estimate. Optionally override the recipient.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="estimate-remind-email">Recipient email</Label>
              <Input
                id="estimate-remind-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemindOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={() => void handleSendReminder()} disabled={sending || !email.trim()}>
              {sending ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Sending…
                </>
              ) : (
                "Send follow-up"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
