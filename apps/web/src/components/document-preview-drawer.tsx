"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon, FileTextIcon, Loader2Icon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  buildDocumentHtml,
  type BuildDocumentHtmlOptions,
  type PreviewCompany,
} from "@/lib/invoice-templates/preview-html";
import type { DocumentKind } from "@/lib/invoice-templates/types";

export type { PreviewCompany };

type DocumentPreviewDrawerProps = BuildDocumentHtmlOptions & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: DocumentKind;
  templateName?: string;
  isSelected?: boolean;
  onUseTemplate?: () => void;
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
      title="Document preview"
      sandbox="allow-same-origin"
      className="w-full rounded-lg bg-white shadow-sm ring-1 ring-black/5"
      style={{ height }}
    />
  );
}

export function DocumentPreviewDrawer(props: DocumentPreviewDrawerProps) {
  const {
    open,
    onOpenChange,
    kind,
    templateName,
    isSelected,
    onUseTemplate,
    ...buildOptions
  } = props;

  const liveHtml = useMemo(
    () => (open ? buildDocumentHtml({ ...buildOptions, kind }) : ""),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      open,
      kind,
      buildOptions.templateSlug,
      buildOptions.number,
      buildOptions.currency,
      buildOptions.issueDate,
      buildOptions.expiryDate,
      buildOptions.notes,
      buildOptions.taxRate,
      buildOptions.discount,
      buildOptions.client.name,
      buildOptions.client.email,
      buildOptions.client.phone,
      buildOptions.client.address,
      buildOptions.totals.subtotal,
      buildOptions.totals.taxAmount,
      buildOptions.totals.total,
      JSON.stringify(buildOptions.items),
      JSON.stringify(buildOptions.company),
    ],
  );

  const [frameHtml, setFrameHtml] = useState("");
  const liveRef = useRef(liveHtml);
  liveRef.current = liveHtml;

  // Show content immediately when the drawer opens.
  useEffect(() => {
    if (open) setFrameHtml(liveRef.current);
  }, [open]);

  // Debounce subsequent edits so the iframe doesn't reload on every keystroke.
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => setFrameHtml(liveHtml), 350);
    return () => window.clearTimeout(id);
  }, [liveHtml, open]);

  const label = kind === "estimate" ? "Estimate" : "Invoice";
  const showUseAction = Boolean(onUseTemplate) && !isSelected;

  return (
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
                <SheetTitle className="truncate">Live preview</SheetTitle>
                <SheetDescription className="truncate text-xs">
                  {label} {buildOptions.number} · updates as you type
                </SheetDescription>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {templateName && (
                <Badge variant="secondary" className="hidden sm:inline-flex">
                  {templateName}
                </Badge>
              )}
              <SheetClose
                render={<Button variant="ghost" size="icon-sm" aria-label="Close preview" />}
              >
                <XIcon />
              </SheetClose>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/40 p-4 sm:p-6">
            <div className="mx-auto max-w-[820px]">
              {frameHtml ? (
                <PreviewFrame html={frameHtml} />
              ) : (
                <div className="flex h-64 items-center justify-center text-muted-foreground">
                  <Loader2Icon className="size-5 animate-spin" />
                </div>
              )}
            </div>
          </div>

          <footer className="flex items-center justify-between gap-3 border-t px-4 py-2.5">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block size-1.5 rounded-full bg-success" />
              Live preview — the final PDF is generated when you save.
            </span>
            {showUseAction ? (
              <Button size="sm" onClick={onUseTemplate}>
                <CheckIcon className="size-4" />
                Use this template
              </Button>
            ) : isSelected && onUseTemplate ? (
              <Badge variant="success" className="gap-1">
                <CheckIcon className="size-3" />
                Selected
              </Badge>
            ) : null}
          </footer>
        </div>
      </SheetContent>
    </Sheet>
  );
}
