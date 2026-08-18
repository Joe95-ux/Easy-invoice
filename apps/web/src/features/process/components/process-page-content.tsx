"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  CheckIcon,
  CircleIcon,
  ClockIcon,
  FileTextIcon,
  RefreshCwIcon,
  SendIcon,
  WalletIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageScroll } from "@/components/app-shell/app-shell";
import { PageHeader } from "@/components/app-shell/page-header";
import type { ProcessSetupSnapshot } from "@/lib/process/setup";
import { cn } from "@/lib/utils";

type PlaybookId = "invoice" | "estimate" | "recurring" | "collect" | "time";

type PlaybookStep = {
  title: string;
  body: string;
  href: string;
  cta: string;
};

type Playbook = {
  id: PlaybookId;
  label: string;
  summary: string;
  steps: PlaybookStep[];
};

const PLAYBOOKS: Playbook[] = [
  {
    id: "invoice",
    label: "Invoice",
    summary: "The core path competitors all ship — client, lines, send, get paid.",
    steps: [
      {
        title: "Choose or create a client",
        body: "Pull saved details or enter them once. Address and email carry into the PDF and payment emails.",
        href: "/clients/new",
        cta: "Add client",
      },
      {
        title: "Add line items",
        body: "Type manually, pull from your products library, or paste rough notes into AI drafting.",
        href: "/invoices/new",
        cta: "New invoice",
      },
      {
        title: "Preview, then send",
        body: "Confirm the PDF with your branding, then email it or share the public link.",
        href: "/invoices/new",
        cta: "Create & preview",
      },
      {
        title: "Collect payment",
        body: "Clients pay by card when Stripe is connected, or use your payment methods / scan-to-pay QR.",
        href: "/settings/billing",
        cta: "Card payments",
      },
    ],
  },
  {
    id: "estimate",
    label: "Estimate",
    summary: "Quote first, convert when they accept — standard for service businesses.",
    steps: [
      {
        title: "Draft an estimate",
        body: "Same line-item and template flow as invoices, with an expiry date.",
        href: "/estimates/new",
        cta: "New estimate",
      },
      {
        title: "Share for review",
        body: "Client opens the public link, can accept or decline. You see viewed status.",
        href: "/estimates",
        cta: "View estimates",
      },
      {
        title: "Convert to invoice",
        body: "One click copies client, lines, and totals into a new invoice when they say yes.",
        href: "/estimates",
        cta: "Open estimates",
      },
    ],
  },
  {
    id: "recurring",
    label: "Recurring",
    summary: "Retainers and subscriptions — schedule from an existing invoice, not a second builder.",
    steps: [
      {
        title: "Start from a solid invoice",
        body: "Create or open an invoice that already has the right client and lines.",
        href: "/invoices",
        cta: "Invoices",
      },
      {
        title: "Make it recurring",
        body: "Set interval (weekly → yearly), end rules, and optional auto-send. Cron issues the next ones.",
        href: "/recurring-invoices",
        cta: "Recurring",
      },
      {
        title: "Pause or end anytime",
        body: "Manage schedules from the recurring list — pause, resume, or stop without rewriting the template invoice.",
        href: "/recurring-invoices",
        cta: "Manage schedules",
      },
    ],
  },
  {
    id: "collect",
    label: "Collect",
    summary: "What AR tools charge for — reminders, follow-ups, plans, and chase drafts on signals you already store.",
    steps: [
      {
        title: "Let reminders run",
        body: "Company schedule emails before due, on due, and after. Pause per invoice when needed.",
        href: "/settings/general#settings-reminders",
        cta: "Reminder settings",
      },
      {
        title: "Work the follow-ups list",
        body: "Due-soon and overdue invoices surface as open tasks. They stay open until paid — not when the date passes.",
        href: "/follow-ups",
        cta: "Follow-ups",
      },
      {
        title: "Offer a payment plan",
        body: "From the invoice Get paid card, your team splits into 2 or 3. Clients only self-serve split if you enable it in Billing.",
        href: "/invoices",
        cta: "Open invoices",
      },
      {
        title: "Send a chase email",
        body: "AI draft in collections tone uses viewed/overdue context. Primary card pay charges what’s due on a plan.",
        href: "/invoices",
        cta: "Find overdue",
      },
    ],
  },
  {
    id: "time",
    label: "Time",
    summary: "Track hours, then bill — without turning Invoice Desk into a full time-tracking product.",
    steps: [
      {
        title: "Log or import time",
        body: "Manual entries, live timer, or one-time import from Toggl / Clockify.",
        href: "/time",
        cta: "Time",
      },
      {
        title: "Add unbilled hours to an invoice",
        body: "From create or draft edit, pull open time entries into line items at your rate.",
        href: "/invoices/new",
        cta: "New invoice",
      },
      {
        title: "Send and collect as usual",
        body: "Same send, remind, and pay flow — hours are just another line source.",
        href: "/invoices",
        cta: "Invoices",
      },
    ],
  },
];

const PLAYBOOK_ICONS: Record<PlaybookId, typeof FileTextIcon> = {
  invoice: FileTextIcon,
  estimate: SendIcon,
  recurring: RefreshCwIcon,
  collect: WalletIcon,
  time: ClockIcon,
};

type ProcessPageContentProps = {
  setup: ProcessSetupSnapshot;
};

export function ProcessPageContent({ setup }: ProcessPageContentProps) {
  const [playbookId, setPlaybookId] = useState<PlaybookId>("invoice");
  const [stepIndex, setStepIndex] = useState(0);

  const playbook = useMemo(
    () => PLAYBOOKS.find((item) => item.id === playbookId) ?? PLAYBOOKS[0]!,
    [playbookId],
  );

  useEffect(() => {
    setStepIndex(0);
  }, [playbookId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      const n = Number(event.key);
      if (n >= 1 && n <= playbook.steps.length) {
        setStepIndex(n - 1);
      }
      if (event.key === "ArrowDown" || event.key === "j") {
        event.preventDefault();
        setStepIndex((i) => Math.min(playbook.steps.length - 1, i + 1));
      }
      if (event.key === "ArrowUp" || event.key === "k") {
        event.preventDefault();
        setStepIndex((i) => Math.max(0, i - 1));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [playbook.steps.length]);

  const activeStep = playbook.steps[stepIndex] ?? playbook.steps[0]!;
  const progress = setup.total === 0 ? 0 : Math.round((setup.completed / setup.total) * 100);
  const stepSelectItems = playbook.steps.map((step, index) => ({
    value: String(index),
    label: `${index + 1}. ${step.title}`,
  }));

  return (
    <PageScroll maxWidth="60rem" className="space-y-10 pb-10">
      <PageHeader
        title="Process"
        description="How work moves through Invoice Desk — setup checklist, then playbooks for the jobs you actually run."
      />

      {/* Setup */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-foreground">Workspace setup</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {setup.completed} of {setup.total} complete
            </p>
          </div>
          <p className="font-mono text-xs tabular-nums text-muted-foreground">{progress}%</p>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Workspace setup progress"
        >
          <div
            className="h-full rounded-full bg-foreground transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <ul className="divide-y divide-border overflow-hidden rounded-[10px] border border-border">
          {setup.items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40 sm:px-5"
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                    item.done
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {item.done ? (
                    <CheckIcon className="size-3" strokeWidth={3} />
                  ) : (
                    <CircleIcon className="size-2.5 opacity-40" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-sm font-medium",
                      item.done && "text-muted-foreground line-through",
                    )}
                  >
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {item.description}
                  </span>
                </span>
                <ArrowRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Playbooks */}
      <section className="space-y-5">
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-foreground">Playbooks</h2>
          <p className="text-sm text-muted-foreground">
            Pick a workflow. Use ↑↓ or 1–{playbook.steps.length} to move between steps.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Playbooks"
          className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1 pb-px"
        >
          {PLAYBOOKS.map((item) => {
            const Icon = PLAYBOOK_ICONS[item.id];
            const selected = item.id === playbookId;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={(event) => {
                  setPlaybookId(item.id);
                  event.currentTarget.focus({ preventScroll: true });
                  event.currentTarget.scrollIntoView({
                    behavior: "smooth",
                    inline: "nearest",
                    block: "nearest",
                  });
                }}
                className={cn(
                  "inline-flex shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors",
                  selected
                    ? "border-foreground font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5 opacity-70" />
                {item.label}
              </button>
            );
          })}
        </div>

        <p className="text-sm text-muted-foreground">{playbook.summary}</p>

        <div className="overflow-hidden rounded-[10px] border border-border">
          <div className="flex flex-col md:grid md:grid-cols-[minmax(12rem,14rem)_minmax(0,1fr)]">
            <nav
              aria-label="Steps"
              className="border-b border-border md:border-r md:border-b-0"
            >
              {/* Mobile: compact step picker */}
              <div className="space-y-1.5 p-3 md:hidden">
                <span className="text-xs font-medium text-muted-foreground">Step</span>
                <Select
                  value={String(stepIndex)}
                  onValueChange={(value) => {
                    if (value != null) setStepIndex(Number(value));
                  }}
                  items={stepSelectItems}
                >
                  <SelectTrigger
                    id="process-step-select"
                    aria-label="Step"
                    className="h-10 w-full rounded-[10px]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start" alignItemWithTrigger>
                    {stepSelectItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Desktop: vertical step list */}
              <ol className="hidden gap-1 p-3 md:flex md:flex-col">
                {playbook.steps.map((step, index) => {
                  const selected = index === stepIndex;
                  return (
                    <li key={step.title} className="w-full">
                      <button
                        type="button"
                        onClick={() => setStepIndex(index)}
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-sm transition-colors",
                          selected
                            ? "bg-muted font-medium text-foreground"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                        )}
                      >
                        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1 whitespace-normal">{step.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>

            <div className="flex min-w-0 flex-col justify-between gap-6 p-4 sm:p-6">
              <div className="space-y-3">
                <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Step {stepIndex + 1} of {playbook.steps.length}
                </p>
                <h3 className="font-heading text-lg font-semibold tracking-tight sm:text-xl">
                  {activeStep.title}
                </h3>
                <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                  {activeStep.body}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <Button className="w-full sm:w-auto" render={<Link href={activeStep.href} />}>
                  {activeStep.cta}
                  <ArrowRightIcon className="size-4" />
                </Button>
                {stepIndex < playbook.steps.length - 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full cursor-pointer sm:w-auto"
                    onClick={() => setStepIndex((i) => i + 1)}
                  >
                    Next step
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Shortcuts */}
      <section className="space-y-3 border-t border-border pt-8">
        <h2 className="text-sm font-medium text-foreground">Jump in</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link href="/invoices/new" className="text-foreground underline-offset-4 hover:underline">
            New invoice
          </Link>
          <Link href="/estimates/new" className="text-foreground underline-offset-4 hover:underline">
            New estimate
          </Link>
          <Link href="/follow-ups" className="text-foreground underline-offset-4 hover:underline">
            Follow-ups
          </Link>
          <Link
            href="/recurring-invoices"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Recurring
          </Link>
          <Link href="/time" className="text-foreground underline-offset-4 hover:underline">
            Time
          </Link>
          <Link href="/invoices/new" className="text-foreground underline-offset-4 hover:underline">
            AI draft on new invoice
          </Link>
        </div>
      </section>
    </PageScroll>
  );
}
