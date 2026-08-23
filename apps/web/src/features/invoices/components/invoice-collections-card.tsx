"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BellRingIcon,
  CalendarPlusIcon,
  Loader2Icon,
  SendIcon,
  SparklesIcon,
  SplitIcon,
} from "lucide-react";
import { toast } from "sonner";
import { throwIfApiError, toastApiError } from "@/lib/billing/plan-api-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CollectionsAdvice } from "@/lib/collections/advice";
import { cn } from "@/lib/utils";

type InvoiceCollectionsCardProps = {
  invoiceId: string;
  advice: CollectionsAdvice;
  clientEmail?: string | null;
  canPayOnline: boolean;
  onDraftChase: () => void;
  onSendInvoice: () => void;
  onAddFollowUp: () => void;
  onShareLink: () => void;
  canRemind: boolean;
};

function urgencyVariant(
  urgency: CollectionsAdvice["urgency"],
): "secondary" | "warning" | "destructive" {
  if (urgency === "high") return "destructive";
  if (urgency === "medium") return "warning";
  return "secondary";
}

export function InvoiceCollectionsCard({
  invoiceId,
  advice,
  clientEmail,
  canPayOnline,
  onDraftChase,
  onSendInvoice,
  onAddFollowUp,
  onShareLink,
  canRemind,
}: InvoiceCollectionsCardProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  // One clear nudge only — don't soft-sell plans on "On track".
  if (advice.action === "none") {
    return null;
  }

  async function sendReminder() {
    if (!clientEmail?.trim()) {
      toast.error("Add a client email before sending a reminder");
      return;
    }
    setBusy("remind");
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clientEmail }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to send reminder");
      toast.success(`Reminder sent to ${clientEmail}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send reminder");
    } finally {
      setBusy(null);
    }
  }

  async function offerPlan(parts: 2 | 3) {
    setBusy(`plan-${parts}`);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/payment-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parts }),
      });
      const data = await response.json();
      throwIfApiError(response, data, "Could not create plan");
      toast.success(`${parts}-part payment plan enabled`, {
        description: canPayOnline
          ? "Share the invoice link so they can pay the first installment online."
          : "Share the invoice link so they can see the schedule. Enable card payments in Settings for online installments.",
        action: {
          label: "Share link",
          onClick: onShareLink,
        },
      });
      router.refresh();
    } catch (error) {
      toastApiError(error, "Could not create plan");
    } finally {
      setBusy(null);
    }
  }

  const showRemind =
    (advice.action === "remind" || advice.action === "draft_chase") && canRemind;
  const showChase =
    advice.action === "draft_chase" ||
    advice.action === "offer_plan" ||
    advice.action === "remind";
  const showFollowUp =
    advice.action === "follow_up" ||
    advice.action === "draft_chase" ||
    advice.action === "offer_plan" ||
    advice.action === "remind";

  return (
    <Card
      aria-busy={busy !== null}
      className={cn(
        "mb-6 border-l-4",
        advice.urgency === "high" && "border-l-destructive",
        advice.urgency === "medium" && "border-l-warning",
        advice.urgency === "low" && "border-l-muted-foreground/40",
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Get paid
          </p>
          <CardTitle className="text-base">{advice.title}</CardTitle>
        </div>
        {advice.urgency !== "low" ? (
          <Badge variant={urgencyVariant(advice.urgency)}>
            {advice.urgency === "high" ? "Urgent" : "Suggested"}
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{advice.reason}</p>
        <div className="flex flex-wrap gap-2">
          {advice.action === "send" ? (
            <Button type="button" disabled={busy !== null} onClick={onSendInvoice}>
              <SendIcon className="size-4" />
              Send invoice
            </Button>
          ) : null}

          {showRemind ? (
            <Button
              type="button"
              variant={advice.action === "remind" ? "default" : "outline"}
              disabled={busy !== null || !clientEmail?.trim()}
              onClick={() => void sendReminder()}
            >
              {busy === "remind" ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <BellRingIcon className="size-4" />
              )}
              Send reminder
            </Button>
          ) : null}

          {showChase ? (
            <Button
              type="button"
              variant={
                advice.action === "draft_chase" ||
                (advice.action === "remind" && !canRemind)
                  ? "default"
                  : "outline"
              }
              disabled={busy !== null}
              onClick={onDraftChase}
            >
              <SparklesIcon className="size-4" />
              Draft chase email
            </Button>
          ) : null}

          {advice.canOfferPlan ? (
            <>
              <Button
                type="button"
                variant={advice.action === "offer_plan" ? "default" : "outline"}
                disabled={busy !== null}
                onClick={() => void offerPlan(2)}
              >
                {busy === "plan-2" ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <SplitIcon className="size-4" />
                )}
                Offer 2-pay plan
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy !== null}
                onClick={() => void offerPlan(3)}
              >
                {busy === "plan-3" ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <SplitIcon className="size-4" />
                )}
                Offer 3-pay plan
              </Button>
            </>
          ) : null}

          {showFollowUp ? (
            <Button
              type="button"
              variant={advice.action === "follow_up" ? "default" : "outline"}
              disabled={busy !== null}
              onClick={onAddFollowUp}
            >
              <CalendarPlusIcon className="size-4" />
              Add follow-up
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
