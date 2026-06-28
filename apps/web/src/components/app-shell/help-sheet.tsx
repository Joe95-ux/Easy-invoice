"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRightIcon,
  BookOpenIcon,
  CircleHelpIcon,
  CreditCardIcon,
  MailIcon,
  SettingsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const SUPPORT_EMAIL = "support@easyinvoice.app";

const helpOptions = [
  {
    title: "Browse FAQs",
    description: "Common questions about invoices, estimates, and plans.",
    href: "/#faq",
    icon: CircleHelpIcon,
  },
  {
    title: "How it works",
    description: "A quick walkthrough of creating and sending invoices.",
    href: "/#how",
    icon: BookOpenIcon,
  },
  {
    title: "Pricing & plans",
    description: "Compare plans and see what each tier includes.",
    href: "/#pricing",
    icon: CreditCardIcon,
  },
  {
    title: "Company settings",
    description: "Logo, branding, templates, and default preferences.",
    href: "/settings",
    icon: SettingsIcon,
  },
] as const;

export function HelpSheet() {
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Need help?
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="gap-0 sm:max-w-md">
          <SheetHeader className="border-b pb-4">
            <SheetTitle>How can we help?</SheetTitle>
            <SheetDescription>
              Start with self-serve resources, or email us if you are stuck.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
            {helpOptions.map((option) => (
              <Link
                key={option.href}
                href={option.href}
                onClick={close}
                className="group flex items-start gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 transition-colors hover:border-border hover:bg-muted/50"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground ring-1 ring-border/60 group-hover:text-foreground">
                  <option.icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{option.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {option.description}
                  </p>
                </div>
                <ArrowUpRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}

            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Easy%20Invoice%20support`}
              onClick={close}
              className="group mt-2 flex items-start gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 transition-colors hover:border-border hover:bg-muted/50"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground ring-1 ring-border/60 group-hover:text-foreground">
                <MailIcon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Email support</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {SUPPORT_EMAIL}
                </p>
              </div>
              <ArrowUpRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </a>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
