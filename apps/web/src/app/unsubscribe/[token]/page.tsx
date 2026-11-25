"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PageProps = { params: Promise<{ token: string }> };

export default function UnsubscribePage({ params }: PageProps) {
  const { token } = use(params);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function unsubscribe() {
    setStatus("loading");
    try {
      const response = await fetch("/api/public/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not unsubscribe");
      setStatus("done");
      setMessage(
        data.alreadyOptedOut
          ? "You were already unsubscribed from these updates."
          : "You're unsubscribed from promotional updates. Invoice and payment emails are unchanged.",
      );
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not unsubscribe");
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email preferences</CardTitle>
          <CardDescription>Promotional notes only. Invoices and payment emails stay on.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "idle" || status === "loading" ? (
            <>
              <p className="text-sm text-foreground">
                Unsubscribe from win-back and thank-you emails from this business?
              </p>
              <Button onClick={() => void unsubscribe()} disabled={status === "loading"}>
                {status === "loading" ? <Loader2Icon className="size-4 animate-spin" /> : null}
                {status === "loading" ? "Unsubscribing…" : "Unsubscribe"}
              </Button>
            </>
          ) : (
            <p className={status === "error" ? "text-sm text-destructive" : "text-sm text-foreground"}>
              {message}
            </p>
          )}
          {status === "done" || status === "error" ? (
            <Button variant="outline" render={<Link href="/" />}>
              Back to Invoice Desk
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
