"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  FileTextIcon,
  Loader2Icon,
  Minimize2Icon,
  PaperclipIcon,
  SendIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@easy-invoice/db";

type InvoiceSendDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  clientEmail?: string | null;
  companyName?: string | null;
  clientName?: string | null;
  onSent?: () => void;
};

function defaultSubject(invoiceNumber: string, companyName?: string | null) {
  const company = companyName?.trim();
  return company
    ? `Invoice ${invoiceNumber} from ${company}`
    : `Invoice ${invoiceNumber}`;
}

export function InvoiceSendDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  status,
  clientEmail,
  companyName,
  clientName,
  onSent,
}: InvoiceSendDialogProps) {
  const router = useRouter();
  const [to, setTo] = useState(clientEmail ?? "");
  const [subject, setSubject] = useState(defaultSubject(invoiceNumber, companyName));
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const canSend = status !== "CANCELLED" && status !== "PAID";
  const attachmentName = `${invoiceNumber}.pdf`;

  useEffect(() => {
    if (!open) return;
    setTo(clientEmail ?? "");
    setSubject(defaultSubject(invoiceNumber, companyName));
    setMessage("");
    setPreviewOpen(false);
    setPreviewError(null);
  }, [open, clientEmail, invoiceNumber, companyName]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const sheetWidthClass = useMemo(
    () =>
      previewOpen
        ? "gap-0 p-0 !w-full max-w-none sm:!max-w-5xl lg:!max-w-6xl"
        : "gap-0 p-0 !w-full max-w-none sm:!max-w-xl lg:!max-w-2xl",
    [previewOpen],
  );

  async function loadPreview() {
    if (previewUrl) {
      setPreviewOpen(true);
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewOpen(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string" ? data.error : "Could not load PDF preview",
        );
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Could not load PDF preview");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleAiDraft() {
    setDrafting(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/email-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName ?? undefined,
          tone: "professional",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not draft message");
      if (typeof data.message !== "string" || !data.message.trim()) {
        throw new Error("Empty draft returned");
      }
      setMessage(data.message.trim());
      toast.success("Draft ready — edit as you like");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not draft message");
    } finally {
      setDrafting(false);
    }
  }

  async function handleSend() {
    if (!to.trim() || !canSend) return;
    setSending(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: to.trim(),
          subject: subject.trim() || undefined,
          message: message.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to send");

      toast.success(`Invoice sent to ${to.trim()}`);
      onOpenChange(false);
      onSent?.();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send invoice");
    } finally {
      setSending(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={sheetWidthClass}
      >
        <div className="relative flex h-full min-h-0 flex-col">
          {/* Gmail-style chrome */}
          <header className="flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-2.5">
            <div className="min-w-0">
              <SheetTitle className="text-sm font-semibold tracking-tight">
                New message
              </SheetTitle>
              <SheetDescription className="truncate text-xs">
                Send {invoiceNumber} with PDF attached
              </SheetDescription>
            </div>
            <div className="flex items-center gap-0.5">
              {previewOpen && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Hide attachment preview"
                  className="cursor-pointer"
                  onClick={() => setPreviewOpen(false)}
                >
                  <Minimize2Icon className="size-4" />
                </Button>
              )}
              <SheetClose
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Close compose"
                    className="cursor-pointer"
                  />
                }
              >
                <XIcon className="size-4" />
              </SheetClose>
            </div>
          </header>

          <div className="flex min-h-0 flex-1">
            {/* Compose pane */}
            <div
              className={cn(
                "flex min-h-0 min-w-0 flex-1 flex-col",
                previewOpen && "border-r sm:max-w-md lg:max-w-lg",
              )}
            >
              <div className="flex min-h-0 flex-1 flex-col">
                <ComposeField label="To">
                  <Input
                    type="email"
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                    placeholder="client@example.com"
                    disabled={!canSend}
                    className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                  />
                </ComposeField>
                <ComposeField label="Subject">
                  <Input
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder={defaultSubject(invoiceNumber, companyName)}
                    disabled={!canSend}
                    className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                  />
                </ComposeField>

                <div className="relative flex min-h-0 flex-1 flex-col px-4 pt-3">
                  <Textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Write a short note for your client…"
                    maxLength={2000}
                    disabled={!canSend}
                    className="min-h-[160px] flex-1 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                  />
                  <div className="flex flex-wrap items-center gap-2 py-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => void handleAiDraft()}
                      disabled={!canSend || drafting}
                    >
                      {drafting ? (
                        <Loader2Icon className="size-3.5 animate-spin" />
                      ) : (
                        <SparklesIcon className="size-3.5" />
                      )}
                      {drafting ? "Drafting…" : "AI draft"}
                    </Button>
                    <span className="text-[11px] text-muted-foreground">
                      {message.length}/2000
                    </span>
                  </div>
                </div>

                <div className="border-t px-4 py-3">
                  <button
                    type="button"
                    onClick={() => void loadPreview()}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5 text-left transition-colors hover:bg-muted/60",
                      previewOpen && "border-primary/40 bg-primary/5",
                    )}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-red-500/10 text-red-600 dark:text-red-400">
                      <FileTextIcon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {attachmentName}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        PDF · Click to preview
                      </span>
                    </span>
                    <PaperclipIcon className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                  {!canSend && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      This invoice cannot be sent in its current status.
                    </p>
                  )}
                </div>
              </div>

              <footer className="flex flex-wrap items-center gap-2 border-t bg-muted/20 px-4 py-3">
                <Button
                  type="button"
                  className="cursor-pointer"
                  onClick={() => void handleSend()}
                  disabled={!to.trim() || sending || !canSend}
                >
                  {sending ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <SendIcon className="size-4" />
                  )}
                  {sending ? "Sending…" : "Send"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="cursor-pointer"
                  onClick={() => onOpenChange(false)}
                >
                  Discard
                </Button>
              </footer>
            </div>

            {/* Attachment preview pane */}
            {previewOpen && (
              <div className="hidden min-h-0 min-w-0 flex-1 flex-col bg-muted/30 sm:flex">
                <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
                  <p className="truncate text-sm font-medium">{attachmentName}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="cursor-pointer"
                    aria-label="Close preview"
                    onClick={() => setPreviewOpen(false)}
                  >
                    <XIcon className="size-4" />
                  </Button>
                </div>
                <div className="min-h-0 flex-1 p-3">
                  {previewLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : previewError ? (
                    <div className="flex h-full items-center justify-center px-4 text-center text-sm text-destructive">
                      {previewError}
                    </div>
                  ) : previewUrl ? (
                    <iframe
                      title={`${attachmentName} preview`}
                      src={previewUrl}
                      className="h-full w-full rounded-lg bg-white shadow-sm ring-1 ring-black/5"
                    />
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {/* Mobile preview: full-height overlay inside sheet */}
          {previewOpen && (
            <div className="absolute inset-0 z-10 flex flex-col bg-background sm:hidden">
              <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
                <p className="truncate text-sm font-medium">{attachmentName}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="cursor-pointer"
                  aria-label="Close preview"
                  onClick={() => setPreviewOpen(false)}
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
              <div className="min-h-0 flex-1 p-3">
                {previewLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : previewError ? (
                  <div className="flex h-full items-center justify-center px-4 text-center text-sm text-destructive">
                    {previewError}
                  </div>
                ) : previewUrl ? (
                  <iframe
                    title={`${attachmentName} preview`}
                    src={previewUrl}
                    className="h-full w-full rounded-lg bg-white shadow-sm ring-1 ring-black/5"
                  />
                ) : null}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ComposeField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b px-4 py-1.5">
      <span className="w-14 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
