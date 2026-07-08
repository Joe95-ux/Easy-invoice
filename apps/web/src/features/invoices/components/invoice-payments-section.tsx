"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BanknoteIcon, DownloadIcon, Loader2Icon, MailIcon, SendIcon } from "lucide-react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { showPaymentRecordedFeedback } from "@/lib/celebrate-invoice-paid";

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

const METHOD_OPTIONS = Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][];

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
  const [sendOpen, setSendOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<PaymentMethod>("OTHER");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [email, setEmail] = useState(clientEmail ?? "");
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);
  const [resendOpen, setResendOpen] = useState(false);
  const [resendPayment, setResendPayment] = useState<PaymentRow | null>(null);
  const [resendEmail, setResendEmail] = useState(clientEmail ?? "");
  const [resending, setResending] = useState(false);

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
    setAmount(presetAmount ? String(presetAmount) : String(balanceDue));
    setPaidAt(new Date().toISOString().slice(0, 10));
    setMethod("OTHER");
    setReference("");
    setNote("");
    setRecordOpen(true);
  }

  async function handleRecordPayment() {
    setLoading(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          paidAt: new Date(paidAt).toISOString(),
          method,
          reference: reference || undefined,
          note: note || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to record payment");

      showPaymentRecordedFeedback({
        invoiceNumber,
        status: data.invoice?.status ?? status,
        celebrateInvoicePaid,
      });

      if (data.confirmationEmail?.sent) {
        toast.success("Payment confirmation emailed", {
          description: `Receipt and updated invoice sent to ${data.confirmationEmail.toEmail}.`,
        });
      } else if (data.confirmationEmail?.error) {
        toast.warning("Payment recorded, but confirmation email failed", {
          description: data.confirmationEmail.error,
        });
      }

      setRecordOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record payment");
    } finally {
      setLoading(false);
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
        body: JSON.stringify({ email: email || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to send invoice");

      toast.success(`Updated invoice sent to ${email}`);
      setSendOpen(false);
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
                        <div className="flex items-center justify-end gap-1">
                          {payment.receiptNumber && status !== "DRAFT" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Resend confirmation for ${payment.receiptNumber}`}
                              title="Resend payment confirmation"
                              disabled={resending}
                              onClick={() => openResendDialog(payment)}
                            >
                              <MailIcon className="size-4" />
                            </Button>
                          )}
                          {payment.receiptNumber && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Download receipt ${payment.receiptNumber}`}
                              disabled={downloadingReceiptId === payment.id}
                              onClick={() => void handleDownloadReceipt(payment)}
                            >
                              {downloadingReceiptId === payment.id ? (
                                <Loader2Icon className="size-4 animate-spin" />
                              ) : (
                                <DownloadIcon className="size-4" />
                              )}
                            </Button>
                          )}
                        </div>
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
              Send this invoice to start recording payments. Add a payment schedule while editing
              the draft if you need multiple due dates.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={recordOpen} onOpenChange={setRecordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              Record a payment for {invoiceNumber}. Balance due: {formatMoney(balanceDue, currency)}.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Amount</Label>
              <Input
                id="payment-amount"
                type="number"
                min={0}
                step="0.01"
                max={balanceDue}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-date">Payment date</Label>
              <Input
                id="payment-date"
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select
                value={method}
                onValueChange={(value) => value && setMethod(value as PaymentMethod)}
                items={METHOD_OPTIONS.map(([value, label]) => ({ value, label }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHOD_OPTIONS.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-reference">Reference</Label>
              <Input
                id="payment-reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Check #, transaction ID, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-note">Note</Label>
              <Input
                id="payment-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleRecordPayment()}
              disabled={loading || !amount || Number(amount) <= 0}
            >
              {loading && <Loader2Icon className="size-4 animate-spin" />}
              Record payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send updated invoice</DialogTitle>
            <DialogDescription>
              Email an updated PDF showing payments received and the remaining balance.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-2">
            <Label htmlFor="update-client-email">Client email</Label>
            <Input
              id="update-client-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
            />
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
