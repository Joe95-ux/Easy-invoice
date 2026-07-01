"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Building2Icon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type InvitePreview = {
  email: string;
  role: string;
  companyName: string;
  expiresAt: string;
};

type AcceptInvitePageProps = {
  token: string;
};

export function AcceptInvitePage({ token }: AcceptInvitePageProps) {
  const router = useRouter();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoAcceptAttempted = useRef(false);

  useEffect(() => {
    async function loadPreview() {
      try {
        const response = await fetch(`/api/company/invites/preview/${token}`);
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.error ?? "Invite not found");
        }
        setPreview(body);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Invite not found");
      } finally {
        setLoadingPreview(false);
      }
    }

    void loadPreview();
  }, [token]);

  const handleAccept = useCallback(async () => {
    setAccepting(true);
    setError(null);

    try {
      const response = await fetch("/api/company/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to accept invite");

      toast.success(`You joined ${body.company.name}`);
      router.push("/dashboard");
      router.refresh();
    } catch (acceptError) {
      setAccepting(false);
      const message =
        acceptError instanceof Error ? acceptError.message : "Could not accept invite";
      setError(message);
      toast.error(message);
    }
  }, [router, token]);

  // After sign-in/sign-up redirect, accept automatically — no second click.
  useEffect(() => {
    if (!isAuthLoaded || !isSignedIn || !preview || loadingPreview || accepting || error) {
      return;
    }
    if (autoAcceptAttempted.current) return;

    autoAcceptAttempted.current = true;
    void handleAccept();
  }, [
    accepting,
    error,
    handleAccept,
    isAuthLoaded,
    isSignedIn,
    loadingPreview,
    preview,
  ]);

  const isPageLoading = !isAuthLoaded || loadingPreview;

  if (isPageLoading || accepting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4">
        <Loader2Icon className="size-7 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {accepting
            ? `Joining ${preview?.companyName ?? "company"}…`
            : "Loading invitation…"}
        </p>
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invite unavailable</CardTitle>
            <CardDescription>{error ?? "This invitation is no longer valid."}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {isSignedIn && error && (
              <Button variant="outline" onClick={() => void handleAccept()}>
                Try again
              </Button>
            )}
            <Button render={<Link href="/" />}>Go home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const signInUrl = `/sign-in?redirect_url=${encodeURIComponent(`/accept-invite/${token}`)}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md border-border/70 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2Icon className="size-6" />
          </div>
          <CardTitle>Join {preview.companyName}</CardTitle>
          <CardDescription>
            You&apos;ve been invited as a <strong>{preview.role.toLowerCase()}</strong> for{" "}
            <strong>{preview.email}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!isSignedIn ? (
            <>
              <Button className="w-full" size="lg" render={<Link href={signInUrl} />}>
                Sign in to accept
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                  href={`/sign-up?redirect_url=${encodeURIComponent(`/accept-invite/${token}`)}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Sign up
                </Link>
                . You&apos;ll be added automatically after signing in.
              </p>
            </>
          ) : (
            <Button className="w-full" size="lg" onClick={() => void handleAccept()}>
              Join {preview.companyName}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
