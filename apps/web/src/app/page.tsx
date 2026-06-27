import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import {
  ArrowRightIcon,
  CheckIcon,
  ClipboardListIcon,
  FileTextIcon,
  GlobeIcon,
  LayoutTemplateIcon,
  MailIcon,
  PenLineIcon,
  SendIcon,
  ShieldCheckIcon,
  SparklesIcon,
  WalletIcon,
  ZapIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing/reveal";
import { ThemeToggle } from "@/components/theme-toggle";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

const stats = [
  { value: "30 sec", label: "to a finished invoice" },
  { value: "20+", label: "languages understood" },
  { value: "100%", label: "free to start" },
];

const features = [
  {
    icon: SparklesIcon,
    title: "Describe it, send it",
    body: "Type the job in plain words — even another language — and AI drafts a clean, itemized invoice for you.",
  },
  {
    icon: GlobeIcon,
    title: "Any language in, English out",
    body: "Rough French or Spanish notes become professional English line items with quantities, rates, and totals.",
  },
  {
    icon: LayoutTemplateIcon,
    title: "Templates that look the part",
    body: "Pick a polished template, drop in your logo, and every PDF looks like it came from a real business.",
  },
  {
    icon: ClipboardListIcon,
    title: "Estimates to invoices",
    body: "Send a quote, and turn it into an invoice the moment your client says yes — no re-typing.",
  },
  {
    icon: WalletIcon,
    title: "Know what you're owed",
    body: "Track drafts, sent, viewed, paid, and overdue at a glance so nothing slips through the cracks.",
  },
  {
    icon: MailIcon,
    title: "Email straight to clients",
    body: "Send a branded PDF in one click and follow up without leaving the app.",
  },
];

const steps = [
  {
    icon: PenLineIcon,
    title: "Describe the work",
    body: "Type rough notes, paste a message, or fill the form. Mention amounts like “$300 x 2” and we'll do the math.",
  },
  {
    icon: SparklesIcon,
    title: "AI builds the invoice",
    body: "We translate, structure, and price everything into clean line items you can review and tweak.",
  },
  {
    icon: SendIcon,
    title: "Send and get paid",
    body: "Download a professional PDF or email it to your client, then track it through to payment.",
  },
];

const testimonials = [
  {
    quote:
      "I jot down the job on my phone between appointments and the invoice is ready before I'm back in the van. It pays for itself in time alone.",
    name: "Marcus T.",
    role: "Handyman",
  },
  {
    quote:
      "My notes are half French, half English. Easy Invoice turns them into something I'm proud to send clients.",
    name: "Amélie R.",
    role: "House cleaning",
  },
  {
    quote:
      "Estimates that convert to invoices in one click changed how fast I get paid. No more re-typing everything.",
    name: "Devon K.",
    role: "Landscaping",
  },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    description: "Everything you need to invoice your first clients.",
    features: [
      "Unlimited invoices & estimates",
      "AI describe-to-invoice",
      "Professional PDF templates",
      "Client management",
    ],
    cta: "Start for free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$12",
    cadence: "per month",
    description: "For busy businesses that bill every day.",
    features: [
      "Everything in Free",
      "Custom branding & logo on every PDF",
      "Email invoices & payment tracking",
      "Priority support",
    ],
    cta: "Start free trial",
    highlighted: true,
  },
];

const faqs = [
  {
    q: "Do I need an accountant or any experience?",
    a: "Not at all. If you can describe the work you did, you can make an invoice. Easy Invoice handles the formatting, math, and wording for you.",
  },
  {
    q: "Does it really work in other languages?",
    a: "Yes. Write your notes in the language you think in — French, Spanish, and more — and we translate them into clean, professional English invoices.",
  },
  {
    q: "Will my invoices look professional?",
    a: "Every invoice uses a polished template with your logo and business details, exported as a crisp PDF your clients can pay against.",
  },
  {
    q: "Is it free to start?",
    a: "Yes. You can create and send invoices on the free plan with no credit card. Upgrade only when you want custom branding and payment tracking.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <span className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileTextIcon className="size-4" />
            </span>
            Easy Invoice
          </span>
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <SignedOut>
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
                render={<Link href="/sign-in" />}
              >
                Sign in
              </Button>
              <Button size="sm" render={<Link href="/sign-up" />}>
                Get started
              </Button>
            </SignedOut>
            <SignedIn>
              <Button variant="ghost" size="sm" render={<Link href="/dashboard" />}>
                Dashboard
              </Button>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/60">
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-accent/50 to-transparent" />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-16 md:pt-24 lg:grid-cols-2">
            <div>
              <span className="inline-flex animate-in fade-in slide-in-from-bottom-3 items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground duration-700">
                <SparklesIcon className="size-3.5 text-primary" />
                AI-powered invoicing for small businesses
              </span>
              <h1 className="mt-6 animate-in fade-in slide-in-from-bottom-4 font-heading text-4xl font-semibold leading-[1.05] tracking-tight duration-700 [animation-delay:80ms] [animation-fill-mode:both] sm:text-5xl lg:text-6xl">
                Describe the job.
                <br />
                <span className="text-primary">Send the invoice.</span>
              </h1>
              <p className="mt-6 max-w-xl animate-in fade-in slide-in-from-bottom-4 text-lg text-muted-foreground duration-700 [animation-delay:160ms] [animation-fill-mode:both]">
                Create professional invoices in any language — by form or by simply
                describing the work. Built for handymen, cleaners, and small businesses
                who want to get paid without the paperwork.
              </p>
              <div className="mt-9 flex flex-wrap gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 [animation-delay:240ms] [animation-fill-mode:both]">
                <Button size="lg" render={<Link href="/sign-up" />}>
                  Start for free
                  <ArrowRightIcon className="size-4" />
                </Button>
                <Button size="lg" variant="outline" render={<Link href="#how" />}>
                  See how it works
                </Button>
              </div>
              <p className="mt-4 flex items-center gap-2 animate-in fade-in text-sm text-muted-foreground duration-700 [animation-delay:320ms] [animation-fill-mode:both]">
                <CheckIcon className="size-4 text-success" />
                No credit card required — free forever plan
              </p>
            </div>

            <div className="animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-1000 [animation-delay:200ms] [animation-fill-mode:both]">
              <HeroPreview />
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-6 pb-14">
            <Reveal className="grid grid-cols-3 gap-4 rounded-2xl border border-border bg-card/60 p-6">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{stat.label}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24">
          <SectionHeading
            eyebrow="Features"
            title="Everything you need to bill like a pro"
            description="No bloat, no learning curve. Just the tools that turn finished work into money in the bank."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Reveal key={feature.title} delay={(index % 3) * 90} className="h-full">
                <div className="group h-full rounded-xl border border-border bg-card p-6 ring-1 ring-foreground/[0.03] transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                    <feature.icon className="size-5" />
                  </div>
                  <h3 className="mt-4 font-heading text-base font-medium">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {feature.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 border-y border-border/60 bg-muted/30">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <SectionHeading
              eyebrow="How it works"
              title="From rough notes to paid invoice"
              description="Three steps. A minute of your time. No spreadsheets in sight."
            />
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {steps.map((step, index) => (
                <Reveal key={step.title} delay={index * 120} className="h-full">
                  <div className="relative h-full rounded-xl border border-border bg-card p-6">
                    <span className="absolute right-5 top-5 font-heading text-4xl font-semibold text-border">
                      {index + 1}
                    </span>
                    <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <step.icon className="size-5" />
                    </div>
                    <h3 className="mt-5 font-heading text-lg font-medium">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* AI showcase */}
        <section className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                The magic
              </span>
              <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                Write like you talk.
                <br />
                We'll make it official.
              </h2>
              <p className="mt-5 text-muted-foreground">
                Skip the line-by-line data entry. Describe the job the way you'd text a
                friend — Easy Invoice figures out the items, quantities, rates, discounts,
                and totals, then writes it up in clean, professional English.
              </p>
              <ul className="mt-7 space-y-3">
                {[
                  "Understands amounts like “$300 x 2 rooms”",
                  "Turns “10% off if paid this week” into a real discount",
                  "Translates other languages automatically",
                  "You stay in control — review and edit before sending",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                      <CheckIcon className="size-3.5" />
                    </span>
                    <span className="text-foreground/90">{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={120}>
              <AiShowcase />
            </Reveal>
          </div>
        </section>

        {/* Testimonials */}
        <section className="border-y border-border/60 bg-muted/30">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <SectionHeading
              eyebrow="Loved by busy people"
              title="Built for the people doing the work"
              description="Tradespeople and small businesses who'd rather be on the job than at a desk."
            />
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {testimonials.map((testimonial, index) => (
                <Reveal key={testimonial.name} delay={index * 110} className="h-full">
                  <figure className="flex h-full flex-col rounded-xl border border-border bg-card p-6">
                    <blockquote className="flex-1 text-sm leading-relaxed text-foreground/90">
                      “{testimonial.quote}”
                    </blockquote>
                    <figcaption className="mt-5 flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-full bg-accent font-heading text-sm font-semibold text-accent-foreground">
                        {testimonial.name.charAt(0)}
                      </span>
                      <span className="text-sm">
                        <span className="block font-medium">{testimonial.name}</span>
                        <span className="block text-muted-foreground">{testimonial.role}</span>
                      </span>
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24">
          <SectionHeading
            eyebrow="Pricing"
            title="Start free. Upgrade when it pays off."
            description="No credit card to begin. Cancel anytime."
          />
          <div className="mx-auto mt-12 grid max-w-3xl gap-6 md:grid-cols-2">
            {plans.map((plan, index) => (
              <Reveal
                key={plan.name}
                delay={index * 120}
                className={
                  plan.highlighted
                    ? "relative rounded-2xl border-2 border-primary bg-card p-7 shadow-sm"
                    : "relative rounded-2xl border border-border bg-card p-7"
                }
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Most popular
                  </span>
                )}
                <h3 className="font-heading text-lg font-semibold">{plan.name}</h3>
                <p className="mt-3 flex items-baseline gap-1.5">
                  <span className="font-heading text-4xl font-semibold tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground">/ {plan.cadence}</span>
                </p>
                <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-7 w-full"
                  size="lg"
                  variant={plan.highlighted ? "default" : "outline"}
                  render={<Link href="/sign-up" />}
                >
                  {plan.cta}
                </Button>
              </Reveal>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t border-border/60 bg-muted/30">
          <div className="mx-auto max-w-3xl px-6 py-24">
            <SectionHeading
              eyebrow="FAQ"
              title="Questions, answered"
              description="Everything you might want to know before you start."
            />
            <Reveal className="mt-10 divide-y divide-border rounded-xl border border-border bg-card">
              {faqs.map((faq) => (
                <details key={faq.q} className="group px-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-medium [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="pb-5 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                </details>
              ))}
            </Reveal>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-6 py-24">
          <Reveal className="relative overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center text-primary-foreground sm:px-12">
            <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary-foreground/10 blur-2xl" />
            <h2 className="mx-auto max-w-2xl font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              Your next invoice is a sentence away
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
              Join the small businesses getting paid faster with less paperwork. Free to
              start, no credit card.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                size="lg"
                variant="secondary"
                render={<Link href="/sign-up" />}
              >
                Create your first invoice
                <ArrowRightIcon className="size-4" />
              </Button>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2 font-heading font-semibold tracking-tight">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FileTextIcon className="size-3.5" />
            </span>
            Easy Invoice
          </span>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Easy Invoice. Simple invoicing for small businesses.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <SignedOut>
              <Link href="/sign-in" className="transition-colors hover:text-foreground">
                Sign in
              </Link>
              <Link href="/sign-up" className="transition-colors hover:text-foreground">
                Get started
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard" className="transition-colors hover:text-foreground">
                Dashboard
              </Link>
            </SignedIn>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
        {eyebrow}
      </span>
      <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {description && <p className="mt-4 text-muted-foreground">{description}</p>}
    </Reveal>
  );
}

function HeroPreview() {
  const lines = [
    { label: "Tile removal — 2 bathrooms", amount: "$600.00" },
    { label: "Drywall installation", amount: "$600.00" },
    { label: "Paint & finishing", amount: "$420.00" },
  ];

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-tr from-primary/15 to-accent/30 blur-2xl" />
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xl ring-1 ring-foreground/5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileTextIcon className="size-4.5" />
            </div>
            <p className="mt-3 font-heading text-lg font-semibold">Invoice</p>
            <p className="text-xs text-muted-foreground">#INV-0042</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 text-xs font-medium text-success">
            <span className="size-1.5 rounded-full bg-success" />
            Paid
          </span>
        </div>

        <div className="mt-6 space-y-1 border-t border-border pt-4">
          {lines.map((line) => (
            <div key={line.label} className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-foreground/80">{line.label}</span>
              <span className="font-medium tabular-nums">{line.amount}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-heading text-xl font-semibold tabular-nums">$1,620.00</span>
        </div>
      </div>

      <div className="animate-float absolute -bottom-5 -left-5 hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-lg sm:flex">
        <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <ShieldCheckIcon className="size-4" />
        </span>
        <span className="text-xs font-medium">Sent &amp; tracked</span>
      </div>
      <div className="animate-float absolute -right-4 top-8 hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-lg [animation-delay:1.5s] sm:flex">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ZapIcon className="size-4" />
        </span>
        <span className="text-xs font-medium">Built in 30s</span>
      </div>
    </div>
  );
}

function AiShowcase() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm ring-1 ring-foreground/5">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <PenLineIcon className="size-3.5" />
        Your notes
      </div>
      <div className="mt-2 rounded-lg border border-border bg-muted/40 p-4 text-sm leading-relaxed text-foreground/80">
        “enlevé le carrelage 2 salles de bain 300$ chacune, posé du placo 600, peinture
        420. remise 10% si payé cette semaine.”
      </div>

      <div className="my-4 flex items-center justify-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          <SparklesIcon className="size-3.5" />
          AI translates &amp; structures
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <FileTextIcon className="size-3.5" />
        Your invoice
      </div>
      <div className="mt-2 space-y-1.5 rounded-lg border border-border p-4">
        {[
          { label: "Tile removal — 2 bathrooms", amount: "$600.00" },
          { label: "Drywall installation", amount: "$600.00" },
          { label: "Painting", amount: "$420.00" },
          { label: "Discount (10%)", amount: "-$162.00", muted: true },
        ].map((row) => (
          <div
            key={row.label}
            className={`flex items-center justify-between text-sm ${
              row.muted ? "text-muted-foreground" : ""
            }`}
          >
            <span>{row.label}</span>
            <span className="font-medium tabular-nums">{row.amount}</span>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
          <span>Total</span>
          <span className="tabular-nums">$1,458.00</span>
        </div>
      </div>
    </div>
  );
}
