import { Suspense } from "react";
import { PortalAuthCallbackClient } from "@/features/portal/components/portal-auth-callback-client";

export const metadata = {
  title: "Signing in · Client portal",
};

export default function PortalAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-sm text-muted-foreground">Signing you in…</div>
      }
    >
      <PortalAuthCallbackClient />
    </Suspense>
  );
}
