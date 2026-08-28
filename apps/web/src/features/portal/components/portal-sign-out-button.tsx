"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOutIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function PortalSignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    try {
      await fetch("/api/portal/auth/logout", { method: "POST" });
      router.replace("/portal/login");
      router.refresh();
    } catch {
      toast.error("Could not sign out");
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="cursor-pointer text-muted-foreground"
      disabled={loading}
      onClick={() => void signOut()}
      aria-label={loading ? "Signing out" : "Sign out"}
      title="Sign out"
    >
      <LogOutIcon className="size-4 sm:hidden" />
      <span className="hidden sm:inline">{loading ? "Signing out…" : "Sign out"}</span>
    </Button>
  );
}
