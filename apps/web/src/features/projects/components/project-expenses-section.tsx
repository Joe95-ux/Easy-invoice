"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  ReceiptIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  ProjectExpenseDialog,
  type ProjectExpenseRow,
} from "@/features/projects/components/project-expense-dialog";
import { SectionInfoPopover } from "@/features/projects/components/section-info-popover";
import { formatDate, formatMoney } from "@/lib/invoices";

const EXPENSES_DESCRIPTION =
  "Job costs used for profit and margin. Billable items can be passed through on invoices later.";

type ProjectExpensesSectionProps = {
  projectId: string;
  currency: string;
  expenses: ProjectExpenseRow[];
};

export function ProjectExpensesSection({
  projectId,
  currency,
  expenses: initialExpenses,
}: ProjectExpensesSectionProps) {
  const router = useRouter();
  const [expenses, setExpenses] = useState(initialExpenses);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectExpenseRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProjectExpenseRow | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setExpenses(initialExpenses);
  }, [initialExpenses]);

  function upsertExpense(expense: ProjectExpenseRow) {
    setExpenses((prev) => {
      const exists = prev.some((row) => row.id === expense.id);
      if (!exists) return [expense, ...prev];
      return prev.map((row) => (row.id === expense.id ? expense : row));
    });
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/expenses/${pendingDelete.id}`,
        { method: "DELETE" },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Failed to delete");
      setExpenses((prev) => prev.filter((row) => row.id !== pendingDelete.id));
      setPendingDelete(null);
      toast.success("Expense deleted");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete expense");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card className="overflow-hidden py-0">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b py-4">
          <div className="min-w-0 space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptIcon className="size-4 shrink-0" />
              Expenses
              <span className="lg:hidden">
                <SectionInfoPopover label="About expenses">
                  {EXPENSES_DESCRIPTION}
                </SectionInfoPopover>
              </span>
            </CardTitle>
            <CardDescription className="hidden lg:block">{EXPENSES_DESCRIPTION}</CardDescription>
          </div>
          <Button
            size="sm"
            className="shrink-0"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <PlusIcon className="size-4" />
            Add expense
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {expenses.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No expenses yet. Add contractor fees, tools, or materials for this job.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(expense.date)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{expense.description}</div>
                      {expense.invoiceId ? (
                        <Link
                          href={`/invoices/${expense.invoiceId}`}
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          {expense.invoiceNumber
                            ? `Invoice ${expense.invoiceNumber}`
                            : "Invoiced"}
                        </Link>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {expense.invoicedAt ? (
                        <Badge variant="success">Invoiced</Badge>
                      ) : expense.billable ? (
                        <Badge variant="info">Billable</Badge>
                      ) : (
                        <Badge variant="secondary">Cost</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(expense.amount, expense.currency || currency)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Expense actions"
                        >
                          <MoreHorizontalIcon className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(expense);
                              setDialogOpen(true);
                            }}
                          >
                            <PencilIcon className="size-4" />
                            Edit
                          </DropdownMenuItem>
                          {!expense.invoicedAt ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setPendingDelete(expense)}
                              >
                                <Trash2Icon className="size-4" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ProjectExpenseDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        projectId={projectId}
        currency={currency}
        expense={editing}
        onSaved={(expense) => {
          upsertExpense(expense);
          router.refresh();
        }}
      />

      <ConfirmActionDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open && !busy) setPendingDelete(null);
        }}
        title="Delete expense?"
        description={
          <>
            Permanently delete{" "}
            <span className="font-medium text-foreground">
              {pendingDelete?.description ?? "this expense"}
            </span>
            . This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        confirmingLabel="Deleting..."
        confirming={busy}
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}
