"use client";

import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/app-shell/user-menu";

type PublicNavAuthProps = {
  compact?: boolean;
};

export function PublicNavAuth({ compact = false }: PublicNavAuthProps) {
  return (
    <>
      <SignedOut>
        <Button
          variant="ghost"
          size="sm"
          className={compact ? "hidden" : "hidden sm:inline-flex"}
          render={<Link href="/sign-in" />}
        >
          Sign in
        </Button>
        <Button
          size="sm"
          className={compact ? "h-8 px-3 text-xs" : undefined}
          render={<Link href="/sign-up" />}
        >
          Get started
        </Button>
      </SignedOut>
      <SignedIn>
        {compact ? (
          <UserMenu variant="navbar" compactTrigger />
        ) : (
          <UserMenu variant="navbar" />
        )}
      </SignedIn>
    </>
  );
}
