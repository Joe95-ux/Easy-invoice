"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { EstimateStatus } from "@easy-invoice/db";

type EstimateRespondActionsProps = {
  token: string;
  initialStatus: EstimateStatus;
};

const RESPONDED: EstimateStatus[] = ["ACCEPTED", "DECLINED", "CANCELLED", "EXPIRED"];

export function EstimateRespondActions({ token, initialStatus }: EstimateRespondActionsProps) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);

  const canRespond = !RESPONDED.includes(status);

  async function respond(action: "accept" | "decline") {
    setLoading(action);
    try {
      const response = await fetch(`/api/public/estimates/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not submit response");
      }

      setStatus(data.estimate.status);
      toast.success(action === "accept" ? "Estimate accepted" : "Estimate declined");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  if (!canRespond) {
    return (
      <p className="text-sm text-muted-foreground">
        {status === "ACCEPTED"
          ? "You accepted this estimate. The sender has been notified."
          : status === "DECLINED"
            ? "You declined this estimate."
            : "This estimate is no longer open for a response."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <p className="text-sm text-muted-foreground">Ready to move forward?</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => respond("accept")} disabled={loading !== null}>
          {loading === "accept" ? "Submitting..." : "Accept estimate"}
        </Button>
        <Button variant="outline" onClick={() => respond("decline")} disabled={loading !== null}>
          {loading === "decline" ? "Submitting..." : "Decline"}
        </Button>
      </div>
    </div>
  );
}
