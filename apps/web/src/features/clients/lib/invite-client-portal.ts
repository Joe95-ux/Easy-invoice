/**
 * Shared client-side invite call used by the detail button and clients table.
 */
export async function inviteClientToPortalRequest(clientId: string): Promise<{
  email?: string;
  debugUrl?: string;
}> {
  const response = await fetch(`/api/clients/${clientId}/portal-invite`, {
    method: "POST",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Could not send invite",
    );
  }
  return {
    email: typeof data.email === "string" ? data.email : undefined,
    debugUrl: typeof data.debugUrl === "string" ? data.debugUrl : undefined,
  };
}

export function toastPortalInviteResult(
  result: { email?: string; debugUrl?: string },
  fallbackEmail: string | null,
  toast: { success: (msg: string, opts?: { description?: string }) => void },
) {
  if (result.debugUrl) {
    console.info("[portal invite debugUrl]", result.debugUrl);
    toast.success("Invite created (dev — email not configured)", {
      description: "Portal link logged to the browser console.",
    });
    return;
  }
  toast.success(`Portal invite sent to ${result.email ?? fallbackEmail}`);
}
