"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  DownloadIcon,
  LinkIcon,
  MoreHorizontalIcon,
  PencilIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { throwIfApiError, toastApiError } from "@/lib/billing/plan-api-error";
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
import { Textarea } from "@/components/ui/textarea";
import { pageHeaderActionClass } from "@/components/app-shell/page-header";
import { DocumentShareButton } from "@/components/document-share-button";
import { usePdfDownload } from "@/hooks/use-pdf-download";
import type { CreditNoteStatus } from "@easy-invoice/db";

type CreditNoteActionsProps = {
  creditNoteId: string;
  creditNoteNumber: string;
  companyName: string;
  invoiceId: string;
  status: CreditNoteStatus;
  clientEmail?: string | null;
  canWrite?: boolean;
  canDelete?: boolean;
};

export function CreditNoteActions({
  creditNoteId,
  creditNoteNumber,
  companyName,
  invoiceId,
  status,
  clientEmail,
  canWrite = true,
  canDelete = true,
}: CreditNoteActionsProps) {
  const router = useRouter();
  const { openPdfDownload, pdfDownloadDialog } = usePdfDownload();
  const [sendOpen, setSendOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [email, setEmail] = useState(clientEmail ?? "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  async function handleIssue() {
    setLoading("issue");
    try {
      const response = await fetch(`/api/credit-notes/${creditNoteId}/issue`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      throwIfApiError(response, data, "Could not issue credit note");
      toast.success("Credit note issued");
      router.refresh();
    } catch (error) {
      toastApiError(error, "Could not issue credit note");
    } finally {
      setLoading(null);
    }
  }

  async function handleSend() {
    setLoading("send");
    try {
      const response = await fetch(`/api/credit-notes/${creditNoteId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || undefined, message: message || undefined }),
      });
      const data = await response.json().catch(() => ({}));
      throwIfApiError(response, data, "Could not send credit note");
      toast.success("Credit note sent");
      setSendOpen(false);
      router.refresh();
    } catch (error) {
      toastApiError(error, "Could not send credit note");
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete() {
    setLoading("delete");
    try {
      const response = await fetch(`/api/credit-notes/${creditNoteId}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      throwIfApiError(response, data, "Could not remove credit note");
      toast.success(status === "DRAFT" ? "Draft deleted" : "Credit note cancelled");
      router.push(status === "DRAFT" ? "/credit-notes" : `/invoices/${invoiceId}`);
      router.refresh();
    } catch (error) {
      toastApiError(error, "Could not remove credit note");
    } finally {
      setLoading(null);
      setDeleteOpen(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <ButtonGroup className="w-full sm:w-auto">
          {canWrite && status === "DRAFT" ? (
            <Button className={pageHeaderActionClass} onClick={() => void handleIssue()} disabled={loading !== null}>
              Issue
            </Button>
          ) : null}
          {canWrite && status !== "CANCELLED" ? (
            <Button
              variant={status === "DRAFT" ? "outline" : "default"}
              className={status === "DRAFT" ? undefined : pageHeaderActionClass}
              onClick={() => setSendOpen(true)}
              disabled={loading !== null}
            >
              <SendIcon />
              Send
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={() =>
              openPdfDownload({
                kind: "credit_note",
                documentId: creditNoteId,
                documentNumber: creditNoteNumber,
                companyName,
              })
            }
          >
            <DownloadIcon />
            Download PDF
          </Button>
        </ButtonGroup>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="icon" aria-label="More credit note actions" disabled={loading !== null} />
            }
          >
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canWrite && status === "DRAFT" ? (
              <DropdownMenuItem render={<Link href={`/credit-notes/${creditNoteId}/edit`} />}>
                <PencilIcon className="size-4" />
                Edit
              </DropdownMenuItem>
            ) : null}
            {canWrite ? (
              <DropdownMenuItem onClick={() => setShareOpen(true)}>
                <LinkIcon className="size-4" />
                Share link
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem render={<Link href={`/invoices/${invoiceId}`} />}>
              View invoice
            </DropdownMenuItem>
            {canDelete ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2Icon className="size-4" />
                  {status === "DRAFT" ? "Delete" : "Cancel credit note"}
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DocumentShareButton
        kind="credit_note"
        documentId={creditNoteId}
        showTrigger={false}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send credit note</DialogTitle>
            <DialogDescription>
              Emails {creditNoteNumber} as a PDF. Drafts are issued before sending.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="credit-send-email">Email</Label>
              <Input
                id="credit-send-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit-send-message">Message</Label>
              <Textarea
                id="credit-send-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSend()} disabled={loading === "send"}>
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {status === "DRAFT" ? "Delete this draft?" : "Cancel this credit note?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {status === "DRAFT"
                ? "This draft will be removed."
                : "The credit will no longer reduce the invoice balance."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>
              {status === "DRAFT" ? "Delete" : "Cancel credit note"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {pdfDownloadDialog}
    </>
  );
}
