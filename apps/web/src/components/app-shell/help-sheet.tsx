"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";
import {
  ArrowUpRightIcon,
  BellRingIcon,
  BookOpenIcon,
  ChevronLeftIcon,
  CircleHelpIcon,
  CornerDownLeftIcon,
  CreditCardIcon,
  Loader2Icon,
  MailIcon,
  MessageSquareTextIcon,
  SettingsIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { SUPPORT_EMAIL } from "@/lib/support";
import { cn } from "@/lib/utils";

type HelpView = "list" | "payment-reminders" | "feedback";

const linkOptions = [
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

const paymentReminderScenarios = [
  {
    title: "7 days before due",
    body: "A client invoice due on the 15th gets a friendly heads-up on the 8th — no action needed from you.",
  },
  {
    title: "Due today",
    body: "On the due date, Invoice Desk sends a clear “payment due today” email with the amount and a link to view the invoice.",
  },
  {
    title: "Payment is late",
    body: "If the invoice stays unpaid, overdue reminders go out on your schedule (default: 1, 7, and 14 days after due). The invoice status moves to Overdue automatically.",
  },
  {
    title: "One-off nudge",
    body: "Open any sent invoice and choose Send payment reminder for a manual follow-up — useful when a client asks for another copy or you want to check in.",
  },
  {
    title: "Already paid or not needed",
    body: "Mark the invoice as paid to stop reminders, or pause automatic reminders on that invoice only while keeping your company schedule active.",
  },
] as const;

function HelpOptionButton({
  title,
  description,
  icon: Icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full cursor-pointer items-start gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 text-left transition-colors hover:border-border hover:bg-muted/50"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground ring-1 ring-border/60 group-hover:text-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <ArrowUpRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function PaymentRemindersHelp({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="space-y-5 text-sm">
      <p className="leading-relaxed text-muted-foreground">
        Payment reminders help you get paid on time without chasing clients manually. Configure the
        schedule once in{" "}
        <Link
          href="/settings"
          onClick={onNavigate}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Settings → Payment reminders
        </Link>
        , then Invoice Desk emails clients on your behalf for sent invoices with a due date.
      </p>

      <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Default schedule
        </p>
        <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
          <li>7 and 3 days before the due date</li>
          <li>On the due date</li>
          <li>1, 7, and 14 days after if still unpaid</li>
        </ul>
      </div>

      <div className="space-y-3">
        <p className="font-medium">Common scenarios</p>
        {paymentReminderScenarios.map((scenario) => (
          <div
            key={scenario.title}
            className="rounded-xl border border-border/70 bg-muted/15 p-3"
          >
            <p className="font-medium">{scenario.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{scenario.body}</p>
          </div>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Reminders only go to invoices that have been sent, have a client email, and are not paid or
        cancelled. Each scheduled reminder is sent at most once per day.
      </p>
    </div>
  );
}

function FeedbackForm({ onSent }: { onSent: () => void }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [metaLabel, setMetaLabel] = useState("Ctrl");

  const canSend = message.trim().length >= 10 && !sending;

  useEffect(() => {
    const isMac = /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);
    if (isMac) setMetaLabel("\u2318");
  }, []);

  async function handleSend() {
    if (!canSend) return;

    setSending(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Failed to send feedback");
      }

      toast.success("Thanks for your feedback!");
      setMessage("");
      onSent();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send feedback");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Tell us what is working, what is confusing, or what you would like to see next. Your message
        goes directly to the Invoice Desk team at {SUPPORT_EMAIL}.
      </p>

      <Textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={8}
        placeholder="Share your thoughts..."
        className="min-h-[180px] resize-none rounded-xl"
      />

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => void handleSend()}
          disabled={!canSend}
          className={cn(
            "h-9 rounded-xl border-transparent px-4 shadow-none",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "disabled:bg-primary/50 disabled:text-primary-foreground/80",
            "dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100",
            "dark:disabled:bg-white/70 dark:disabled:text-neutral-900/60",
          )}
        >
          {sending ? (
            <>
              <Loader2Icon className="animate-spin" />
              Sending...
            </>
          ) : (
            <>
              Send
              <KbdGroup className="ml-1.5">
                <Kbd
                  className={cn(
                    "rounded-md border-0 px-1.5 text-[11px] font-medium",
                    "bg-primary-foreground/15 text-primary-foreground",
                    "dark:bg-neutral-200 dark:text-neutral-700",
                  )}
                >
                  {metaLabel}
                </Kbd>
                <Kbd
                  className={cn(
                    "rounded-md border-0 px-1 text-primary-foreground",
                    "bg-primary-foreground/15",
                    "dark:bg-neutral-200 dark:text-neutral-700",
                  )}
                >
                  <CornerDownLeftIcon className="size-3" />
                </Kbd>
              </KbdGroup>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export function HelpSheet() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<HelpView>("list");

  function close() {
    setOpen(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setView("list");
    }
  }

  function goBack() {
    setView("list");
  }

  const titles: Record<HelpView, string> = {
    list: "How can we help?",
    "payment-reminders": "Payment reminders",
    feedback: "Share feedback",
  };

  const descriptions: Record<HelpView, string | null> = {
    list: "Start with self-serve resources, or email us if you are stuck.",
    "payment-reminders": "How automatic and manual payment reminders work.",
    feedback: "Help us improve Invoice Desk.",
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Need help?
      </Button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className={cn("gap-0", isMobile ? "!w-full !max-w-full" : "sm:max-w-md")}
        >
          <SheetHeader className="border-b pb-4">
            {view !== "list" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-ml-2 mb-2 w-fit gap-1 px-2 text-muted-foreground"
                onClick={goBack}
              >
                <ChevronLeftIcon className="size-4" />
                Back
              </Button>
            )}
            <SheetTitle>{titles[view]}</SheetTitle>
            {descriptions[view] && (
              <SheetDescription>{descriptions[view]}</SheetDescription>
            )}
          </SheetHeader>

          <div
            className={cn(
              "flex flex-1 flex-col overflow-y-auto p-4",
              view === "list" && "gap-2",
            )}
          >
            {view === "list" && (
              <>
                {linkOptions.map((option) => (
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

                <HelpOptionButton
                  title="Payment reminders"
                  description="How automatic and manual follow-ups work for unpaid invoices."
                  icon={BellRingIcon}
                  onClick={() => setView("payment-reminders")}
                />

                <HelpOptionButton
                  title="Share feedback"
                  description="Tell us what is working or what we should improve."
                  icon={MessageSquareTextIcon}
                  onClick={() => setView("feedback")}
                />

                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=Invoice%20Desk%20support`}
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
              </>
            )}

            {view === "payment-reminders" && <PaymentRemindersHelp onNavigate={close} />}
            {view === "feedback" && <FeedbackForm onSent={goBack} />}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
