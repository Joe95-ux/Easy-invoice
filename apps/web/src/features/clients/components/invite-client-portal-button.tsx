"use client";

import { useState } from "react";
import { Loader2Icon, SendIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { pageHeaderActionClass } from "@/components/app-shell/page-header";

type InviteClientPortalButtonProps = {
  clientId: string;
  clientEmail: string | null;
};

export function InviteClientPortalButton({
  clientId,
  clientEmail,
}: InviteClientPortalButtonProps) {
  const [loading, setLoading] = useState(false);

  if (!clientEmail?.trim()) {
    return (
      <Button
        type="button"
        variant="outline"
        className={pageHeaderActionClass}
        disabled
        title="Add an email on this client first"
      >
        <SendIcon className="size-4" />
        Invite to portal
      </Button>
    );
  }

  async function handleInvite() {
    setLoading(true);
    try {
      const response = await fetch(`/api/clients/${clientId}/portal-invite`, {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Could not send invite",
        );
      }
      if (typeof data.debugUrl === "string" && data.debugUrl) {
        console.info("[portal invite debugUrl]", data.debugUrl);
        toast.success("Invite created (dev — email not configured)", {
          description: "Portal link logged to the browser console.",
        });
      } else {
        toast.success(`Portal invite sent to ${data.email ?? clientEmail}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send invite");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={pageHeaderActionClass}
      disabled={loading}
      onClick={() => void handleInvite()}
    >
      {loading ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <SendIcon className="size-4" />
      )}
      {loading ? "Sending…" : "Invite to portal"}
    </Button>
  );
}
