"use client";

import type { ReactNode } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type LineItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export const DEFAULT_LINE_ITEM_COUNT = 3;

export function createEmptyLineItem(): LineItemInput {
  return { description: "", quantity: 1, unitPrice: 0 };
}

export function createDefaultLineItems(
  count = DEFAULT_LINE_ITEM_COUNT,
): LineItemInput[] {
  return Array.from({ length: count }, createEmptyLineItem);
}

type InvoiceLineItemsProps = {
  items: LineItemInput[];
  onChange: (index: number, patch: Partial<LineItemInput>) => void;
  onRemove: (index: number) => void;
  onAdd?: () => void;
};

const desktopGrid = "sm:grid sm:grid-cols-[minmax(0,1fr)_84px_112px_36px] sm:items-center sm:gap-2";

function FieldLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("text-xs font-medium text-muted-foreground", className)}>
      {children}
    </span>
  );
}

export function InvoiceLineItems({
  items,
  onChange,
  onRemove,
  onAdd,
}: InvoiceLineItemsProps) {
  return (
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

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
        <div
          key={index}
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
              Line {index + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              disabled={items.length === 1}
              onClick={() => onRemove(index)}
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
              onChange={(e) => onChange(index, { description: e.target.value })}
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
                onChange={(e) => onChange(index, { quantity: Number(e.target.value) })}
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
                onChange={(e) => onChange(index, { unitPrice: Number(e.target.value) })}
              />
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="hidden shrink-0 text-muted-foreground hover:text-destructive sm:inline-flex"
            disabled={items.length === 1}
            onClick={() => onRemove(index)}
            aria-label="Remove line item"
          >
            <Trash2Icon className="size-4" />
          </Button>
        </div>
        );
      })}

      {onAdd && (
        <>
          <Separator className="my-3" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={onAdd}
          >
            <PlusIcon className="size-4" />
            Add line
          </Button>
        </>
      )}
    </div>
  );
}
