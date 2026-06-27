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
import { downloadEstimatePdf } from "@/lib/estimate-pdf-client";
import type { EstimateStatus } from "@easy-invoice/db";

type EstimateActionsProps = {
  estimateId: string;
  estimateNumber: string;
  status: EstimateStatus;
  clientEmail?: string | null;
};

const TERMINAL_STATUSES: EstimateStatus[] = ["ACCEPTED", "DECLINED", "CANCELLED"];

export function EstimateActions({
  estimateId,
  estimateNumber,
  status,
  clientEmail,
}: EstimateActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [email, setEmail] = useState(clientEmail ?? "");

  async function handleDownloadPdf() {
    setLoading("pdf");
    try {
      await downloadEstimatePdf(estimateId, estimateNumber);
      toast.success("PDF downloaded");
    } catch {
      toast.error("Could not generate PDF. Is the ai-docs service running?");
    } finally {
      setLoading(null);
    }
  }

  async function handleSend() {
    setLoading("send");
    try {
      const response = await fetch(`/api/estimates/${estimateId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to send");

      toast.success(`Estimate sent to ${email}`);
      setSendOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send estimate");
    } finally {
      setLoading(null);
    }
  }

  async function updateStatus(newStatus: EstimateStatus) {
    setLoading(newStatus);
    try {
      const response = await fetch(`/api/estimates/${estimateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error("Failed to update status");

      toast.success(`Estimate marked as ${newStatus.toLowerCase()}`);
      router.refresh();
    } catch {
      toast.error("Could not update estimate status");
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete() {
    setLoading("delete");
    try {
      const response = await fetch(`/api/estimates/${estimateId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");

      toast.success("Estimate deleted");
      router.push("/estimates");
      router.refresh();
    } catch {
      toast.error("Could not delete estimate");
      setLoading(null);
    }
  }

  const isTerminal = TERMINAL_STATUSES.includes(status);

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        onClick={handleDownloadPdf}
        disabled={loading !== null}
      >
        {loading === "pdf" ? "Generating..." : "Download PDF"}
      </Button>

      {!isTerminal && (
        <Button
          onClick={() => {
            setEmail(clientEmail ?? "");
            setSendOpen(true);
          }}
          disabled={loading !== null}
        >
          Send estimate
        </Button>
      )}

      {!isTerminal && (
        <Button
          variant="secondary"
          onClick={() => updateStatus("ACCEPTED")}
          disabled={loading !== null}
        >
          {loading === "ACCEPTED" ? "Updating..." : "Mark as accepted"}
        </Button>
      )}

      {!isTerminal && (
        <Button
          variant="outline"
          onClick={() => updateStatus("DECLINED")}
          disabled={loading !== null}
        >
          {loading === "DECLINED" ? "Updating..." : "Mark as declined"}
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
            <AlertDialogTitle>Delete estimate?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {estimateNumber}. This action cannot be undone.
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
            <DialogTitle>Send estimate</DialogTitle>
            <DialogDescription>
              Email {estimateNumber} as a PDF attachment to your client.
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
