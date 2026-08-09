"use client";

import type { ReactNode } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  createEmptySection,
  sectionSubtotal,
  type LineItemSectionInput,
} from "@/lib/line-item-sections";
import { formatMoney } from "@/lib/invoices";
import { cn } from "@/lib/utils";

export type LineItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  timeEntryIds?: string[];
};

export type { LineItemSectionInput };

export const DEFAULT_LINE_ITEM_COUNT = 3;

export function createEmptyLineItem(): LineItemInput {
  return { description: "", quantity: 1, unitPrice: 0 };
}

export function createDefaultLineItems(
  count = DEFAULT_LINE_ITEM_COUNT,
): LineItemInput[] {
  return Array.from({ length: count }, createEmptyLineItem);
}

export function createDefaultSections(
  itemCount = DEFAULT_LINE_ITEM_COUNT,
): LineItemSectionInput<LineItemInput>[] {
  return [
    {
      ...createEmptySection(createEmptyLineItem, ""),
      items: createDefaultLineItems(itemCount),
    },
  ];
}

function lineItemHasContent(item: LineItemInput) {
  return Boolean(
    item.description.trim() || item.unitPrice > 0 || item.quantity !== 1,
  );
}

/**
 * Append line items to the last section. Pure — safe under React Strict Mode
 * (must not mutate existing section/item objects).
 */
export function appendItemsToLastSection(
  sections: LineItemSectionInput<LineItemInput>[],
  items: LineItemInput[],
): LineItemSectionInput<LineItemInput>[] {
  if (items.length === 0) return sections;

  const base = sections.length > 0 ? sections : createDefaultSections();
  const lastIndex = base.length - 1;
  const target = base[lastIndex]!;
  const hasContent = target.items.some(lineItemHasContent);
  const nextItems = hasContent ? [...target.items, ...items] : [...items];

  return base.map((section, index) =>
    index === lastIndex ? { ...section, items: nextItems } : section,
  );
}

type InvoiceLineItemsProps = {
  sections: LineItemSectionInput<LineItemInput>[];
  onChange: (sections: LineItemSectionInput<LineItemInput>[]) => void;
  currency?: string;
};

const desktopGrid =
  "sm:grid sm:grid-cols-[minmax(0,1fr)_84px_112px_36px] sm:items-center sm:gap-2";

function FieldLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("text-xs font-medium text-muted-foreground", className)}>
      {children}
    </span>
  );
}

export function InvoiceLineItems({
  sections,
  onChange,
  currency = "USD",
}: InvoiceLineItemsProps) {
  const showSectionChrome = sections.length > 1 || sections.some((s) => s.title.trim());

  function updateSection(
    sectionIndex: number,
    patch: Partial<LineItemSectionInput<LineItemInput>>,
  ) {
    onChange(
      sections.map((section, i) => (i === sectionIndex ? { ...section, ...patch } : section)),
    );
  }

  function updateItem(
    sectionIndex: number,
    itemIndex: number,
    patch: Partial<LineItemInput>,
  ) {
    onChange(
      sections.map((section, si) => {
        if (si !== sectionIndex) return section;
        return {
          ...section,
          items: section.items.map((item, ii) =>
            ii === itemIndex ? { ...item, ...patch } : item,
          ),
        };
      }),
    );
  }

  function removeItem(sectionIndex: number, itemIndex: number) {
    const section = sections[sectionIndex];
    if (!section) return;

    if (section.items.length === 1 && sections.length === 1) return;

    if (section.items.length === 1) {
      onChange(sections.filter((_, i) => i !== sectionIndex));
      return;
    }

    updateSection(sectionIndex, {
      items: section.items.filter((_, i) => i !== itemIndex),
    });
  }

  function addItem(sectionIndex: number) {
    const section = sections[sectionIndex];
    if (!section) return;
    updateSection(sectionIndex, {
      items: [...section.items, createEmptyLineItem()],
    });
  }

  function addSection() {
    onChange([...sections, createEmptySection(createEmptyLineItem, `Section ${sections.length + 1}`)]);
  }

  function removeSection(sectionIndex: number) {
    if (sections.length === 1) return;
    onChange(sections.filter((_, i) => i !== sectionIndex));
  }

  const totalItems = sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <div className="space-y-5">
      {sections.map((section, sectionIndex) => {
        const subtotal = sectionSubtotal(section.items);

        return (
          <div
            key={section.key}
            className={cn(
              showSectionChrome &&
                "rounded-xl border border-border/70 bg-muted/10 p-3 sm:p-4",
            )}
          >
            {showSectionChrome && (
              <div className="mb-3 flex items-start gap-2">
                <Input
                  placeholder="Section title (e.g. Downstairs)"
                  value={section.title}
                  onChange={(e) => updateSection(sectionIndex, { title: e.target.value })}
                  className="font-heading font-semibold"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={sections.length === 1}
                  onClick={() => removeSection(sectionIndex)}
                  aria-label="Remove section"
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
            )}

            <div className="space-y-3 sm:space-y-2.5">
              <div
                className={cn(
                  "hidden px-0.5 text-xs font-medium text-muted-foreground",
                  desktopGrid,
                )}
              >
                <span>Description</span>
                <span>Qty</span>
                <span>Rate</span>
                <span className="sr-only">Remove</span>
              </div>

              {section.items.map((item, itemIndex) => {
                const isLast = itemIndex === section.items.length - 1;
                const canRemove = totalItems > 1;

                return (
                  <div
                    key={`${section.key}-${itemIndex}`}
                    className={cn(
                      "rounded-xl border border-border/70 bg-muted/15 p-3",
                      "sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:pb-2.5",
                      !isLast && "sm:border-b sm:border-border/50",
                      isLast && "sm:pb-0",
                      desktopGrid,
                    )}
                  >
                    <div className="mb-3 flex items-center justify-between sm:hidden">
                      <span className="text-xs font-medium text-muted-foreground">
                        Line {itemIndex + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        disabled={!canRemove}
                        onClick={() => removeItem(sectionIndex, itemIndex)}
                        aria-label="Remove line item"
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>

                    <div className="space-y-1.5 sm:contents">
                      <FieldLabel className="sm:sr-only">Description</FieldLabel>
                      <Input
                        placeholder="Item or service"
                        value={item.description}
                        onChange={(e) =>
                          updateItem(sectionIndex, itemIndex, {
                            description: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-0 sm:contents">
                      <div className="space-y-1.5 sm:contents">
                        <FieldLabel className="sm:sr-only">Qty</FieldLabel>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          inputMode="decimal"
                          placeholder="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(sectionIndex, itemIndex, {
                              quantity: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5 sm:contents">
                        <FieldLabel className="sm:sr-only">Rate</FieldLabel>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(sectionIndex, itemIndex, {
                              unitPrice: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="hidden shrink-0 text-muted-foreground hover:text-destructive sm:inline-flex"
                      disabled={!canRemove}
                      onClick={() => removeItem(sectionIndex, itemIndex)}
                      aria-label="Remove line item"
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                );
              })}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => addItem(sectionIndex)}
                >
                  <PlusIcon className="size-4" />
                  Add line
                </Button>
                {showSectionChrome && (
                  <span className="text-xs text-muted-foreground">
                    Section subtotal{" "}
                    <span className="font-medium text-foreground">
                      {formatMoney(subtotal, currency)}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <Separator />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="cursor-pointer"
        onClick={addSection}
      >
        <PlusIcon className="size-4" />
        Add section
      </Button>
    </div>
  );
}
