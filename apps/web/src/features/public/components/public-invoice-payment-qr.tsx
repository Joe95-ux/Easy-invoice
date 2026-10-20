import { ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type PublicInvoicePaymentQrProps = {
  imageDataUrl: string;
  paymentUrl: string;
  label?: string | null;
};

export function PublicInvoicePaymentQr({
  imageDataUrl,
  paymentUrl,
  label,
}: PublicInvoicePaymentQrProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-5 sm:flex-row sm:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageDataUrl}
          alt="Scan to pay"
          className="size-36 shrink-0 rounded-lg border bg-white object-contain p-1"
        />
        <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
          <p className="text-sm font-semibold">Scan to pay</p>
          <p className="text-sm text-muted-foreground">
            {label?.trim() || "Open the payment link with your phone camera."}
          </p>
          <Button
            variant="outline"
            size="sm"
            render={<a href={paymentUrl} target="_blank" rel="noreferrer" />}
          >
            <ExternalLinkIcon className="size-4" />
            Open payment link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
