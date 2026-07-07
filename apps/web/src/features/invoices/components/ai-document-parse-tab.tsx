"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpIcon,
  InfoIcon,
  Loader2Icon,
  MicIcon,
  PlusIcon,
  SquareIcon,
} from "lucide-react";
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
import { DocumentUploadDialog } from "@/features/invoices/components/document-upload-dialog";
import { VoiceInputVisualizer } from "@/features/invoices/components/voice-input-visualizer";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { DOCUMENT_PARSE_CLIENT_TIMEOUT_MS } from "@/lib/ai-docs";
import { cn } from "@/lib/utils";
import {
  invoiceDraftSchema,
  parseDocumentResponseSchema,
  type DocumentParseMeta,
  type DocumentExtractionMode,
  type InvoiceDraft,
} from "@/lib/schemas/invoice";

type AiDocumentParseTabProps = {
  onDraft: (draft: InvoiceDraft, meta?: DocumentParseMeta) => void;
  variant?: "invoice" | "estimate";
  knownClientName?: string;
  preferLinesOnly?: boolean;
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
      "Describe the job, upload an old invoice PDF, or speak naturally. We'll extract client details, line items, amounts, and notes.",
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
      "Describe the job, upload an old invoice PDF, or speak naturally. We'll extract client details, line items, amounts, and notes.",
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
  knownClientName,
  preferLinesOnly = false,
}: AiDocumentParseTabProps) {
  const [aiText, setAiText] = useState("");
  const [liveText, setLiveText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsingDocument, setParsingDocument] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isRecording, isTranscribing, isBusy, audioLevels, toggleRecording } =
    useVoiceInput();
  const labels = copy[variant];
  const displayText = isRecording ? liveText : aiText;
  const isWorking = parsing || parsingDocument;
  const canSubmit = displayText.trim().length > 0 && !isWorking && !isBusy;

  const scrollTextareaToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) return;
      node.scrollTop = node.scrollHeight;
      node.setSelectionRange(node.value.length, node.value.length);
    });
  }, []);

  useEffect(() => {
    if (isRecording) scrollTextareaToEnd();
  }, [isRecording, liveText, scrollTextareaToEnd]);

  async function handleParse() {
    setParsing(true);
    try {
      const response = await fetch("/api/ai/parse-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: displayText, documentKind: variant }),
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

  const voiceCallbacks = {
    onLiveUpdate: (text: string) => {
      setLiveText(text);
    },
    onComplete: (spokenText: string) => {
      setAiText((current) =>
        current.trim() ? `${current.trim()}\n${spokenText}` : spokenText,
      );
      setLiveText("");
      scrollTextareaToEnd();
      toast.success("Speech added to description");
    },
    onError: (message: string) => {
      setLiveText("");
      toast.error(message);
    },
  };

  async function handleVoiceInput() {
    try {
      const result = await toggleRecording(voiceCallbacks, aiText);
      if (result === "started") {
        setLiveText(aiText);
        toast.message("Listening…", {
          description: "Speak naturally — your words will appear as you talk.",
        });
        return;
      }

      if (result === "empty") {
        toast.error("No speech detected. Try speaking closer to your microphone.");
      }
    } catch (error) {
      setLiveText("");
      toast.error(
        error instanceof Error ? error.message : "Could not transcribe speech. Try again.",
      );
    }
  }

  function handleFileButtonClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadFile(file);
    setUploadOpen(true);
  }

  async function handleDocumentExtract(mode: DocumentExtractionMode) {
    if (!uploadFile) return;

    setParsingDocument(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("documentKind", variant);
      formData.append("extractionMode", mode);
      if (knownClientName?.trim()) {
        formData.append("knownClientName", knownClientName.trim());
      }

      const response = await fetch("/api/ai/parse-document", {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(DOCUMENT_PARSE_CLIENT_TIMEOUT_MS),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : "Failed to extract document",
        );
      }

      const parsed = parseDocumentResponseSchema.parse(body);
      const { extraction_mode, extraction_method, warnings, source_filename, ...draft } =
        parsed;

      onDraft(draft, {
        extraction_mode,
        extraction_method,
        warnings,
        source_filename,
      });

      if (warnings.length > 0) {
        toast.warning("Document imported — please review highlighted fields", {
          description: warnings.slice(0, 2).join(" "),
        });
      } else {
        toast.success(
          mode === "lines_only"
            ? "Line items imported — review the form before saving."
            : labels.success,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error && error.name === "TimeoutError"
          ? "Document extraction timed out. The first attempt in dev can be slow while routes compile — try again, or use a smaller PDF."
          : error instanceof Error
            ? error.message
            : "Could not extract that document. Try another file or use the form.";
      toast.error(message);
      throw error;
    } finally {
      setParsingDocument(false);
      setUploadFile(null);
    }
  }

  function useExample(text: string) {
    setAiText(text);
    setLiveText("");
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

      <div
        className={cn(
          "rounded-2xl border bg-input/30 shadow-sm transition-[color,box-shadow,border-color]",
          isRecording
            ? "border-destructive/50 ring-3 ring-destructive/20"
            : "border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        )}
      >
        <textarea
          ref={textareaRef}
          value={displayText}
          onChange={(event) => {
            if (isRecording) return;
            setAiText(event.target.value);
          }}
          rows={6}
          placeholder={labels.placeholder}
          readOnly={isRecording}
          disabled={isWorking || isTranscribing}
          className={cn(
            "field-sizing-content block max-h-[360px] min-h-[148px] w-full resize-none bg-transparent px-4 pt-4 pb-2 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-60",
            isRecording ? "text-foreground caret-transparent" : "text-foreground",
          )}
        />
        <div className="flex items-center justify-between gap-3 px-3 pb-3 pt-1">
          <div className="flex min-w-0 items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              accept=".pdf,.txt,image/*"
              onChange={handleFileChange}
              tabIndex={-1}
              aria-hidden
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleFileButtonClick}
              disabled={isWorking || isBusy}
              aria-label="Upload document"
              title="Upload PDF or image"
              className="rounded-lg text-muted-foreground hover:bg-muted"
            >
              {parsingDocument ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <PlusIcon className="size-4" />
              )}
            </Button>

            {isRecording && (
              <>
                <VoiceInputVisualizer levels={audioLevels} active />
                <span className="truncate text-xs font-medium text-destructive">
                  Listening…
                </span>
              </>
            )}
            {parsingDocument && (
              <span className="text-xs text-muted-foreground">Reading document…</span>
            )}
            {isTranscribing && (
              <span className="text-xs text-muted-foreground">Transcribing…</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant={isRecording ? "destructive" : "ghost"}
              size="icon"
              onClick={() => void handleVoiceInput()}
              disabled={isWorking || isTranscribing}
              aria-label={isRecording ? "Stop recording" : "Record voice input"}
              title={isRecording ? "Stop recording" : "Record voice input"}
              className={cn(
                "rounded-lg",
                !isRecording && "text-muted-foreground hover:bg-muted",
                isRecording && "animate-pulse",
              )}
            >
              {isTranscribing ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : isRecording ? (
                <SquareIcon className="size-3.5 fill-current" />
              ) : (
                <MicIcon className="size-4" />
              )}
            </Button>

            <button
              type="button"
              onClick={() => void handleParse()}
              disabled={!canSubmit}
              aria-label="Parse with AI"
              className={cn(
                "inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
                canSubmit
                  ? "cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
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
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Try:</span>
        {labels.examples.map((example) => (
          <button
            key={example.label}
            type="button"
            onClick={() => useExample(example.text)}
            disabled={parsing || isBusy || parsingDocument}
            className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            {example.label}
          </button>
        ))}
      </div>

      <DocumentUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        file={uploadFile}
        variant={variant}
        defaultMode={preferLinesOnly ? "lines_only" : "full"}
        knownClientName={knownClientName}
        onConfirm={handleDocumentExtract}
      />
    </div>
  );
}
