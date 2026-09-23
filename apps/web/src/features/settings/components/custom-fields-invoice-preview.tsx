"use client";

import { useMemo, useState } from "react";
import type { CustomFieldDefinition } from "@/lib/schemas/custom-fields";
import { formatCustomFieldDisplayValue } from "@/lib/custom-fields";
import { cn } from "@/lib/utils";

type CustomFieldsInvoicePreviewProps = {
  definitions: CustomFieldDefinition[];
  className?: string;
};

/** Lightweight invoice mock showing where custom fields land on the PDF. */
export function CustomFieldsInvoicePreview({
  definitions,
  className,
}: CustomFieldsInvoicePreviewProps) {
  const rows = useMemo(() => {
    return definitions
      .filter(
        (field) =>
          field.enabled !== false &&
          field.appliesTo.includes("invoice") &&
          field.showOnPdf !== false &&
          field.label.trim(),
      )
      .map((field) => {
        const sample = field.defaultValue?.trim() || sampleValueForType(field);
        const display = formatCustomFieldDisplayValue(field, sample) ?? sample;
        return { id: field.id, label: field.label, value: display };
      });
  }, [definitions]);

  const [tab, setTab] = useState<"preview" | "behavior">("preview");

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-muted/25",
        className,
      )}
    >
      <div className="flex shrink-0 gap-1 border-b border-border/80 px-3 pt-3">
        {(
          [
            { id: "preview" as const, label: "Invoice preview" },
            { id: "behavior" as const, label: "Field behavior" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "relative px-2.5 pb-2.5 text-xs font-medium transition-colors",
              tab === item.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
            {tab === item.id ? (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
            ) : null}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        {tab === "preview" ? (
          <div className="rounded-lg border border-border/90 bg-card p-4 shadow-sm sm:p-5">
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
                <p className="text-base font-semibold tracking-tight sm:text-lg">Invoice</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">INV-1042</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 border-t border-border/70 pt-4 text-[11px] sm:grid-cols-2">
              <div>
                <p className="font-medium text-muted-foreground">Bill to</p>
                <p className="mt-0.5 font-medium text-foreground">Northwind Labs</p>
                <p className="text-muted-foreground">billing@northwind.io</p>
              </div>
              <div className="space-y-0.5 sm:text-right">
                <p className="text-muted-foreground">
                  Issue <span className="text-foreground">Mar 12, 2026</span>
                </p>
                <p className="text-muted-foreground">
                  Due <span className="text-foreground">Mar 26, 2026</span>
                </p>
              </div>
            </div>

            {rows.length > 0 ? (
              <div className="mt-5 border-t border-border/70 pt-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Custom fields
                </p>
                <dl className="mt-2.5 space-y-2">
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
              <div className="mt-5 rounded-md border border-dashed border-border/80 px-3 py-7 text-center text-[12px] text-muted-foreground">
                Custom fields that show on invoices and PDFs appear here.
              </div>
            )}

            <div className="mt-5 border-t border-border/70 pt-4">
              <div className="flex justify-between text-[12px]">
                <span className="text-muted-foreground">Design services</span>
                <span className="font-medium tabular-nums">$2,400.00</span>
              </div>
              <div className="mt-2 flex justify-between text-[12px]">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-medium tabular-nums">$0.00</span>
              </div>
              <div className="mt-3 flex justify-between border-t border-border/60 pt-3 text-sm font-semibold">
                <span>Total</span>
                <span className="tabular-nums">$2,400.00</span>
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
    default:
      return field.label.toLowerCase().includes("po") ? "PO-45678" : "Sample value";
  }
}
