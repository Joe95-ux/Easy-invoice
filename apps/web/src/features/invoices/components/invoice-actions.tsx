"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createLucideIcon,
  BellRingIcon,
  DownloadIcon,
  LinkIcon,
  MoreHorizontalIcon,
  PencilIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react";

const BanknoteCheckIcon = createLucideIcon("BanknoteCheck", [
  ["path", { d: "M11.748 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4.875" }],
  ["path", { d: "m16 19 2 2 4-4" }],
  ["path", { d: "M18 12h.01" }],
  ["path", { d: "M6 12h.01" }],
  ["circle", { cx: "12", cy: "12", r: "2" }],
]);
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pageHeaderActionClass } from "@/components/app-shell/page-header";
import { DocumentShareButton } from "@/components/document-share-button";
import { downloadInvoicePdf } from "@/lib/invoice-pdf-client";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@easy-invoice/db";

type InvoiceActionsProps = {
  invoiceId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  clientEmail?: string | null;
  dueDate?: string | null;
  sentAt?: string | null;
};

export function InvoiceActions({
  invoiceId,
  invoiceNumber,
  status,
  clientEmail,
  dueDate,
  sentAt,
}: InvoiceActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [email, setEmail] = useState(clientEmail ?? "");
  const [reminderEmail, setReminderEmail] = useState(clientEmail ?? "");

  const canSend = status !== "CANCELLED" && status !== "PAID";
  const canMarkPaid = status !== "PAID" && status !== "CANCELLED";
  const canRemind =
    Boolean(sentAt && dueDate) &&
    (status === "SENT" || status === "VIEWED" || status === "OVERDUE");
  const isBusy = loading !== null;

  async function handleDownloadPdf() {
    setLoading("pdf");
    try {
      await downloadInvoicePdf(invoiceId, invoiceNumber);
    } catch {
      // Toast handled in downloadInvoicePdf
    } finally {
      setLoading(null);
    }
  }

  async function handleSend() {
    setLoading("send");
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to send");

      toast.success(`Invoice sent to ${email}`);
      setSendOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send invoice");
    } finally {
      setLoading(null);
    }
  }

  async function handleRemind() {
    setLoading("remind");
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: reminderEmail || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to send reminder");

      toast.success(`Reminder sent to ${reminderEmail}`);
      setRemindOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send reminder");
    } finally {
      setLoading(null);
    }
  }

  async function updateStatus(newStatus: InvoiceStatus) {
    setLoading(newStatus);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error("Failed to update status");

      toast.success(`Invoice marked as ${newStatus.toLowerCase()}`);
      router.refresh();
    } catch {
      toast.error("Could not update invoice status");
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete() {
    setLoading("delete");
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");

      toast.success("Invoice deleted");
      router.push("/invoices");
      router.refresh();
    } catch {
      toast.error("Could not delete invoice");
      setLoading(null);
    }
  }

  return (
    <>
      <div className={cn("flex w-full flex-col gap-2 sm:w-auto sm:flex-row", pageHeaderActionClass)}>
        <ButtonGroup className="w-full sm:w-auto">
          <Button
            variant="outline"
            className="flex-1 sm:flex-none"
            render={<Link href={`/invoices/${invoiceId}/edit`} />}
          >
            <PencilIcon />
            Edit
          </Button>
          {canSend ? (
            <Button
              variant="outline"
              className="flex-1 text-primary hover:text-primary sm:flex-none"
              onClick={() => {
                setEmail(clientEmail ?? "");
                setSendOpen(true);
              }}
              disabled={isBusy}
            >
              <SendIcon />
              Send invoice
            </Button>
          ) : (
            <Button
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={handleDownloadPdf}
              disabled={isBusy}
            >
              <DownloadIcon />
              {loading === "pdf" ? "Generating..." : "Download PDF"}
            </Button>
          )}
        </ButtonGroup>

        <ButtonGroup className="w-full sm:w-auto">
          {canSend ? (
            <Button
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={handleDownloadPdf}
              disabled={isBusy}
            >
              <DownloadIcon />
              {loading === "pdf" ? "Generating..." : "Download PDF"}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() => setShareOpen(true)}
              disabled={isBusy}
            >
              <LinkIcon />
              Share link
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  aria-label="More invoice actions"
                  disabled={isBusy}
                />
              }
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44 w-48">
              {canSend && (
                <DropdownMenuItem onClick={() => setShareOpen(true)}>
                  <LinkIcon className="size-4" />
                  Share link
                </DropdownMenuItem>
              )}
              {!canSend && (
                <DropdownMenuItem onClick={handleDownloadPdf}>
                  <DownloadIcon className="size-4" />
                  Download PDF
                </DropdownMenuItem>
              )}
              {canMarkPaid && (
                <DropdownMenuItem onClick={() => updateStatus("PAID")}>
                  <BanknoteCheckIcon className="size-4" />
                  Mark as paid
                </DropdownMenuItem>
              )}
              {canRemind && (
                <DropdownMenuItem
                  onClick={() => {
                    setReminderEmail(clientEmail ?? "");
                    setRemindOpen(true);
                  }}
                >
                  <BellRingIcon className="size-4" />
                  Send payment reminder
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2Icon className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ButtonGroup>
      </div>

      <DocumentShareButton
        kind="invoice"
        documentId={invoiceId}
        showTrigger={false}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {invoiceNumber}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {loading === "delete" ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send invoice</DialogTitle>
            <DialogDescription>
              Email {invoiceNumber} as a PDF attachment to your client.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-2">
            <Label htmlFor="client-email">Client email</Label>
            <Input
              id="client-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={!email || loading === "send"}>
              {loading === "send" ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={remindOpen} onOpenChange={setRemindOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send payment reminder</DialogTitle>
            <DialogDescription>
              Email a payment reminder for {invoiceNumber}. You can send one manual reminder per day.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-2">
            <Label htmlFor="reminder-client-email">Client email</Label>
            <Input
              id="reminder-client-email"
              type="email"
              value={reminderEmail}
              onChange={(e) => setReminderEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemindOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRemind} disabled={!reminderEmail || loading === "remind"}>
              {loading === "remind" ? "Sending..." : "Send reminder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
