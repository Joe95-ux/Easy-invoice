"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PageProps = { params: Promise<{ token: string }> };

export default function UnsubscribePage({ params }: PageProps) {
  const { token } = use(params);
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [message, setMessage] = useState("Updating your preferences…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const response = await fetch("/api/public/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not unsubscribe");
        if (cancelled) return;
        setStatus("done");
        setMessage(
          data.alreadyOptedOut
            ? "You were already unsubscribed from these updates."
            : "You're unsubscribed from promotional updates. Invoice and payment emails are unchanged.",
        );
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Could not unsubscribe");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email preferences</CardTitle>
          <CardDescription>Manage promotional messages from this business.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              {message}
            </p>
          ) : (
            <p className="text-sm text-foreground">{message}</p>
          )}
          {status !== "loading" && (
            <Button variant="outline" render={<Link href="/" />}>
              Back to Invoice Desk
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
