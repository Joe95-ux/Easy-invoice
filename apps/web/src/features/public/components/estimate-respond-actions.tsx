"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckIcon, PenLineIcon, XIcon } from "lucide-react";
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
import { SignaturePad } from "@/features/public/components/signature-pad";
import type { EstimateStatus } from "@easy-invoice/db";

type EstimateRespondActionsProps = {
  token: string;
  initialStatus: EstimateStatus;
  clientName?: string | null;
};

const RESPONDED: EstimateStatus[] = ["ACCEPTED", "DECLINED", "CANCELLED", "EXPIRED"];

export function EstimateRespondActions({
  token,
  initialStatus,
  clientName,
}: EstimateRespondActionsProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [signerName, setSignerName] = useState(clientName?.trim() ?? "");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  const canRespond = !RESPONDED.includes(status);

  async function decline() {
    setLoading("decline");
    try {
      const response = await fetch(`/api/public/estimates/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline" }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not submit response");
      }
      setStatus(data.estimate.status);
      toast.success("Estimate declined");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  async function accept() {
    const name = signerName.trim();
    if (name.length < 2) {
      toast.error("Enter your full name to sign");
      return;
    }
    setLoading("accept");
    try {
      const response = await fetch(`/api/public/estimates/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accept",
          signerName: name,
          signatureDataUrl: signatureDataUrl || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not submit response");
      }
      setStatus(data.estimate.status);
      setAcceptOpen(false);
      toast.success("Estimate signed and accepted", {
        description: "A confirmation email with your signed copy is on its way if an email is on file.",
      });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  if (!canRespond) {
    return (
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {status === "ACCEPTED" ? (
            <CheckIcon className="size-4" />
          ) : (
            <XIcon className="size-4" />
          )}
        </span>
        <p className="text-sm text-muted-foreground">
          {status === "ACCEPTED"
            ? "You signed and accepted this estimate. The sender has been notified, and a confirmation was emailed to you if an address is on file."
            : status === "DECLINED"
              ? "You declined this estimate."
              : "This estimate is no longer open for a response."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">Ready to move forward?</p>
          <p className="text-sm text-muted-foreground">
            Accept with an e-signature, or decline this estimate.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="cursor-pointer"
            onClick={() => setAcceptOpen(true)}
            disabled={loading !== null}
          >
            <PenLineIcon className="size-4" />
            Review &amp; sign
          </Button>
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => void decline()}
            disabled={loading !== null}
          >
            {loading === "decline" ? "Submitting…" : "Decline"}
          </Button>
        </div>
      </div>

      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sign to accept</DialogTitle>
            <DialogDescription>
              Type your name and optionally draw your signature. This creates a record of
              acceptance for the sender.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signer-name">Full name</Label>
              <Input
                id="signer-name"
                value={signerName}
                onChange={(event) => setSignerName(event.target.value)}
                placeholder="Jane Cooper"
                autoFocus
                maxLength={120}
                disabled={loading === "accept"}
              />
            </div>
            <div className="space-y-2">
              <Label>Signature (optional)</Label>
              <SignaturePad
                value={signatureDataUrl}
                onChange={setSignatureDataUrl}
                disabled={loading === "accept"}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              By signing, you confirm you accept this estimate on behalf of yourself or your
              organization.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setAcceptOpen(false)}
              disabled={loading === "accept"}
            >
              Cancel
            </Button>
            <Button
              className="cursor-pointer"
              onClick={() => void accept()}
              disabled={loading === "accept" || signerName.trim().length < 2}
            >
              {loading === "accept" ? "Signing…" : "Sign & accept"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
