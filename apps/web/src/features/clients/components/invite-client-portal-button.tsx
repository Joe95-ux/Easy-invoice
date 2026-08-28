"use client";

import { useState } from "react";
import { Loader2Icon, SendIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { pageHeaderActionClass } from "@/components/app-shell/page-header";
import {
  inviteClientToPortalRequest,
  toastPortalInviteResult,
} from "@/features/clients/lib/invite-client-portal";

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
      const result = await inviteClientToPortalRequest(clientId);
      toastPortalInviteResult(result, clientEmail, toast);
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
