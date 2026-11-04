"use client";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductLibraryPicker } from "@/features/products/components/product-library-picker";
import type { LineItemInput } from "@/features/invoices/components/invoice-line-items";

type AddFromLibraryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  onAdd: (items: LineItemInput[]) => void;
};

export function AddFromLibraryDialog({
  open,
  onOpenChange,
  currency,
  onAdd,
}: AddFromLibraryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add from library</DialogTitle>
          <DialogDescription>
            Choose saved products or services to insert as line items.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <DialogBody>
            <ProductLibraryPicker
              currency={currency}
              showCatalogLink
              onCancel={() => onOpenChange(false)}
              onAdd={(items) => {
                onAdd(items);
                onOpenChange(false);
              }}
            />
          </DialogBody>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
