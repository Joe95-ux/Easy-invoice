"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

export function PortalAuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("This sign-in link is missing a token.");
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/portal/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : "This sign-in link is invalid or expired",
          );
        }
        if (cancelled) return;
        toast.success("Signed in");
        router.replace("/portal");
        router.refresh();
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not sign in");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="mx-auto max-w-md space-y-4 text-center">
        <h1 className="font-heading text-xl font-semibold tracking-tight">Link expired</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
        <a
          href="/portal/login"
          className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Request a new link
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      <Loader2Icon className="size-5 animate-spin" />
      <p className="text-sm">Signing you in…</p>
    </div>
  );
}
