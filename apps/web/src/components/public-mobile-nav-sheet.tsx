"use client";

import Link from "next/link";
import { useState } from "react";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { MenuIcon } from "lucide-react";
import { AppSidebarContent } from "@/components/app-shell/app-sidebar-content";
import { SidebarUserMenu } from "@/components/app-shell/sidebar-user-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Sidebar, SidebarProvider } from "@/components/ui/sidebar";

type PublicMobileNavSheetProps = {
  company?: {
    name: string;
    logoUrl: string | null;
    plan: string;
  } | null;
};

export function PublicMobileNavSheet({ company }: PublicMobileNavSheetProps) {
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="cursor-pointer text-muted-foreground hover:text-foreground"
            aria-label="Open menu"
          />
        }
      >
        <MenuIcon className="size-5" />
      </SheetTrigger>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="flex w-[min(100vw,18rem)] flex-col gap-0 bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <SidebarProvider defaultOpen className="flex min-h-0 flex-1 flex-col">
          <Sidebar collapsible="none" variant="inset" className="h-full min-h-0 flex-1 border-0 bg-transparent">
            <AppSidebarContent
              companyName={company?.name}
              logoUrl={company?.logoUrl}
              plan={company?.plan}
              showPublicSections
              onNavigate={close}
            />
            <SignedOut>
              <div className="mt-auto space-y-2 border-t border-sidebar-border p-3">
                <Button
                  variant="outline"
                  className="w-full cursor-pointer"
                  render={<Link href="/sign-in" />}
                  onClick={close}
                >
                  Sign in
                </Button>
                <Button
                  className="w-full cursor-pointer"
                  render={<Link href="/sign-up" />}
                  onClick={close}
                >
                  Get started
                </Button>
              </div>
            </SignedOut>
            <SignedIn>
              {!company && (
                <div className="mt-auto border-t border-sidebar-border p-2">
                  <SidebarUserMenu />
                </div>
              )}
            </SignedIn>
          </Sidebar>
        </SidebarProvider>
      </SheetContent>
    </Sheet>
  );
}
