"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BanknoteIcon,
  DownloadIcon,
  Loader2Icon,
  MailIcon,
  MoreHorizontalIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InvoiceStatus, PaymentMethod, ReminderDeliveryStatus } from "@easy-invoice/db";
import { formatDate, formatDateTime, formatMoney } from "@/lib/invoices";
import { PAYMENT_METHOD_LABELS } from "@/lib/invoice-payments-utils";
import { downloadReceiptPdf } from "@/lib/receipt-pdf-client";
import { RecordPaymentDialog } from "@/features/invoices/components/record-payment-dialog";

type InstallmentRow = {
  id: string;
  dueDate: string;
  amount: number;
  label: string | null;
  paidAmount: number;
  balanceDue: number;
  isPaid: boolean;
  isOverdue: boolean;
};

type ConfirmationEmailRow = {
  id: string;
  toEmail: string;
  isResend: boolean;
  status: ReminderDeliveryStatus;
  error: string | null;
  createdAt: string;
};

type PaymentRow = {
  id: string;
  amount: number;
  paidAt: string;
  method: PaymentMethod;
  reference: string | null;
  note: string | null;
  receiptNumber: string | null;
  confirmationEmails: ConfirmationEmailRow[];
};

type InvoicePaymentsSectionProps = {
  invoiceId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  currency: string;
  total: number;
  amountPaid: number;
  balanceDue: number;
  clientEmail?: string | null;
  installments: InstallmentRow[];
  payments: PaymentRow[];
  celebrateInvoicePaid?: boolean;
};

export function InvoicePaymentsSection({
  invoiceId,
  invoiceNumber,
  status,
  currency,
  total,
  amountPaid,
  balanceDue,
  clientEmail,
  installments,
  payments,
  celebrateInvoicePaid = false,
}: InvoicePaymentsSectionProps) {
  const router = useRouter();
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordInitialAmount, setRecordInitialAmount] = useState<number | undefined>(undefined);
  const [sendOpen, setSendOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(clientEmail ?? "");
  const [message, setMessage] = useState("");
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);
  const [resendOpen, setResendOpen] = useState(false);
  const [resendPayment, setResendPayment] = useState<PaymentRow | null>(null);
  const [resendEmail, setResendEmail] = useState(clientEmail ?? "");
  const [resending, setResending] = useState(false);
  const [deletePayment, setDeletePayment] = useState<PaymentRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmationLog = payments.flatMap((payment) =>
    payment.confirmationEmails.map((confirmation) => ({
      ...confirmation,
      paymentId: payment.id,
      receiptNumber: payment.receiptNumber,
    })),
  );
  confirmationLog.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const canRecord =
    status !== "DRAFT" && status !== "CANCELLED" && status !== "PAID" && balanceDue > 0.001;
  const canSendUpdate =
    status !== "DRAFT" && status !== "CANCELLED" && amountPaid > 0.001;

  function openRecordDialog(presetAmount?: number) {
    setRecordInitialAmount(presetAmount);
    setRecordOpen(true);
  }

  async function handleDeletePayment() {
    if (!deletePayment) return;

    setDeleting(true);
    try {
      const response = await fetch(
        `/api/invoices/${invoiceId}/payments/${deletePayment.id}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to delete payment");

      toast.success("Payment deleted", {
        description: `${formatMoney(deletePayment.amount, currency)} removed from ${invoiceNumber}. The invoice status and balance were recalculated.`,
      });
      setDeletePayment(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete payment");
    } finally {
      setDeleting(false);
    }
  }

  async function handleDownloadReceipt(payment: PaymentRow) {
    if (!payment.receiptNumber) return;

    setDownloadingReceiptId(payment.id);
    try {
      await downloadReceiptPdf(invoiceId, payment.id, payment.receiptNumber);
    } finally {
      setDownloadingReceiptId(null);
    }
  }

  function openResendDialog(payment: PaymentRow) {
    setResendPayment(payment);
    setResendEmail(clientEmail ?? "");
    setResendOpen(true);
  }

  async function handleResendConfirmation() {
    if (!resendPayment) return;

    setResending(true);
    try {
      const response = await fetch(
        `/api/invoices/${invoiceId}/payments/${resendPayment.id}/resend-confirmation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: resendEmail || undefined }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to resend confirmation");

      toast.success(`Payment confirmation resent to ${data.toEmail}`);
      setResendOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resend confirmation");
    } finally {
      setResending(false);
    }
  }

  async function handleSendUpdate() {
    setLoading(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email || undefined,
          message: message.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to send invoice");

      toast.success(`Updated invoice sent to ${email}`);
      setSendOpen(false);
      setMessage("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send invoice");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card className="mt-6">
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BanknoteIcon className="size-4 text-muted-foreground" />
              Payments
            </CardTitle>
            <CardDescription>
              Record partial payments and send updated statements to your client.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {canRecord && (
              <Button type="button" size="sm" onClick={() => openRecordDialog()}>
                Record payment
              </Button>
            )}
            {canSendUpdate && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setEmail(clientEmail ?? "");
                  setMessage("");
                  setSendOpen(true);
                }}
              >
                <SendIcon className="size-4" />
                Send update
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Invoice total</p>
              <p className="text-lg font-semibold">{formatMoney(total, currency)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Amount paid</p>
              <p className="text-lg font-semibold text-success">{formatMoney(amountPaid, currency)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Balance due</p>
              <p className="text-lg font-semibold">{formatMoney(balanceDue, currency)}</p>
            </div>
          </div>

          {installments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Payment schedule</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Due date</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installments.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{formatDate(row.dueDate)}</TableCell>
                      <TableCell>{row.label ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        {formatMoney(row.amount, currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.isPaid ? (
                          <Badge variant="success">Paid</Badge>
                        ) : row.isOverdue ? (
                          <Badge variant="destructive">Overdue</Badge>
                        ) : (
                          <Badge variant="outline">
                            {formatMoney(row.balanceDue, currency)} due
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {canRecord && !row.isPaid && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openRecordDialog(row.balanceDue)}
                          >
                            Record
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {payments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Payment history</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Confirmation</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => {
                    const lastConfirmation = payment.confirmationEmails[0];

                    return (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDate(payment.paidAt)}</TableCell>
                      <TableCell className="font-medium">
                        {payment.receiptNumber ?? "—"}
                      </TableCell>
                      <TableCell>{PAYMENT_METHOD_LABELS[payment.method]}</TableCell>
                      <TableCell>{payment.reference ?? payment.note ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        {formatMoney(payment.amount, currency)}
                      </TableCell>
                      <TableCell>
                        {lastConfirmation ? (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">
                              {lastConfirmation.isResend ? "Resent" : "Sent"}{" "}
                              {formatDateTime(lastConfirmation.createdAt)}
                            </p>
                            <p className="text-xs">{lastConfirmation.toEmail}</p>
                            {lastConfirmation.status === "FAILED" && (
                              <Badge variant="destructive" className="text-[10px]">
                                Failed
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not sent</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Payment actions${payment.receiptNumber ? ` for ${payment.receiptNumber}` : ""}`}
                              />
                            }
                          >
                            {downloadingReceiptId === payment.id ? (
                              <Loader2Icon className="size-4 animate-spin" />
                            ) : (
                              <MoreHorizontalIcon className="size-4" />
                            )}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-52">
                            {payment.receiptNumber && status !== "DRAFT" && (
                              <DropdownMenuItem
                                disabled={resending}
                                onClick={() => openResendDialog(payment)}
                              >
                                <MailIcon className="size-4" />
                                Resend confirmation
                              </DropdownMenuItem>
                            )}
                            {payment.receiptNumber && (
                              <DropdownMenuItem
                                disabled={downloadingReceiptId === payment.id}
                                onClick={() => void handleDownloadReceipt(payment)}
                              >
                                <DownloadIcon className="size-4" />
                                Download receipt
                              </DropdownMenuItem>
                            )}
                            {payment.receiptNumber && <DropdownMenuSeparator />}
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={deleting}
                              onClick={() => setDeletePayment(payment)}
                            >
                              <Trash2Icon className="size-4" />
                              Delete payment
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {confirmationLog.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Confirmation email log</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {confirmationLog.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                      <TableCell>{row.receiptNumber ?? "—"}</TableCell>
                      <TableCell>{row.toEmail}</TableCell>
                      <TableCell>{row.isResend ? "Resend" : "Initial"}</TableCell>
                      <TableCell>
                        {row.status === "FAILED" ? (
                          <span className="text-destructive" title={row.error ?? undefined}>
                            Failed
                          </span>
                        ) : (
                          <Badge variant="success">Sent</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {payments.length === 0 && installments.length === 0 && status === "DRAFT" && (
            <p className="text-sm text-muted-foreground">
              Mark this invoice as sent (or email it) to start recording payments. Use{" "}
              <span className="font-medium text-foreground">Mark as sent</span> when you deliver
              outside Invoice Desk. Add a payment schedule while editing the draft if you need
              multiple due dates.
            </p>
          )}
        </CardContent>
      </Card>

      <RecordPaymentDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        invoiceId={invoiceId}
        invoiceNumber={invoiceNumber}
        status={status}
        currency={currency}
        balanceDue={balanceDue}
        initialAmount={recordInitialAmount}
        celebrateInvoicePaid={celebrateInvoicePaid}
      />

      <AlertDialog
        open={deletePayment !== null}
        onOpenChange={(open) => {
          if (!open) setDeletePayment(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the {deletePayment ? formatMoney(deletePayment.amount, currency) : ""}{" "}
              payment
              {deletePayment?.receiptNumber ? ` (receipt ${deletePayment.receiptNumber})` : ""} from{" "}
              {invoiceNumber} and recalculates the balance and status. Use this to reverse a payment
              recorded by mistake. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeletePayment()} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete payment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send updated invoice</DialogTitle>
            <DialogDescription>
              Email an updated PDF showing payments received and the remaining balance. This does
              not change the client&apos;s email on file.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="update-client-email">Recipient email</Label>
              <Input
                id="update-client-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="update-invoice-message">Personal message (optional)</Label>
              <Textarea
                id="update-invoice-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a short note for your client…"
                rows={3}
                maxLength={2000}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={() => void handleSendUpdate()} disabled={!email || loading}>
              {loading && <Loader2Icon className="size-4 animate-spin" />}
              Send update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resendOpen} onOpenChange={setResendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resend payment confirmation</DialogTitle>
            <DialogDescription>
              Email the receipt PDF and updated invoice again for receipt{" "}
              {resendPayment?.receiptNumber ?? ""}. This action is logged for your team.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-2">
            <Label htmlFor="resend-confirmation-email">Client email</Label>
            <Input
              id="resend-confirmation-email"
              type="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResendOpen(false)} disabled={resending}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleResendConfirmation()}
              disabled={!resendEmail || resending}
            >
              {resending && <Loader2Icon className="size-4 animate-spin" />}
              Resend confirmation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
