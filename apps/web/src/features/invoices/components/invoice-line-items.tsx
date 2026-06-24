"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type LineItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
};

type InvoiceLineItemsProps = {
  items: LineItemInput[];
  onChange: (index: number, patch: Partial<LineItemInput>) => void;
  onAdd: () => void;
};

export function InvoiceLineItems({ items, onChange, onAdd }: InvoiceLineItemsProps) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Label>Line items</Label>
        <Button type="button" variant="ghost" size="sm" onClick={onAdd}>
          + Add line
        </Button>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-4">
            <Input
              placeholder="Description"
              value={item.description}
              onChange={(e) => onChange(index, { description: e.target.value })}
              className="sm:col-span-2"
            />
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="Qty"
              value={item.quantity}
              onChange={(e) => onChange(index, { quantity: Number(e.target.value) })}
            />
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="Rate"
              value={item.unitPrice}
              onChange={(e) => onChange(index, { unitPrice: Number(e.target.value) })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
