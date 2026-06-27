"use client";

import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type LineItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
};

type InvoiceLineItemsProps = {
  items: LineItemInput[];
  onChange: (index: number, patch: Partial<LineItemInput>) => void;
  onRemove: (index: number) => void;
};

const gridCols = "grid-cols-[minmax(0,1fr)_84px_112px_36px]";

export function InvoiceLineItems({
  items,
  onChange,
  onRemove,
}: InvoiceLineItemsProps) {
  return (
    <div className="space-y-2.5">
      <div
        className={`hidden gap-2 px-0.5 text-xs font-medium text-muted-foreground sm:grid ${gridCols}`}
      >
        <span>Description</span>
        <span>Qty</span>
        <span>Rate</span>
        <span className="sr-only">Remove</span>
      </div>
      {items.map((item, index) => (
        <div key={index} className={`grid items-center gap-2 ${gridCols}`}>
          <Input
            placeholder="Item or service"
            value={item.description}
            onChange={(e) => onChange(index, { description: e.target.value })}
          />
          <Input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            placeholder="1"
            value={item.quantity}
            onChange={(e) => onChange(index, { quantity: Number(e.target.value) })}
          />
          <Input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            value={item.unitPrice}
            onChange={(e) => onChange(index, { unitPrice: Number(e.target.value) })}
          />
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
      ))}
    </div>
  );
}
