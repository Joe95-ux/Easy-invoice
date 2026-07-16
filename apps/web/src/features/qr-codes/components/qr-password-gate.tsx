"use client";

import { useState } from "react";
import { LockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type QrPasswordGateProps = {
  token: string;
  name: string;
};

export function QrPasswordGate({ token, name }: QrPasswordGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/q/${token}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        window.location.reload();
        return;
      }
      setError(response.status === 401 ? "Incorrect password. Try again." : "Something went wrong.");
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <LockIcon className="size-7" />
        </div>
        <div>
          <h1 className="font-heading text-lg font-semibold tracking-tight">Password required</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the password to open{name ? ` “${name}”` : " this QR code"}.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-2">
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            autoFocus
            aria-invalid={error ? true : undefined}
          />
          {error && <p className="text-left text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading || !password.trim()}>
            {loading ? "Checking…" : "Unlock"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
