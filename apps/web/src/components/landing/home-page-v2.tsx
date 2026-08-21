import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import {
  ArrowRightIcon,
  CheckIcon,
  CreditCardIcon,
  FileTextIcon,
  Link2Icon,
  QrCodeIcon,
  SparklesIcon,
  WifiIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PublicNavbarLoader } from "@/components/public-navbar-loader";
import { Reveal } from "@/components/landing/reveal";
import { FaqAccordion } from "@/components/landing/faq-accordion";
import { LANDING_PLANS } from "@/features/settings/lib/plans-catalog";
import { cn } from "@/lib/utils";

/** Landing CTAs — lift + shadow; keeps brand primary (no color override). */
const landingBtn =
  "rounded-full px-6 transition-[transform,box-shadow,background-color,border-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-colors motion-reduce:hover:translate-y-0";

const landingBtnPrimary = cn(
  landingBtn,
  "hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-[0_10px_28px_-10px_color-mix(in_oklch,var(--primary)_60%,transparent)] active:translate-y-0 active:shadow-none [&_svg]:transition-transform [&_svg]:duration-300 group-hover/button:[&_svg]:translate-x-0.5",
);

const landingBtnOutline = cn(
  landingBtn,
  "hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/5 hover:text-foreground hover:shadow-sm active:translate-y-0 active:shadow-none",
);

/**
 * Product-forward landing (v2). Uses app theme tokens so light/dark works.
 * Switch: NEXT_PUBLIC_LANDING_VERSION=v1|v2
 */
export function HomePageV2() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbarLoader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/60">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_-15%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_60%)]"
          />
          <div className="relative mx-auto max-w-4xl px-6 pb-12 pt-16 text-center md:pb-14 md:pt-24">
            <h1 className="landing-hero-in font-heading text-[2.5rem] font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-[4.25rem]">
              Describe the job.
              <br />
              <span className="text-primary">Get paid.</span>
            </h1>
            <p
              className="landing-hero-in mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg"
              style={{ animationDelay: "90ms" }}
            >
              Invoice Desk turns rough notes into professional invoices, sends clients a
              pay link, and helps you collect — built for trades and small businesses who
              bill for real work.
            </p>
            <div
              className="landing-hero-in mt-9 flex flex-wrap items-center justify-center gap-3"
              style={{ animationDelay: "160ms" }}
            >
              <HeroCtas />
            </div>
            <SignedOut>
              <p
                className="landing-hero-in mt-5 text-sm text-muted-foreground"
                style={{ animationDelay: "220ms" }}
              >
                Free forever plan · No credit card required
              </p>
            </SignedOut>
          </div>

          <div className="relative mx-auto max-w-6xl px-4 pb-16 md:px-6 md:pb-24">
            <div className="landing-hero-in" style={{ animationDelay: "280ms" }}>
              <ProductCanvas />
            </div>
          </div>
        </section>

        {/* Capability row */}
        <section className="border-b border-border/60">
          <div className="mx-auto grid max-w-6xl gap-px bg-border/60 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: SparklesIcon,
                title: "AI draft",
                body: "Describe the job in any language — get an itemized invoice back.",
              },
              {
                icon: Link2Icon,
                title: "Client pay links",
                body: "Clients open, review, and pay without creating an account.",
              },
              {
                icon: CreditCardIcon,
                title: "Card checkout",
                body: "Stripe Connect puts payments straight into your business.",
              },
              {
                icon: QrCodeIcon,
                title: "Dynamic QR codes",
                body: "Print once for Wi‑Fi, menus, or payment — update anytime.",
              },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 60} className="bg-background px-6 py-8">
                <item.icon className="size-5 text-primary" />
                <h2 className="mt-4 font-heading text-base font-semibold tracking-tight">
                  {item.title}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* AI */}
        <section id="features" className="scroll-mt-20">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:py-28 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                AI draft
              </p>
              <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                Rough notes in.
                <br />
                Client-ready invoice out.
              </h2>
              <p className="mt-4 max-w-md text-muted-foreground">
                Paste the job the way you&apos;d text a crew lead. Invoice Desk structures
                quantities, rates, and discounts — you review once and send.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  "Understands “$300 × 2 bathrooms”",
                  "Turns “10% if paid this week” into a real discount",
                  "Translates other languages automatically",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-3 text-sm">
                    <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={100}>
              <AiStrip />
            </Reveal>
          </div>
        </section>

        {/* How */}
        <section id="how" className="scroll-mt-20 border-y border-border/60 bg-muted/35">
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
            <Reveal className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                How it works
              </p>
              <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                From job site to paid in three moves
              </h2>
              <p className="mt-4 text-muted-foreground">
                No spreadsheets. No retyping estimates into invoices. The path you already
                run — tightened.
              </p>
            </Reveal>
            <ol className="mt-14 grid gap-8 md:grid-cols-3">
              {[
                {
                  n: "01",
                  title: "Describe",
                  body: "Type the work, pull products, or start from an e-signed estimate. AI fills the gaps.",
                },
                {
                  n: "02",
                  title: "Send",
                  body: "Email a branded PDF or share a public link. See when it’s viewed.",
                },
                {
                  n: "03",
                  title: "Collect",
                  body: "Card pay via Stripe, reminders on schedule, follow-ups when they’re late.",
                },
              ].map((step, i) => (
                <Reveal key={step.n} delay={i * 80}>
                  <li className="relative border-t border-border pt-6">
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {step.n}
                    </span>
                    <h3 className="mt-3 font-heading text-xl font-semibold tracking-tight">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Get paid */}
        <section className="border-b border-border/60">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:py-28 lg:grid-cols-2 lg:gap-16">
            <Reveal delay={80} className="order-2 lg:order-1">
              <CollectPreview />
            </Reveal>
            <Reveal className="order-1 lg:order-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                Get paid
              </p>
              <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                Checkout, reminders, and chase — in one place
              </h2>
              <p className="mt-4 max-w-md text-muted-foreground">
                Connect Stripe so clients pay online. Automatic reminders keep invoices
                moving. Follow-ups and payment plans handle the awkward middle.
              </p>
            </Reveal>
          </div>
        </section>

        {/* QR codes */}
        <section id="qr" className="scroll-mt-20 border-b border-border/60 bg-muted/35">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:py-28 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                QR codes
              </p>
              <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                Print once.
                <br />
                Change what it opens anytime.
              </h2>
              <p className="mt-4 max-w-md text-muted-foreground">
                Dynamic QR codes for the places you already leave a mark — the van door,
                the counter, the table tent, the job site. One short link behind every
                print. Update the destination without reprinting. Count every scan.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  "Wi‑Fi, menus, business pages, PDFs, events, coupons, socials, or any link",
                  "Brand with your colors and logo — password-protect when you need to",
                  "5 codes on Free · unlimited on Pro",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-3 text-sm">
                    <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-9 flex flex-wrap gap-3">
                <SignedOut>
                  <Button
                    size="lg"
                    className={landingBtnPrimary}
                    render={<Link href="/sign-up" />}
                  >
                    Create your first QR
                    <ArrowRightIcon className="size-4" />
                  </Button>
                </SignedOut>
                <SignedIn>
                  <Button
                    size="lg"
                    className={landingBtnPrimary}
                    render={<Link href="/qr-codes" />}
                  >
                    Open QR codes
                    <ArrowRightIcon className="size-4" />
                  </Button>
                </SignedIn>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <QrPreview />
            </Reveal>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
            <Reveal className="mx-auto max-w-xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                Pricing
              </p>
              <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                Start free. Upgrade when it pays off.
              </h2>
              <p className="mt-4 text-muted-foreground">
                No credit card to begin. Cancel anytime.
              </p>
            </Reveal>
            <div className="mx-auto mt-14 grid max-w-3xl gap-4 md:grid-cols-2">
              {LANDING_PLANS.map((plan, index) => (
                <Reveal
                  key={plan.name}
                  delay={index * 80}
                  className={cn(
                    "flex flex-col rounded-2xl border p-7",
                    plan.highlighted
                      ? "border-primary/40 bg-card shadow-sm ring-1 ring-primary/15"
                      : "border-border bg-card/60",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-heading text-lg font-semibold">{plan.name}</h3>
                    {plan.highlighted ? (
                      <span className="text-xs font-medium text-primary">Popular</span>
                    ) : null}
                  </div>
                  <p className="mt-4 flex items-baseline gap-1.5">
                    <span className="font-heading text-4xl font-semibold tracking-tight">
                      {plan.price}
                    </span>
                    <span className="text-sm text-muted-foreground">/ {plan.cadence}</span>
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                  <ul className="mt-6 flex-1 space-y-2.5">
                    {plan.features.slice(0, 6).map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm">
                        <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <SignedOut>
                    <Button
                      className={cn(
                        "mt-8 w-full",
                        plan.highlighted ? landingBtnPrimary : landingBtnOutline,
                      )}
                      size="lg"
                      variant={plan.highlighted ? "default" : "outline"}
                      render={<Link href="/sign-up" />}
                    >
                      {plan.cta}
                    </Button>
                  </SignedOut>
                  <SignedIn>
                    <Button
                      className={cn(
                        "mt-8 w-full",
                        plan.highlighted ? landingBtnPrimary : landingBtnOutline,
                      )}
                      size="lg"
                      variant={plan.highlighted ? "default" : "outline"}
                      render={
                        <Link
                          href={plan.highlighted ? "/settings/billing" : "/dashboard"}
                        />
                      }
                    >
                      {plan.highlighted ? "Upgrade to Pro" : "Open dashboard"}
                    </Button>
                  </SignedIn>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t border-border/60 bg-muted/35">
          <div className="mx-auto max-w-2xl px-6 py-20 md:py-28">
            <Reveal className="text-center">
              <h2 className="font-heading text-3xl font-semibold tracking-tight">FAQ</h2>
              <p className="mt-3 text-muted-foreground">
                Straight answers before you create an account.
              </p>
            </Reveal>
            <Reveal className="mt-10">
              <FaqAccordion />
            </Reveal>
          </div>
        </section>

        {/* Closing */}
        <section className="border-t border-border/60">
          <div className="mx-auto max-w-3xl px-6 py-24 text-center md:py-32">
            <Reveal>
              <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-5xl">
                Your next invoice is a sentence away
              </h2>
              <p className="mx-auto mt-4 max-w-md text-muted-foreground">
                <SignedOut>
                  Free to start. Upgrade when unlimited volume and branding pay for
                  themselves.
                </SignedOut>
                <SignedIn>
                  Pick up where you left off — draft, send, and collect from your
                  workspace.
                </SignedIn>
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <ClosingCtas />
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function HeroCtas() {
  return (
    <>
      <SignedOut>
        <Button size="lg" className={landingBtnPrimary} render={<Link href="/sign-up" />}>
          Start for free
          <ArrowRightIcon className="size-4" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          className={landingBtnOutline}
          render={<Link href="#how" />}
        >
          See how it works
        </Button>
      </SignedOut>
      <SignedIn>
        <Button
          size="lg"
          className={landingBtnPrimary}
          render={<Link href="/dashboard" />}
        >
          Open dashboard
          <ArrowRightIcon className="size-4" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          className={landingBtnOutline}
          render={<Link href="/invoices/new" />}
        >
          New invoice
        </Button>
      </SignedIn>
    </>
  );
}

function ClosingCtas() {
  return (
    <>
      <SignedOut>
        <Button size="lg" className={landingBtnPrimary} render={<Link href="/sign-up" />}>
          Start for free
          <ArrowRightIcon className="size-4" />
        </Button>
      </SignedOut>
      <SignedIn>
        <Button
          size="lg"
          className={landingBtnPrimary}
          render={<Link href="/dashboard" />}
        >
          Open dashboard
          <ArrowRightIcon className="size-4" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          className={landingBtnOutline}
          render={<Link href="/invoices/new" />}
        >
          New invoice
        </Button>
      </SignedIn>
    </>
  );
}

function ProductCanvas() {
  const rows = [
    { number: "INV-0042", client: "Rivera Homes", due: "Aug 28", total: "$1,620", status: "Sent" },
    { number: "INV-0041", client: "Oak Street LLC", due: "Aug 22", total: "$840", status: "Paid" },
    { number: "INV-0040", client: "Northside Clean", due: "Aug 18", total: "$390", status: "Overdue" },
    { number: "INV-0039", client: "Bright HVAC", due: "Aug 12", total: "$2,150", status: "Paid" },
  ] as const;

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 bottom-0 top-1/3 rounded-full bg-primary/10 blur-3xl dark:bg-primary/20"
      />
      <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-foreground/5 ring-1 ring-foreground/5">
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="ml-3 truncate text-xs text-muted-foreground">
            app.invoicedesk.app / invoices
          </span>
        </div>

        <div className="grid min-h-[22rem] md:grid-cols-[13rem_minmax(0,1fr)]">
          <aside className="hidden border-r border-border bg-muted/25 p-3 md:flex md:flex-col">
            <div className="flex items-center gap-2 rounded-lg px-2 py-2">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-[10px] font-semibold text-primary-foreground">
                ID
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">Acme Trades</p>
                <p className="truncate text-[10px] text-muted-foreground">Pro plan</p>
              </div>
            </div>
            <p className="mt-4 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Workspace
            </p>
            <ul className="mt-1.5 space-y-0.5 text-sm">
              {[
                { label: "Invoices", active: true },
                { label: "Estimates", active: false },
                { label: "Clients", active: false },
                { label: "Follow-ups", active: false },
                { label: "Time", active: false },
                { label: "QR codes", active: false },
              ].map((item) => (
                <li
                  key={item.label}
                  className={cn(
                    "rounded-md px-2 py-1.5",
                    item.active
                      ? "bg-background font-medium text-foreground shadow-sm ring-1 ring-border/70"
                      : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </li>
              ))}
            </ul>
            <div className="mt-auto rounded-lg border border-border/70 bg-background/80 p-3">
              <p className="text-[11px] font-medium">Open balance</p>
              <p className="mt-0.5 font-heading text-lg font-semibold tabular-nums">$2,010</p>
              <p className="text-[10px] text-muted-foreground">3 unpaid invoices</p>
            </div>
          </aside>

          <div className="flex min-w-0 flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
              <div>
                <h3 className="font-heading text-base font-semibold tracking-tight">Invoices</h3>
                <p className="text-xs text-muted-foreground">12 this month</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground sm:inline">
                  Filter
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
                  <FileTextIcon className="size-3" />
                  New invoice
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium sm:px-5">Number</th>
                    <th className="px-3 py-2.5 font-medium">Client</th>
                    <th className="px-3 py-2.5 font-medium">Due</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 text-right font-medium sm:px-5">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={row.number}
                      className={cn(
                        "border-b border-border/70 last:border-0",
                        i === 0 && "bg-muted/40",
                      )}
                    >
                      <td className="px-4 py-2.5 font-medium tabular-nums sm:px-5">
                        {row.number}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{row.client}</td>
                      <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                        {row.due}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusPill status={row.status} />
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums sm:px-5">
                        {row.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/30 px-4 py-2.5 sm:px-5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                <SparklesIcon className="size-3 text-primary" />
                INV-0042 drafted from notes
              </span>
              <span className="inline-flex rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                Pay link ready
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "Paid"
      ? "bg-success/12 text-success"
      : status === "Overdue"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", tone)}>
      {status}
    </span>
  );
}

function AiStrip() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm ring-1 ring-foreground/5">
      <div className="border-b border-border px-4 py-3 text-xs font-medium text-muted-foreground">
        Your notes
      </div>
      <p className="px-4 py-4 text-sm leading-relaxed text-foreground/85">
        “enlevé le carrelage 2 salles de bain 300$ chacune, posé du placo 600, peinture 420.
        remise 10% si payé cette semaine.”
      </p>
      <div className="flex items-center justify-center gap-2 border-y border-border bg-muted/40 py-2.5 text-xs font-medium text-primary">
        <SparklesIcon className="size-3.5" />
        Translates &amp; structures
      </div>
      <div className="space-y-2 px-4 py-4 text-sm">
        {[
          ["Tile removal — 2 bathrooms", "$600.00"],
          ["Drywall installation", "$600.00"],
          ["Painting", "$420.00"],
          ["Discount (10%)", "−$162.00"],
        ].map(([label, amount]) => (
          <div key={label} className="flex justify-between gap-4">
            <span className="text-muted-foreground">{label}</span>
            <span className="tabular-nums">{amount}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-border pt-2 font-medium">
          <span>Total</span>
          <span className="tabular-nums">$1,458.00</span>
        </div>
      </div>
    </div>
  );
}

function CollectPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm ring-1 ring-foreground/5">
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs font-medium text-muted-foreground">Public invoice</p>
        <p className="font-heading text-sm font-semibold">INV-0042 · Rivera Homes</p>
      </div>
      <div className="space-y-4 p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Balance due</p>
            <p className="font-heading text-2xl font-semibold tabular-nums">$1,620.00</p>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            Due Aug 28
          </span>
        </div>
        <div className="h-9 rounded-lg bg-primary text-center text-sm font-medium leading-9 text-primary-foreground">
          Pay with card
        </div>
        <div className="grid grid-cols-2 gap-2 text-center text-[11px] text-muted-foreground">
          <div className="rounded-lg border border-border px-2 py-2">Remind in 3 days</div>
          <div className="rounded-lg border border-border px-2 py-2">Offer 2-part plan</div>
        </div>
      </div>
    </div>
  );
}

function QrPreview() {
  const types = [
    { label: "Wi‑Fi", icon: WifiIcon },
    { label: "Menu", icon: FileTextIcon },
    { label: "Business", icon: Link2Icon },
    { label: "Pay link", icon: CreditCardIcon },
  ] as const;

  // Stylized QR finder pattern — decorative mock, not a scannable code
  const cells = [
    [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0],
    [0, 1, 0, 1, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1],
    [1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 0, 1, 0, 0],
    [0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0],
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm ring-1 ring-foreground/5">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Guest Wi‑Fi</p>
          <p className="font-heading text-sm font-semibold">Active · 128 scans</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-1 text-[11px] font-medium text-success">
          <WifiIcon className="size-3" />
          Live
        </span>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <div
          aria-hidden
          className="mx-auto grid size-[11.5rem] shrink-0 gap-px rounded-lg border border-border bg-background p-2.5 shadow-inner"
          style={{ gridTemplateColumns: "repeat(19, minmax(0, 1fr))" }}
        >
          {cells.flatMap((row, y) =>
            row.map((on, x) => (
              <span
                key={`${y}-${x}`}
                className={cn("aspect-square rounded-[1px]", on ? "bg-foreground" : "bg-transparent")}
              />
            )),
          )}
        </div>

        <div className="min-w-0 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground">Opens</p>
            <p className="mt-0.5 text-sm font-medium">Join Café Norte · Guest network</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Same printout. New password next month — no reprint.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {types.map((type) => (
              <span
                key={type.label}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground"
              >
                <type.icon className="size-3" />
                {type.label}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Plus PDFs, events, coupons, and socials — all editable after you print.
          </p>
        </div>
      </div>
    </div>
  );
}
