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
import type { InvoiceStatus, ReminderDeliveryStatus, ReminderKind } from "@easy-invoice/db";
import { formatDate } from "@/lib/invoices";

type ReminderRow = {
  id: string;
  kind: ReminderKind;
  status: ReminderDeliveryStatus;
  toEmail: string;
  createdAt: string;
  error?: string | null;
};

type InvoiceRemindersSectionProps = {
  invoiceId: string;
  status: InvoiceStatus;
  clientEmail?: string | null;
  dueDate?: string | null;
  sentAt?: string | null;
  remindersPaused: boolean;
  reminders: ReminderRow[];
};

const KIND_LABELS: Record<ReminderKind, string> = {
  BEFORE_DUE: "Before due",
  ON_DUE: "Due today",
  OVERDUE: "Overdue",
  MANUAL: "Manual",
};

function canSendReminder(status: InvoiceStatus, sentAt?: string | null, dueDate?: string | null) {
  if (!sentAt || !dueDate) return false;
  return (
    status === "SENT" ||
    status === "VIEWED" ||
    status === "OVERDUE" ||
    status === "PARTIALLY_PAID"
  );
}

export function InvoiceRemindersSection({
  invoiceId,
  status,
  clientEmail,
  dueDate,
  sentAt,
  remindersPaused: initialPaused,
  reminders: initialReminders,
}: InvoiceRemindersSectionProps) {
  const router = useRouter();
  const [remindersPaused, setRemindersPaused] = useState(initialPaused);
  const [toggling, setToggling] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);
  const [email, setEmail] = useState(clientEmail ?? "");
  const [sending, setSending] = useState(false);

  const eligible = canSendReminder(status, sentAt, dueDate);

  async function togglePaused(checked: boolean) {
    const newPaused = !checked;
    const previous = remindersPaused;
    setRemindersPaused(newPaused);
    setToggling(true);

    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remindersPaused: newPaused }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to update");

      toast.success(newPaused ? "Automatic reminders paused" : "Automatic reminders resumed");
      router.refresh();
    } catch (error) {
      setRemindersPaused(previous);
      toast.error(error instanceof Error ? error.message : "Could not update reminders");
    } finally {
      setToggling(false);
    }
  }

  async function handleSendReminder() {
    setSending(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || undefined }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to send reminder");

      toast.success(`Reminder sent to ${email}`);
      setRemindOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send reminder");
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
              Payment reminders
            </CardTitle>
            <CardDescription>
              {eligible
                ? "Automatic reminders follow your company schedule unless paused for this invoice."
                : "Reminder history for this invoice."}
            </CardDescription>
          </div>
          {eligible && (
            <Button variant="outline" size="sm" onClick={() => {
              setEmail(clientEmail ?? "");
              setRemindOpen(true);
            }}>
              Send reminder
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {eligible && (
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-1">
                <Label htmlFor="invoice-reminders-active" className="flex items-center gap-2">
                  {remindersPaused ? (
                    <PauseCircleIcon className="size-4 text-muted-foreground" />
                  ) : (
                    <PlayCircleIcon className="size-4 text-muted-foreground" />
                  )}
                  Automatic reminders
                </Label>
                <p className="text-sm text-muted-foreground">
                  {remindersPaused
                    ? "Paused — scheduled reminders will not be sent for this invoice."
                    : "Active — scheduled reminders will be sent per company settings."}
                </p>
              </div>
              <Switch
                id="invoice-reminders-active"
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
                    <TableCell>{row.toEmail}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === "SENT" ? "success" : "destructive"}>
                        {row.status === "SENT" ? "Sent" : "Failed"}
                      </Badge>
                      {row.error && (
                        <p className="mt-1 text-xs text-muted-foreground">{row.error}</p>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No reminders sent yet.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={remindOpen} onOpenChange={setRemindOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send payment reminder</DialogTitle>
            <DialogDescription>
              Email a payment reminder to your client. You can send one manual reminder per day.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-2">
            <Label htmlFor="reminder-email">Client email</Label>
            <Input
              id="reminder-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemindOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendReminder} disabled={!email || sending}>
              {sending ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Sending...
                </>
              ) : (
                "Send reminder"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
