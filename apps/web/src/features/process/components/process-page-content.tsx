import Link from "next/link";
import {
  ArrowRightIcon,
  ClipboardListIcon,
  FileTextIcon,
  LayoutTemplateIcon,
  SendIcon,
  SparklesIcon,
  UserRoundIcon,
  UsersRoundIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageScroll } from "@/components/app-shell/app-shell";
import { InvoiceFlowMockup } from "@/features/process/components/invoice-flow-mockup";
import { cn } from "@/lib/utils";

const flowSteps = [
  {
    title: "Pick a client",
    description:
      "Choose someone from your client list or enter their details manually. We pre-fill name, email, and address for you.",
    icon: UserRoundIcon,
  },
  {
    title: "Add the work",
    description:
      "Fill in line items, tax, and discounts — or switch to the AI tab and paste rough notes in any language.",
    icon: SparklesIcon,
  },
  {
    title: "Preview your invoice",
    description:
      "See the exact PDF your client will receive — line items, totals, and your branding before you send.",
    icon: FileTextIcon,
    mockup: true,
  },
  {
    title: "Choose a template",
    description:
      "Swipe through polished layouts, preview each one live, and pick the look that fits your business.",
    icon: LayoutTemplateIcon,
  },
  {
    title: "Send & get paid",
    description:
      "Email the PDF in one click or download it. Track the invoice from draft through sent, viewed, and paid.",
    icon: SendIcon,
  },
];

const exploreFeatures = [
  {
    title: "Invoices",
    description: "Create, send, and track professional invoices with templates and PDF export.",
    icon: FileTextIcon,
    href: "/invoices/new",
    action: "Create invoice",
    accent: "from-primary/15 to-primary/5",
  },
  {
    title: "Estimates",
    description: "Send polished quotes to clients and convert them to invoices when they say yes.",
    icon: ClipboardListIcon,
    href: "/estimates/new",
    action: "Create estimate",
    accent: "from-accent/40 to-accent/10",
  },
  {
    title: "Clients",
    description: "Keep contact details and billing history in one place for faster repeat work.",
    icon: UsersRoundIcon,
    href: "/clients/new",
    action: "Add client",
    accent: "from-muted to-muted/40",
  },
  {
    title: "AI drafting",
    description: "Describe the job in plain words — we structure line items, math, and wording for you.",
    icon: SparklesIcon,
    href: "/invoices/new",
    action: "Try AI tab",
    accent: "from-primary/10 via-accent/20 to-transparent",
    badge: "On new invoice",
  },
];

function FlowTimeline() {
  return (
    <ol className="relative space-y-0">
      {flowSteps.map((step, index) => {
        const isLast = index === flowSteps.length - 1;
        const Icon = step.icon;

        return (
          <li key={step.title} className="relative grid grid-cols-[2.5rem_1fr] gap-x-4 gap-y-0 sm:grid-cols-[3rem_1fr] sm:gap-x-6">
            <div className="relative flex flex-col items-center">
              <span
                className={cn(
                  "relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background text-primary shadow-sm sm:size-10",
                  index === 2 && "ring-4 ring-primary/15",
                )}
              >
                <Icon className="size-4 sm:size-[1.125rem]" />
              </span>
              {!isLast && (
                <span
                  className="absolute top-9 bottom-0 w-px bg-gradient-to-b from-primary/50 via-border to-border sm:top-10"
                  aria-hidden
                />
              )}
            </div>

            <div className={cn("min-w-0 pb-10 sm:pb-12", isLast && "pb-0")}>
              <div className="pt-1.5 sm:pt-2">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary">
                  Step {index + 1}
                </p>
                <h3 className="mt-1 font-heading text-lg font-semibold tracking-tight sm:text-xl">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>

              {step.mockup && (
                <div className="mt-6 sm:mt-8">
                  <InvoiceFlowMockup />
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ExploreFeatureCard({
  title,
  description,
  icon: Icon,
  href,
  action,
  accent,
  badge,
}: (typeof exploreFeatures)[number]) {
  return (
    <article className="flex flex-col overflow-hidden rounded-[20px] border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="relative flex flex-1 flex-col p-6">
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-br opacity-80",
            accent,
          )}
          aria-hidden
        />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-background/80 text-primary shadow-sm ring-1 ring-border/60 backdrop-blur-sm">
              <Icon className="size-5" />
            </span>
            {badge && (
              <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {badge}
              </span>
            )}
          </div>
          <h3 className="mt-4 font-heading text-lg font-semibold tracking-tight">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      <footer className="border-t border-border bg-muted/20 px-6 py-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full cursor-pointer rounded-[20px]"
          render={<Link href={href} />}
        >
          {action}
          <ArrowRightIcon className="size-4" />
        </Button>
      </footer>
    </article>
  );
}

export function ProcessPageContent() {
  return (
    <PageScroll fullWidth className="space-y-16 pb-8 md:space-y-20">
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Process</p>
        <h1 className="max-w-2xl font-heading text-2xl font-semibold tracking-tight md:text-3xl">
          From rough notes to a paid invoice
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
          Invoice Desk is built around a simple path — client, work, preview, template, send.
          Follow the flow below to see how each step connects.
        </p>
      </section>

      <section className="rounded-[20px] border border-border bg-card/50 p-6 shadow-sm sm:p-8 md:p-10">
        <FlowTimeline />
      </section>

      <section className="space-y-8">
        <div className="max-w-2xl space-y-2">
          <h2 className="font-heading text-xl font-semibold tracking-tight md:text-2xl">
            Explore more
          </h2>
          <p className="text-sm text-muted-foreground md:text-base">
            Jump straight into the tools that power your workflow — invoices, estimates, clients,
            and more as we ship them.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {exploreFeatures.map((feature) => (
            <ExploreFeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>
    </PageScroll>
  );
}
