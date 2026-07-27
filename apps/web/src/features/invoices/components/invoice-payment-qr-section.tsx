"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ExternalLinkIcon, Loader2Icon, QrCodeIcon, Trash2Icon } from "lucide-react";
import { QRCode } from "react-qrcode-logo";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CompanyPaymentMethod } from "@/lib/company-payment-methods";
import { isPaymentLinkUrl } from "@/lib/company-payment-methods";

type PaymentQrState = {
  qrCode: { id: string; token: string; name: string; status: string };
  paymentUrl: string;
  scanUrl: string;
  label: string;
} | null;

type InvoicePaymentQrSectionProps = {
  invoiceId: string;
  invoiceNumber: string;
  initialPaymentQr: PaymentQrState;
  paymentLinkMethods: CompanyPaymentMethod[];
};

export function InvoicePaymentQrSection({
  invoiceId,
  invoiceNumber,
  initialPaymentQr,
  paymentLinkMethods,
}: InvoicePaymentQrSectionProps) {
  const router = useRouter();
  const [paymentQr, setPaymentQr] = useState(initialPaymentQr);
  const [selectedKey, setSelectedKey] = useState(
    paymentLinkMethods[0] ? `0:${paymentLinkMethods[0].label}` : "custom",
  );
  const [customUrl, setCustomUrl] = useState(initialPaymentQr?.paymentUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const selectItems = useMemo(
    () => [
      ...paymentLinkMethods.map((method, index) => ({
        value: `${index}:${method.label}`,
        label: method.label,
      })),
      { value: "custom", label: "Custom URL…" },
    ],
    [paymentLinkMethods],
  );

  const selectedMethod = useMemo(() => {
    if (selectedKey === "custom") return null;
    const index = Number(selectedKey.split(":")[0]);
    return paymentLinkMethods[index] ?? null;
  }, [paymentLinkMethods, selectedKey]);

  const draftUrl = selectedMethod?.value?.trim() || customUrl.trim();

  async function handleSave() {
    if (!isPaymentLinkUrl(draftUrl)) {
      toast.error("Enter a valid payment link starting with https://");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/payment-qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentUrl: draftUrl,
          methodLabel: selectedMethod?.label,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not create payment QR");

      setPaymentQr(body.paymentQr);
      toast.success(
        paymentQr
          ? "Payment QR updated — it will appear on the invoice PDF"
          : "Payment QR created — clients can scan to open your payment link",
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create payment QR");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/payment-qr`, {
        method: "DELETE",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not remove payment QR");

      setPaymentQr(null);
      toast.success("Payment QR removed from this invoice");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove payment QR");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCodeIcon className="size-4" />
          Scan to pay
        </CardTitle>
        <CardDescription>
          Attach your own payment link (PayPal.me, Stripe Payment Link, Venmo, etc.) as a QR
          for invoice {invoiceNumber}. Scans open your link — we don’t process the payment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {paymentQr ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="shrink-0 rounded-lg border bg-white p-2">
              <QRCode value={paymentQr.scanUrl} size={128} quietZone={8} ecLevel="M" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-sm font-medium">{paymentQr.label}</p>
                <p className="mt-1 break-all text-sm text-muted-foreground">
                  Pays via: {paymentQr.paymentUrl}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Printed QR opens a short Easy-invoice link that redirects to your payment URL
                  (editable later without reprinting).
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" render={<Link href={`/qr-codes/${paymentQr.qrCode.id}/edit`} />}>
                  Edit QR design
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  render={<a href={paymentQr.paymentUrl} target="_blank" rel="noreferrer" />}
                >
                  <ExternalLinkIcon className="size-4" />
                  Open payment link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleRemove()}
                  disabled={removing}
                >
                  {removing ? <Loader2Icon className="size-4 animate-spin" /> : <Trash2Icon className="size-4" />}
                  Remove
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-sm font-medium">
            {paymentQr ? "Change payment link" : "Create payment QR"}
          </p>

          {paymentLinkMethods.length > 0 ? (
            <div className="space-y-2">
              <Label>From company payment info</Label>
              <Select
                items={selectItems}
                value={selectedKey}
                onValueChange={(value) => value && setSelectedKey(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a payment link" />
                </SelectTrigger>
                <SelectContent>
                  {selectItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No payment links in company settings yet. Paste any https link below, or add one under
              Settings → Payment information (e.g. “Payment link”).
            </p>
          )}

          {(selectedKey === "custom" || paymentLinkMethods.length === 0) && (
            <div className="space-y-2">
              <Label htmlFor="invoice-payment-url">Payment link URL</Label>
              <Input
                id="invoice-payment-url"
                type="url"
                value={customUrl}
                onChange={(event) => setCustomUrl(event.target.value)}
                placeholder="https://paypal.me/yourbusiness"
              />
            </div>
          )}

          {selectedMethod ? (
            <p className="break-all text-xs text-muted-foreground">{selectedMethod.value}</p>
          ) : null}

          <Button onClick={() => void handleSave()} disabled={saving || !draftUrl}>
            {saving ? (
              <>
                <Loader2Icon className="animate-spin" />
                Saving…
              </>
            ) : paymentQr ? (
              "Update payment QR"
            ) : (
              "Create payment QR"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
