"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DocumentShareButton } from "@/components/document-share-button";
import { downloadInvoicePdf } from "@/lib/invoice-pdf-client";
import type { InvoiceStatus } from "@easy-invoice/db";

type InvoiceActionsProps = {
  invoiceId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  clientEmail?: string | null;
};

export function InvoiceActions({
  invoiceId,
  invoiceNumber,
  status,
  clientEmail,
}: InvoiceActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [email, setEmail] = useState(clientEmail ?? "");

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
    <div className="flex flex-wrap gap-2">
      <DocumentShareButton kind="invoice" documentId={invoiceId} />

      <Button
        variant="outline"
        onClick={handleDownloadPdf}
        disabled={loading !== null}
      >
        {loading === "pdf" ? "Generating..." : "Download PDF"}
      </Button>

      {status !== "CANCELLED" && status !== "PAID" && (
        <Button
          onClick={() => {
            setEmail(clientEmail ?? "");
            setSendOpen(true);
          }}
          disabled={loading !== null}
        >
          Send invoice
        </Button>
      )}

      {status !== "PAID" && status !== "CANCELLED" && (
        <Button
          variant="secondary"
          onClick={() => updateStatus("PAID")}
          disabled={loading !== null}
        >
          {loading === "PAID" ? "Updating..." : "Mark as paid"}
        </Button>
      )}

      <AlertDialog>
        <AlertDialogTrigger>
          <Button variant="destructive" disabled={loading !== null}>
            Delete
          </Button>
        </AlertDialogTrigger>
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
          <div className="space-y-2">
            <Label htmlFor="client-email">Client email</Label>
            <Input
              id="client-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </div>
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
    </div>
  );
}
