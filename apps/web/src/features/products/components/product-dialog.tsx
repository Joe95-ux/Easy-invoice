"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SerializedProduct } from "@/lib/products";

type ProductDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: SerializedProduct | null;
  currency: string;
  onSaved: (product: SerializedProduct) => void;
};

function firstValidationMessage(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const fieldErrors = (details as { fieldErrors?: Record<string, string[] | undefined> })
    .fieldErrors;
  if (!fieldErrors) return null;
  for (const messages of Object.values(fieldErrors)) {
    if (messages?.[0]) return messages[0];
  }
  return null;
}

export function ProductDialog({
  open,
  onOpenChange,
  product,
  currency,
  onSaved,
}: ProductDialogProps) {
  const isEdit = Boolean(product);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unitPrice, setUnitPrice] = useState("0");
  const [defaultQuantity, setDefaultQuantity] = useState("1");
  const [unit, setUnit] = useState("");
  const [saving, setSaving] = useState(false);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setName(product?.name ?? "");
      setDescription(product?.description ?? "");
      setUnitPrice(product ? String(product.unitPrice) : "0");
      setDefaultQuantity(product ? String(product.defaultQuantity) : "1");
      setUnit(product?.unit ?? "");
    }
    wasOpen.current = open;
  }, [open, product]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Add a name");
      return;
    }

    const parsedPrice = Number(unitPrice);
    const parsedQty = Number(defaultQuantity);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      toast.error("Enter a valid unit price");
      return;
    }
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      toast.error("Quantity must be greater than zero");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        unitPrice: parsedPrice,
        defaultQuantity: parsedQty,
        unit: unit.trim() || null,
      };
      const res = await fetch(isEdit ? `/api/products/${product!.id}` : "/api/products", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          firstValidationMessage(data.details) ??
            data.error ??
            (isEdit ? "Could not update product" : "Could not create product"),
        );
      }
      onSaved(data.product as SerializedProduct);
      onOpenChange(false);
      toast.success(isEdit ? "Product updated" : "Product added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={(event) => void handleSubmit(event)}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit product" : "Add product"}</DialogTitle>
            <DialogDescription>
              Save a product or service to reuse on invoices and estimates.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="product-name">Name</Label>
              <Input
                id="product-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Website design"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product-description">Description</Label>
              <Textarea
                id="product-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional line-item text (uses name if empty)"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="product-price">Unit price ({currency})</Label>
                <Input
                  id="product-price"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={unitPrice}
                  onChange={(event) => setUnitPrice(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="product-qty">Default qty</Label>
                <Input
                  id="product-qty"
                  type="number"
                  min={0.0001}
                  step="any"
                  inputMode="decimal"
                  value={defaultQuantity}
                  onChange={(event) => setDefaultQuantity(event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product-unit">Unit</Label>
              <Input
                id="product-unit"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                placeholder="hour, each, project…"
              />
              <p className="text-xs text-muted-foreground">
                Shown on the invoice line when useful, e.g. “Consulting (hour)”.
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
              {isEdit ? "Save changes" : "Add product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
