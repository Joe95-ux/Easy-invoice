"use client";

import { useState } from "react";
import { Loader2Icon, MailIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DebugLink = { companyName: string; url: string };

type PortalLoginFormProps = {
  initialEmail?: string;
};

export function PortalLoginForm({ initialEmail = "" }: PortalLoginFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [debugLinks, setDebugLinks] = useState<DebugLink[] | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setDebugLinks(null);
    try {
      const response = await fetch("/api/portal/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Could not send link",
        );
      }
      setSent(true);
      if (Array.isArray(data.debugLinks) && data.debugLinks.length > 0) {
        setDebugLinks(data.debugLinks as DebugLink[]);
      }
      toast.success("Check your email for a sign-in link");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send link");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-foreground">Check your inbox</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            If we found invoices or estimates for <span className="text-foreground">{email}</span>,
            a secure link is on its way. It expires in 30 minutes.
          </p>
        </div>
        {debugLinks ? (
          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-xs font-medium text-muted-foreground">
              Dev mode — email is not configured. Use a link below:
            </p>
            <ul className="space-y-2">
              {debugLinks.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {link.companyName}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer"
          onClick={() => {
            setSent(false);
            setDebugLinks(null);
          }}
        >
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="portal-email">Email</Label>
        <Input
          id="portal-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
        />
        <p className="text-xs text-muted-foreground">
          Use the same email your invoices and estimates were sent to.
        </p>
      </div>
      <Button type="submit" className="w-full cursor-pointer" disabled={loading}>
        {loading ? <Loader2Icon className="size-4 animate-spin" /> : <MailIcon className="size-4" />}
        {loading ? "Sending…" : "Email me a sign-in link"}
      </Button>
    </form>
  );
}
