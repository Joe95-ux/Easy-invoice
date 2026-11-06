"use client";

import { useMemo, useState } from "react";
import {
  ArchiveIcon,
  DownloadIcon,
  MoreHorizontalIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
  UploadIcon,
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
import { ImportProductsDialog } from "@/features/products/components/import-products-dialog";
import { ProductDialog } from "@/features/products/components/product-dialog";
import { downloadProductsCsv } from "@/features/products/lib/export-products-csv";
import { useListTable } from "@/hooks/use-list-table";
import { formatMoney } from "@/lib/invoices";
import type { SerializedProduct } from "@/lib/products";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

type ProductsPageContentProps = {
  initialProducts: SerializedProduct[];
  currency: string;
  canWrite?: boolean;
};

export function ProductsPageContent({
  initialProducts,
  currency,
  canWrite = true,
}: ProductsPageContentProps) {
  const [products, setProducts] = useState(initialProducts);
  const [statusFilter, setStatusFilter] = useState("active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SerializedProduct | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SerializedProduct | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const visible = useMemo(
    () =>
      products.filter((product) =>
        statusFilter === "archived" ? product.archivedAt : !product.archivedAt,
      ),
    [products, statusFilter],
  );

  const table = useListTable<SerializedProduct>({
    tableId: "products",
    data: visible,
    searchKeys: ["name", "description", "unit", "sku"],
    defaultSortKey: "name",
    defaultSortDirection: "asc",
    getSortValue: (row, key) => {
      if (key === "unitPrice") return row.unitPrice;
      if (key === "defaultQuantity") return row.defaultQuantity;
      if (key === "taxable") return row.taxable ? 1 : 0;
      if (key === "name" || key === "unit" || key === "sku") return row[key] ?? "";
      return row[key as keyof SerializedProduct];
    },
  });

  const emptyLibrary = products.length === 0;
  const viewingArchived = statusFilter === "archived";

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

  function handleImported(created: SerializedProduct[]) {
    if (created.length === 0) return;
    setProducts((prev) => {
      const ids = new Set(prev.map((item) => item.id));
      return [...prev, ...created.filter((item) => !ids.has(item.id))];
    });
    setStatusFilter("active");
  }

  async function setArchived(product: SerializedProduct, archived: boolean) {
    setBusyId(product.id);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not update product");
      handleSaved(data.product as SerializedProduct);
      toast.success(archived ? "Product archived" : "Product restored");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update product");
    } finally {
      setBusyId(null);
    }
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
      toast.success("Product deleted");
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
          canWrite ? (
            <Button className={pageHeaderActionClass} onClick={openCreate}>
              <PlusIcon className="size-4" />
              Add product
            </Button>
          ) : undefined
        }
      />

      {emptyLibrary ? (
        <EmptyState
          icon={PackageIcon}
          title="No products yet"
          description="Save products or services once, then add them to invoices and estimates in one click."
          action={
            canWrite ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button onClick={openCreate}>
                  <PlusIcon className="size-4" />
                  Add your first product
                </Button>
                <Button variant="outline" onClick={() => setImportOpen(true)}>
                  <UploadIcon className="size-4" />
                  Import CSV
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <div>
            <TableToolbar
              search={table.searchQuery}
              onSearchChange={table.setSearchQuery}
              searchPlaceholder="Search products..."
              filter={statusFilter}
              onFilterChange={setStatusFilter}
              filterOptions={STATUS_FILTERS}
              filterLabel="Status"
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  {canWrite ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => setImportOpen(true)}
                    >
                      <UploadIcon className="size-4" />
                      Import
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    disabled={table.totalCount === 0}
                    onClick={() => downloadProductsCsv(table.rows)}
                  >
                    <DownloadIcon className="size-4" />
                    Export
                  </Button>
                </div>
              }
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
                    label="SKU"
                    column="sku"
                    sortKey={table.sortKey}
                    sortDirection={table.sortDirection}
                    onSort={table.toggleSort}
                    className="hidden w-28 md:table-cell"
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
                  <TableHead className="hidden w-24 sm:table-cell">Unit</TableHead>
                  <SortableTableHead
                    label="Tax"
                    column="taxable"
                    sortKey={table.sortKey}
                    sortDirection={table.sortDirection}
                    onSort={table.toggleSort}
                    className="hidden w-20 md:table-cell"
                  />
                  {canWrite ? (
                    <TableHead className="w-14 text-right">Actions</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={canWrite ? 7 : 6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {table.hasActiveFilters
                        ? "No products match your search."
                        : viewingArchived
                          ? "No archived products."
                          : "No products."}
                    </TableCell>
                  </TableRow>
                ) : (
                  table.pageRows.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        {canWrite && !product.archivedAt ? (
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
                        ) : (
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.description ? (
                              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                {product.description}
                              </p>
                            ) : null}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                        {product.sku || "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(product.unitPrice, currency)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {product.defaultQuantity}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {product.unit || "—"}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {product.taxable ? "Yes" : "No"}
                      </TableCell>
                      {canWrite ? (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className={cn(
                                "inline-flex size-8 cursor-pointer items-center justify-center rounded-[10px] border border-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                              )}
                              aria-label="Product actions"
                              disabled={busyId === product.id}
                            >
                              <MoreHorizontalIcon className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {product.archivedAt ? (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => void setArchived(product, false)}
                                  >
                                    <RotateCcwIcon className="size-4" />
                                    Restore
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => setPendingDelete(product)}
                                  >
                                    <Trash2Icon className="size-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <>
                                  <DropdownMenuItem onClick={() => openEdit(product)}>
                                    <PencilIcon className="size-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => void setArchived(product, true)}
                                  >
                                    <ArchiveIcon className="size-4" />
                                    Archive
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      ) : null}
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

      {canWrite ? (
        <>
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
          <ImportProductsDialog
            open={importOpen}
            onOpenChange={setImportOpen}
            onImported={handleImported}
          />
        </>
      ) : null}

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
