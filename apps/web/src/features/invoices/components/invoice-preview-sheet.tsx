"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ExternalLinkIcon,
  FileTextIcon,
  Loader2Icon,
  PencilIcon,
  SendIcon,
  XIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { InvoiceSendDialog } from "@/features/invoices/components/invoice-send-dialog";
import { invoiceStatusLabel, invoiceStatusVariant } from "@/lib/invoices";
import type { InvoiceStatus } from "@easy-invoice/db";

type PreviewInvoice = {
  id: string;
  number: string;
  status: InvoiceStatus;
  clientEmail: string | null;
};

type InvoicePreviewSheetProps = {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientEmail?: string | null;
};

function PreviewFrame({ html }: { html: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(960);

  function syncHeight() {
    const doc = frameRef.current?.contentDocument;
    if (!doc) return;
    const next = doc.documentElement?.scrollHeight ?? doc.body?.scrollHeight ?? 0;
    if (next > 0) setHeight(next + 8);
  }

  return (
    <iframe
      ref={frameRef}
      srcDoc={html}
      onLoad={syncHeight}
      title="Invoice preview"
      sandbox="allow-same-origin"
      className="w-full rounded-lg bg-white shadow-sm ring-1 ring-black/5"
      style={{ height }}
    />
  );
}

export function InvoicePreviewSheet({
  invoiceId,
  open,
  onOpenChange,
  clientEmail,
}: InvoicePreviewSheetProps) {
  const [html, setHtml] = useState("");
  const [invoice, setInvoice] = useState<PreviewInvoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);

  useEffect(() => {
    if (!open || !invoiceId) {
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setHtml("");
    setInvoice(null);

    fetch(`/api/invoices/${invoiceId}/preview-html`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(typeof body.error === "string" ? body.error : "Failed to load preview");
        }
        return body as { html: string; invoice: PreviewInvoice };
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        setHtml(data.html);
        setInvoice(data.invoice);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Failed to load preview");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [open, invoiceId]);

  const resolvedEmail = invoice?.clientEmail ?? clientEmail ?? null;
  const canSend =
    invoice && invoice.status !== "CANCELLED" && invoice.status !== "PAID";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full gap-0 p-0 sm:!max-w-2xl lg:!max-w-3xl"
        >
          <div className="flex h-full min-h-0 flex-col">
            <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileTextIcon className="size-4" />
                </span>
                <div className="min-w-0">
                  <SheetTitle className="truncate">
                    {invoice?.number ?? "Invoice preview"}
                  </SheetTitle>
                  <SheetDescription className="truncate text-xs">
                    {invoice ? "Invoice preview" : "Loading invoice…"}
                  </SheetDescription>
                  {invoice && (
                    <Badge
                      variant={invoiceStatusVariant(invoice.status)}
                      className="mt-1 w-fit text-[10px]"
                    >
                      {invoiceStatusLabel(invoice.status)}
                    </Badge>
                  )}
                </div>
              </div>
              <SheetClose
                render={<Button variant="ghost" size="icon-sm" aria-label="Close preview" />}
              >
                <XIcon />
              </SheetClose>
            </header>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-muted/40 p-4 sm:p-6">
              {loading ? (
                <div className="flex flex-1 items-center justify-center">
                  <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="flex flex-1 items-center justify-center text-sm text-destructive">
                  {error}
                </div>
              ) : html ? (
                <div className="mx-auto w-full max-w-[820px]">
                  <PreviewFrame html={html} />
                </div>
              ) : null}
            </div>

            {invoice && (
              <footer className="flex flex-wrap items-center gap-2 border-t px-4 py-3">
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link href={`/invoices/${invoice.id}#invoice-template`} />}
                  onClick={() => onOpenChange(false)}
                >
                  <PencilIcon className="size-4" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link href={`/invoices/${invoice.id}`} />}
                  onClick={() => onOpenChange(false)}
                >
                  <ExternalLinkIcon className="size-4" />
                  Details
                </Button>
                <Button
                  size="sm"
                  disabled={!canSend}
                  onClick={() => setSendOpen(true)}
                >
                  <SendIcon className="size-4" />
                  Send invoice
                </Button>
              </footer>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {invoice && (
        <InvoiceSendDialog
          open={sendOpen}
          onOpenChange={setSendOpen}
          invoiceId={invoice.id}
          invoiceNumber={invoice.number}
          status={invoice.status}
          clientEmail={resolvedEmail}
        />
      )}
    </>
  );
}
