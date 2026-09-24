"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import type { CustomFieldDefinition } from "@/lib/schemas/custom-fields";
import { formatCustomFieldDisplayValue } from "@/lib/custom-fields";
import { cn } from "@/lib/utils";

type CustomFieldsInvoicePreviewProps = {
  definitions: CustomFieldDefinition[];
  className?: string;
};

const SAMPLE_LINES = [
  { label: "Design services", amount: "$2,400.00" },
  { label: "Project management", amount: "$600.00" },
  { label: "Tax", amount: "$0.00" },
] as const;

type PreviewKind = "invoice" | "estimate";

const PREVIEW_OPTIONS = [
  { id: "invoice" as const, label: "Invoice preview" },
  { id: "estimate" as const, label: "Estimate preview" },
] as const;

/** Lightweight document mock showing where custom fields land on the PDF. */
export function CustomFieldsInvoicePreview({
  definitions,
  className,
}: CustomFieldsInvoicePreviewProps) {
  const [tab, setTab] = useState<"preview" | "behavior">("preview");
  const [previewKind, setPreviewKind] = useState<PreviewKind>("invoice");
  const [previewMenuOpen, setPreviewMenuOpen] = useState(false);
  const previewTabRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    return definitions
      .filter(
        (field) =>
          field.enabled !== false &&
          field.appliesTo.includes(previewKind) &&
          field.showOnPdf !== false &&
          field.label.trim(),
      )
      .map((field) => {
        const sample = field.defaultValue?.trim() || sampleValueForType(field);
        const display = formatCustomFieldDisplayValue(field, sample) ?? sample;
        return { id: field.id, label: field.label, value: display };
      });
  }, [definitions, previewKind]);

  useEffect(() => {
    if (!previewMenuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!previewTabRef.current?.contains(event.target as Node)) {
        setPreviewMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPreviewMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [previewMenuOpen]);

  const activePreviewLabel =
    PREVIEW_OPTIONS.find((option) => option.id === previewKind)?.label ?? "Invoice preview";
  const title = previewKind === "invoice" ? "Invoice" : "Estimate";
  const docNumber = previewKind === "invoice" ? "INV-1042" : "EST-1042";
  const clientLabel = previewKind === "invoice" ? "Bill to" : "Prepared for";
  const emptyHint =
    previewKind === "invoice"
      ? "Custom fields that show on invoices and PDFs appear here."
      : "Custom fields that show on estimates and PDFs appear here.";

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-muted/25",
        className,
      )}
    >
      <div className="flex shrink-0 items-end gap-1 border-b border-border/80 px-3 pt-3">
        <div ref={previewTabRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setTab("preview");
              setPreviewMenuOpen((open) => !open);
            }}
            aria-expanded={previewMenuOpen}
            aria-haspopup="listbox"
            className={cn(
              "relative inline-flex items-center gap-1 px-2.5 pb-2.5 text-xs font-medium transition-colors",
              tab === "preview"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {activePreviewLabel}
            <ChevronDownIcon
              className={cn(
                "size-3.5 transition-transform duration-200",
                previewMenuOpen && "rotate-180",
              )}
            />
            {tab === "preview" ? (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
            ) : null}
          </button>

          {previewMenuOpen ? (
            <div
              role="listbox"
              aria-label="Preview document type"
              className="absolute left-0 top-[calc(100%+0.35rem)] z-20 min-w-44 overflow-hidden rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-md"
            >
              {PREVIEW_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={previewKind === option.id}
                  onClick={() => {
                    setPreviewKind(option.id);
                    setTab("preview");
                    setPreviewMenuOpen(false);
                  }}
                  className={cn(
                    "flex w-full cursor-pointer px-3 py-2 text-left text-xs font-medium transition-colors",
                    previewKind === option.id
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => {
            setTab("behavior");
            setPreviewMenuOpen(false);
          }}
          className={cn(
            "relative px-2.5 pb-2.5 text-xs font-medium transition-colors",
            tab === "behavior"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Field behavior
          {tab === "behavior" ? (
            <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
          ) : null}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        {tab === "preview" ? (
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2.5">
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold tracking-tight text-white dark:bg-zinc-100 dark:text-zinc-900"
                  aria-hidden
                >
                  AC
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold tracking-tight">Acme Co.</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    123 Market Street
                    <br />
                    San Francisco, CA 94103
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-base font-semibold tracking-tight sm:text-lg">{title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{docNumber}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 border-t border-border/70 pt-4 text-[11px] sm:grid-cols-2">
              <div>
                <p className="font-medium text-muted-foreground">{clientLabel}</p>
                <p className="mt-0.5 font-medium text-foreground">Northwind Labs</p>
                <p className="text-muted-foreground">billing@northwind.io</p>
              </div>
              <div className="space-y-0.5 sm:text-right">
                <p className="text-muted-foreground">
                  Issue <span className="text-foreground">Mar 12, 2026</span>
                </p>
                <p className="text-muted-foreground">
                  {previewKind === "invoice" ? "Due" : "Valid until"}{" "}
                  <span className="text-foreground">Mar 26, 2026</span>
                </p>
              </div>
            </div>

            {rows.length > 0 ? (
              <div className="mt-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Custom fields
                </p>
                <dl className="mt-2 space-y-2 rounded-lg bg-muted/50 px-3 py-2.5">
                  {rows.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-baseline justify-between gap-3 text-[12px]"
                    >
                      <dt className="text-muted-foreground">{row.label}</dt>
                      <dd className="max-w-[58%] truncate text-right font-medium text-foreground">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : (
              <div className="mt-5 rounded-lg bg-muted/40 px-3 py-7 text-center text-[12px] text-muted-foreground">
                {emptyHint}
              </div>
            )}

            <div className="mt-5">
              {SAMPLE_LINES.map((line) => (
                <div
                  key={line.label}
                  className="flex justify-between border-b border-border/60 py-2 text-[12px] last:border-b-0"
                >
                  <span className="text-muted-foreground">{line.label}</span>
                  <span className="font-medium tabular-nums text-foreground">{line.amount}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-border/70 pt-2.5 text-sm font-semibold">
                <span>Total</span>
                <span className="tabular-nums">$3,000.00</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 text-sm leading-relaxed text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Enabled</span> fields appear when
              creating documents of the selected type.
            </p>
            <p>
              <span className="font-medium text-foreground">Required</span> must be filled before
              save.
            </p>
            <p>
              <span className="font-medium text-foreground">Show on PDF</span> controls whether the
              value prints on the shared document.
            </p>
            <p>Drag rows to change order — that order is used on forms and PDFs.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function sampleValueForType(field: CustomFieldDefinition): string {
  switch (field.type) {
    case "date":
      return "2026-03-12";
    case "number":
      return "12";
    case "checkbox":
      return "true";
    case "select":
      return field.options?.[0]?.value ?? "Option";
    case "textarea":
      return "Additional notes for this job.";
    case "email":
      return "billing@northwind.io";
    case "url":
      return "https://northwind.io/po/45678";
    default:
      return field.label.toLowerCase().includes("po") ? "PO-45678" : "Sample value";
  }
}
