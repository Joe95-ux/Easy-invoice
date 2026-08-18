"use client";

import Link from "next/link";
import { useState } from "react";
import { SupportContactDialog } from "@/components/app-shell/support-contact-dialog";
import { cn } from "@/lib/utils";

const linkClassName =
  "text-muted-foreground/80 transition-colors hover:text-foreground";

export function AppWorkspaceFooter({ className }: { className?: string }) {
  const [supportOpen, setSupportOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="Workspace links"
        className={cn(
          "ml-auto hidden shrink-0 items-center gap-x-4 gap-y-1 px-4 pt-1.5 pb-2 text-xs md:flex",
          className,
        )}
      >
        <button
          type="button"
          onClick={() => setSupportOpen(true)}
          className={cn(linkClassName, "cursor-pointer")}
        >
          Contact support
        </button>
        <Link href="/process" className={linkClassName}>
          Process
        </Link>
        <Link href="/privacy" className={linkClassName}>
          Privacy
        </Link>
        <Link href="/terms" className={linkClassName}>
          Terms
        </Link>
      </nav>
      <SupportContactDialog open={supportOpen} onOpenChange={setSupportOpen} />
    </>
  );
}
