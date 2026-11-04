"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2Icon, PackageIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { LineItemInput } from "@/features/invoices/components/invoice-line-items";
import { formatMoney } from "@/lib/invoices";
import {
  productLineDescription,
  type SerializedProduct,
} from "@/lib/products";
import { cn } from "@/lib/utils";

type ProductLibraryPickerProps = {
  currency: string;
  onAdd: (items: LineItemInput[]) => void;
  onCancel: () => void;
  /** Link out to /products. Hide inside drawers so unsaved schedule edits are not lost. */
  showCatalogLink?: boolean;
};

export function ProductLibraryPicker({
  currency,
  onAdd,
  onCancel,
  showCatalogLink = true,
}: ProductLibraryPickerProps) {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<SerializedProduct[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    void fetch("/api/products", { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Could not load products");
        setProducts((data.products as SerializedProduct[]) ?? []);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        toast.error(error instanceof Error ? error.message : "Could not load products");
        setProducts([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(q) ||
        product.description?.toLowerCase().includes(q) ||
        product.unit?.toLowerCase().includes(q) ||
        product.sku?.toLowerCase().includes(q),
    );
  }, [products, query]);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAdd() {
    const selected = products.filter((product) => selectedIds.has(product.id));
    if (selected.length === 0) {
      toast.error("Select at least one product");
      return;
    }

    onAdd(
      selected.map((product) => ({
        description: productLineDescription(product),
        quantity: product.defaultQuantity,
        unitPrice: product.unitPrice,
        taxable: product.taxable !== false,
      })),
    );
    toast.success(
      selected.length === 1
        ? "Added 1 item to line items"
        : `Added ${selected.length} items to line items`,
    );
  }

  return (
    <div className="grid gap-3">
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2Icon className="size-5 animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <PackageIcon className="size-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">No active products</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Save products in your library, then add them here. Archived items stay out of this list.
            </p>
          </div>
          {showCatalogLink ? (
            <Button variant="outline" size="sm" render={<Link href="/products" />}>
              Open products
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products..."
            aria-label="Search products"
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
          />
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border p-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                No products match your search.
              </p>
            ) : (
              filtered.map((product) => {
                const checked = selectedIds.has(product.id);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => toggle(product.id)}
                    aria-pressed={checked}
                    className={cn(
                      "flex w-full cursor-pointer items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                      checked ? "bg-primary/5" : "hover:bg-muted/60",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      className="pointer-events-none mt-0.5"
                      tabIndex={-1}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium">{product.name}</p>
                        <p className="shrink-0 text-sm tabular-nums">
                          {formatMoney(product.unitPrice, currency)}
                        </p>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {product.sku ? `${product.sku} · ` : ""}
                        Qty {product.defaultQuantity}
                        {product.unit ? ` · ${product.unit}` : ""}
                        {product.taxable === false ? " · Not taxed" : ""}
                        {product.description ? ` · ${product.description}` : ""}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={loading || selectedIds.size === 0}
          onClick={handleAdd}
        >
          Add selected
          {selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
        </Button>
      </div>
    </div>
  );
}
