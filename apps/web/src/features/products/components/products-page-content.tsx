"use client";

import { useState } from "react";
import {
  MoreHorizontalIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";
import { SortableTableHead } from "@/components/data-table/sortable-table-head";
import { TablePagination } from "@/components/data-table/table-pagination";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductDialog } from "@/features/products/components/product-dialog";
import { useListTable } from "@/hooks/use-list-table";
import { formatMoney } from "@/lib/invoices";
import type { SerializedProduct } from "@/lib/products";
import { cn } from "@/lib/utils";

type ProductsPageContentProps = {
  initialProducts: SerializedProduct[];
  currency: string;
};

export function ProductsPageContent({
  initialProducts,
  currency,
}: ProductsPageContentProps) {
  const [products, setProducts] = useState(initialProducts);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SerializedProduct | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SerializedProduct | null>(null);
  const [deleting, setDeleting] = useState(false);

  const table = useListTable<SerializedProduct>({
    tableId: "products",
    data: products,
    searchKeys: ["name", "description", "unit"],
    defaultSortKey: "name",
    defaultSortDirection: "asc",
    getSortValue: (row, key) => {
      if (key === "unitPrice") return row.unitPrice;
      if (key === "defaultQuantity") return row.defaultQuantity;
      if (key === "name" || key === "unit") return row[key] ?? "";
      return row[key as keyof SerializedProduct];
    },
  });

  const empty = products.length === 0;

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(product: SerializedProduct) {
    setEditing(product);
    setDialogOpen(true);
  }

  function handleSaved(product: SerializedProduct) {
    setProducts((prev) => {
      const exists = prev.some((item) => item.id === product.id);
      if (exists) {
        return prev.map((item) => (item.id === product.id ? product : item));
      }
      return [...prev, product];
    });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${pendingDelete.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Delete failed");
      }
      setProducts((prev) => prev.filter((item) => item.id !== pendingDelete.id));
      setPendingDelete(null);
      toast.success("Product removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete product");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Products"
        description="Reusable products and services for faster invoicing."
        actions={
          <Button className={pageHeaderActionClass} onClick={openCreate}>
            <PlusIcon className="size-4" />
            Add product
          </Button>
        }
      />

      {empty ? (
        <EmptyState
          icon={PackageIcon}
          title="No products yet"
          description="Save products or services once, then add them to invoices and estimates in one click."
          action={
            <Button onClick={openCreate}>
              <PlusIcon className="size-4" />
              Add your first product
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <div>
            <TableToolbar
              search={table.searchQuery}
              onSearchChange={table.setSearchQuery}
              searchPlaceholder="Search products..."
            />

            <Table stickyColumnWidths={["5.5rem", "8rem"]}>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    label="Name"
                    column="name"
                    sortKey={table.sortKey}
                    sortDirection={table.sortDirection}
                    onSort={table.toggleSort}
                  />
                  <SortableTableHead
                    label="Price"
                    column="unitPrice"
                    sortKey={table.sortKey}
                    sortDirection={table.sortDirection}
                    onSort={table.toggleSort}
                    className="w-32 text-right [&_button]:ml-auto"
                  />
                  <SortableTableHead
                    label="Qty"
                    column="defaultQuantity"
                    sortKey={table.sortKey}
                    sortDirection={table.sortDirection}
                    onSort={table.toggleSort}
                    className="w-24 text-right [&_button]:ml-auto"
                  />
                  <TableHead className="w-28">Unit</TableHead>
                  <TableHead className="w-14 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      {table.hasActiveFilters
                        ? "No products match your search."
                        : "No products."}
                    </TableCell>
                  </TableRow>
                ) : (
                  table.pageRows.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => openEdit(product)}
                          className="cursor-pointer text-left"
                        >
                          <p className="font-medium hover:underline">{product.name}</p>
                          {product.description ? (
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                              {product.description}
                            </p>
                          ) : null}
                        </button>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(product.unitPrice, currency)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {product.defaultQuantity}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.unit || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className={cn(
                              "inline-flex size-8 cursor-pointer items-center justify-center rounded-[10px] border border-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                            )}
                            aria-label="Product actions"
                          >
                            <MoreHorizontalIcon className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(product)}>
                              <PencilIcon className="size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setPendingDelete(product)}
                            >
                              <Trash2Icon className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <TablePagination
              page={table.page}
              pageCount={table.pageCount}
              pageSize={table.pageSize}
              pageSizeOptions={table.pageSizeOptions}
              totalCount={table.totalCount}
              rangeStart={table.rangeStart}
              rangeEnd={table.rangeEnd}
              onPageChange={table.setPage}
              onPageSizeChange={table.setPageSize}
            />
          </div>
        </Card>
      )}

      <ProductDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        product={editing}
        currency={currency}
        onSaved={handleSaved}
      />

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete
              {pendingDelete ? (
                <>
                  {" "}
                  <span className="font-medium text-foreground">
                    “{pendingDelete.name}”
                  </span>
                </>
              ) : null}
              . Existing invoices are unchanged. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
