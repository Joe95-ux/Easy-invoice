"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpIcon, InfoIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { invoiceDraftSchema, type InvoiceDraft } from "@/lib/schemas/invoice";

type AiDocumentParseTabProps = {
  onDraft: (draft: InvoiceDraft) => void;
  variant?: "invoice" | "estimate";
};

type ExamplePrompt = { label: string; text: string };

type VariantCopy = {
  title: string;
  helper: string;
  success: string;
  placeholder: string;
  examples: ExamplePrompt[];
};

const copy: Record<"invoice" | "estimate", VariantCopy> = {
  invoice: {
    title: "Describe the job",
    helper:
      "Type or paste rough notes in any language — even with typos. We'll turn them into clean line items with quantities, rates, and totals.",
    success: "AI draft applied — review the form and create your invoice.",
    placeholder:
      "e.g. Invoice for bathroom remodel — remove old tile $300 x 2 showers, install drywall $600, 7.5% discount if materials supplied, work done in 3 days. Issue date May 11.",
    examples: [
      {
        label: "Bathroom remodel",
        text: "Invoice for bathroom remodel — remove old tile $300 x 2 showers, install drywall $600, 7.5% discount if materials supplied, work done in 3 days. Issue date May 11.",
      },
      {
        label: "Monthly lawn care",
        text: "Invoice for monthly lawn care — mowing $45 x 4 visits, hedge trimming $80, leaf cleanup $120. Due in 14 days.",
      },
      {
        label: "Website project",
        text: "Invoice for website project — design $1200, development 20 hours at $90/hr, hosting setup $150. 10% discount for upfront payment.",
      },
    ],
  },
  estimate: {
    title: "Describe the job",
    helper:
      "Type or paste rough notes in any language — even with typos. We'll turn them into clean line items with quantities, rates, and totals.",
    success: "AI draft applied — review the form and create your estimate.",
    placeholder:
      "e.g. Estimate for bathroom remodel — remove old tile $300 x 2 showers, install drywall $600, 7.5% discount if materials supplied, valid for 30 days. Issue date May 11.",
    examples: [
      {
        label: "Bathroom remodel",
        text: "Estimate for bathroom remodel — remove old tile $300 x 2 showers, install drywall $600, 7.5% discount if materials supplied, valid for 30 days. Issue date May 11.",
      },
      {
        label: "Kitchen install",
        text: "Estimate for kitchen install — cabinets $3500, countertop $1800, plumbing 8 hours at $95/hr, valid for 45 days.",
      },
      {
        label: "Office repaint",
        text: "Estimate for office repaint — 4 rooms at $450 each, supplies $300, 5% discount. Valid for 30 days.",
      },
    ],
  },
};

export function AiDocumentParseTab({
  onDraft,
  variant = "invoice",
}: AiDocumentParseTabProps) {
  const [aiText, setAiText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [metaLabel, setMetaLabel] = useState("Ctrl");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const labels = copy[variant];
  const canSubmit = aiText.trim().length > 0 && !parsing;

  useEffect(() => {
    const isMac = /mac|iphone|ipad|ipod/i.test(
      navigator.platform || navigator.userAgent,
    );
    if (isMac) setMetaLabel("\u2318");
  }, []);

  async function handleParse() {
    setParsing(true);
    try {
      const response = await fetch("/api/ai/parse-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiText }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : "Failed to parse description",
        );
      }
      onDraft(invoiceDraftSchema.parse(body));
      toast.success(labels.success);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not parse that description. Try again or use the form.",
      );
    } finally {
      setParsing(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      if (canSubmit) handleParse();
    }
  }

  function useExample(text: string) {
    setAiText(text);
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(node.value.length, node.value.length);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="font-heading text-base font-semibold tracking-tight">
          {labels.title}
        </h3>
        <Dialog>
          <DialogTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground"
                aria-label="How AI parsing works"
              />
            }
          >
            <InfoIcon className="size-4" />
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>How AI parsing works</DialogTitle>
              <DialogDescription>{labels.helper}</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-2xl border border-input bg-input/30 shadow-sm transition-[color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
        <textarea
          ref={textareaRef}
          value={aiText}
          onChange={(event) => setAiText(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={6}
          placeholder={labels.placeholder}
          className="field-sizing-content block max-h-[360px] min-h-[148px] w-full resize-none bg-transparent px-4 pt-4 pb-2 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70"
        />
        <div className="flex items-center justify-between gap-3 px-3 pb-3 pt-1">
          <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-[10px] font-medium">
              {metaLabel}
            </kbd>
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-[10px] font-medium">
              Enter
            </kbd>
            <span className="ml-0.5">to parse</span>
          </span>
          <button
            type="button"
            onClick={handleParse}
            disabled={!canSubmit}
            aria-label="Parse with AI"
            className={cn(
              "ml-auto inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
              canSubmit
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "cursor-not-allowed bg-muted text-muted-foreground",
            )}
          >
            {parsing ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <ArrowUpIcon className="size-4" />
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Try:</span>
        {labels.examples.map((example) => (
          <button
            key={example.label}
            type="button"
            onClick={() => useExample(example.text)}
            disabled={parsing}
            className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            {example.label}
          </button>
        ))}
      </div>
    </div>
  );
}
