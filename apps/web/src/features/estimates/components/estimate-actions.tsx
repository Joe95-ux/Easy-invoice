"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  DownloadIcon,
  FileTextIcon,
  LinkIcon,
  MoreHorizontalIcon,
  PencilIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react";
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
import { usePdfDownload } from "@/hooks/use-pdf-download";
import { cn } from "@/lib/utils";
import type { EstimateStatus } from "@easy-invoice/db";

type EstimateActionsProps = {
  estimateId: string;
  estimateNumber: string;
  companyName: string;
  status: EstimateStatus;
  clientEmail?: string | null;
  convertedInvoiceId?: string | null;
  convertedInvoiceNumber?: string | null;
};

const TERMINAL_STATUSES: EstimateStatus[] = ["ACCEPTED", "DECLINED", "CANCELLED"];

export function EstimateActions({
  estimateId,
  estimateNumber,
  companyName,
  status,
  clientEmail,
  convertedInvoiceId,
  convertedInvoiceNumber,
}: EstimateActionsProps) {
  const router = useRouter();
  const { openPdfDownload, pdfDownloadDialog } = usePdfDownload();
  const [loading, setLoading] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [email, setEmail] = useState(clientEmail ?? "");

  const isTerminal = TERMINAL_STATUSES.includes(status);
  const canSend = !isTerminal;
  const canConvert =
    !convertedInvoiceId && status !== "DECLINED" && status !== "CANCELLED";
  const isBusy = loading !== null;

  function handleDownloadPdf() {
    openPdfDownload({
      kind: "estimate",
      documentId: estimateId,
      documentNumber: estimateNumber,
      companyName,
    });
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

  async function handleConvertToInvoice() {
    setLoading("convert");
    const toastId = toast.loading("Converting to invoice…");
    try {
      const response = await fetch(`/api/estimates/${estimateId}/convert-to-invoice`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to convert");

      toast.success(
        data.created
          ? "Invoice created from estimate"
          : `Opening existing invoice ${data.invoice.number}`,
        { id: toastId },
      );
      router.push(`/invoices/${data.invoice.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not convert estimate", {
        id: toastId,
      });
    } finally {
      setLoading(null);
    }
  }

  function renderSecondaryAction() {
    if (convertedInvoiceId) {
      return (
        <Button
          variant="outline"
          className="flex-1 sm:flex-none"
          render={<Link href={`/invoices/${convertedInvoiceId}`} />}
        >
          <FileTextIcon />
          View invoice{convertedInvoiceNumber ? ` (${convertedInvoiceNumber})` : ""}
        </Button>
      );
    }

    if (canConvert) {
      return (
        <Button
          variant="outline"
          className="flex-1 sm:flex-none"
          onClick={handleConvertToInvoice}
          disabled={isBusy}
        >
          <FileTextIcon />
          {loading === "convert" ? "Converting..." : "Convert to invoice"}
        </Button>
      );
    }

    return (
      <Button
        variant="outline"
        className="flex-1 sm:flex-none"
        onClick={handleDownloadPdf}
        disabled={isBusy}
      >
        <DownloadIcon />
        Download PDF
      </Button>
    );
  }

  return (
    <>
      <div className={cn("flex w-full flex-col gap-2 sm:w-auto sm:flex-row", pageHeaderActionClass)}>
        <ButtonGroup className="w-full sm:w-auto">
          <Button
            variant="outline"
            className="flex-1 sm:flex-none"
            render={<Link href={`/estimates/${estimateId}/edit`} />}
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
              Send estimate
            </Button>
          ) : (
            <Button
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={handleDownloadPdf}
              disabled={isBusy}
            >
              <DownloadIcon />
              Download PDF
            </Button>
          )}
        </ButtonGroup>

        <ButtonGroup className="w-full sm:w-auto">
          {canSend ? (
            renderSecondaryAction()
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
                  aria-label="More estimate actions"
                  disabled={isBusy}
                />
              }
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44 w-48">
              {canSend && (
                <DropdownMenuItem onClick={handleDownloadPdf}>
                  <DownloadIcon className="size-4" />
                  Download PDF
                </DropdownMenuItem>
              )}
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
              {convertedInvoiceId && (
                <DropdownMenuItem render={<Link href={`/invoices/${convertedInvoiceId}`} />}>
                  <FileTextIcon className="size-4" />
                  View invoice
                </DropdownMenuItem>
              )}
              {canConvert && (
                <DropdownMenuItem onClick={handleConvertToInvoice}>
                  <FileTextIcon className="size-4" />
                  Convert to invoice
                </DropdownMenuItem>
              )}
              {canSend && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => updateStatus("ACCEPTED")}>
                    Mark as accepted
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateStatus("DECLINED")}>
                    Mark as declined
                  </DropdownMenuItem>
                </>
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
        kind="estimate"
        documentId={estimateId}
        showTrigger={false}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
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

      {pdfDownloadDialog}
    </>
  );
}
