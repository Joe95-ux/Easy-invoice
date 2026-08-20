import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import {
  ArrowRightIcon,
  CheckIcon,
  SparklesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PublicNavbarLoader } from "@/components/public-navbar-loader";
import { Reveal } from "@/components/landing/reveal";
import { FaqAccordion } from "@/components/landing/faq-accordion";
import { LANDING_PLANS } from "@/features/settings/lib/plans-catalog";
import { cn } from "@/lib/utils";

/**
 * Linear-inspired demonstrative landing — product-forward, sparse copy,
 * full-bleed hero canvas. Switch via NEXT_PUBLIC_LANDING_VERSION=v1|v2.
 */
export function HomePageV2() {
  return (
    <div className="landing-v2 min-h-screen bg-[var(--lv2-bg)] text-[var(--lv2-fg)]">
      <PublicNavbarLoader />

      <main>
        {/* Hero — one composition: brand, headline, line, CTAs, product plane */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,oklch(0.45_0.08_200_/_0.35),transparent_55%),radial-gradient(ellipse_60%_40%_at_90%_20%,oklch(0.4_0.06_160_/_0.2),transparent_50%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />

          <div className="relative mx-auto max-w-5xl px-6 pb-10 pt-16 text-center md:pt-24">
            <p className="animate-in fade-in slide-in-from-bottom-2 font-heading text-sm font-semibold tracking-[0.08em] text-[var(--lv2-muted)] duration-700">
              Invoice Desk
            </p>
            <h1 className="mt-5 animate-in fade-in slide-in-from-bottom-3 font-heading text-[2.6rem] font-semibold leading-[1.05] tracking-tight duration-700 [animation-delay:60ms] [animation-fill-mode:both] sm:text-6xl md:text-7xl">
              Describe the job.
              <br />
              <span className="text-[var(--lv2-accent)]">Get paid.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl animate-in fade-in slide-in-from-bottom-3 text-base text-[var(--lv2-muted)] duration-700 [animation-delay:120ms] [animation-fill-mode:both] sm:text-lg">
              AI invoicing for trades and small businesses — drafts, sends, and tracks
              payment without the paperwork.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-700 [animation-delay:180ms] [animation-fill-mode:both]">
              <Button
                size="lg"
                className="rounded-full bg-[var(--lv2-accent)] text-[var(--lv2-accent-fg)] hover:bg-[var(--lv2-accent)]/90"
                render={<Link href="/sign-up" />}
              >
                Start for free
                <ArrowRightIcon className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="rounded-full text-[var(--lv2-muted)] hover:bg-white/5 hover:text-[var(--lv2-fg)]"
                render={<Link href="#product" />}
              >
                See the product
              </Button>
            </div>
            <p className="mt-5 animate-in fade-in text-sm text-[var(--lv2-muted)] duration-700 [animation-delay:240ms] [animation-fill-mode:both]">
              Free plan · No credit card
            </p>
          </div>

          <div
            id="product"
            className="relative mx-auto max-w-6xl scroll-mt-20 px-4 pb-20 md:px-6"
          >
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000 [animation-delay:280ms] [animation-fill-mode:both]">
              <ProductCanvas />
            </div>
          </div>
        </section>

        {/* One capability */}
        <section id="features" className="border-t border-white/5">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-2 lg:items-center lg:gap-16">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--lv2-accent)]">
                AI draft
              </p>
              <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                Rough notes in.
                <br />
                Client-ready invoice out.
              </h2>
              <p className="mt-4 max-w-md text-[var(--lv2-muted)]">
                Paste the job in any language. Invoice Desk structures line items, rates,
                and discounts — you review and send.
              </p>
            </Reveal>
            <Reveal delay={100}>
              <AiStrip />
            </Reveal>
          </div>
        </section>

        {/* How — three beats, no cards */}
        <section id="how" className="border-t border-white/5 bg-black/20">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <Reveal className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--lv2-accent)]">
                How it works
              </p>
              <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                Three steps to paid
              </h2>
            </Reveal>
            <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
              {[
                {
                  n: "01",
                  title: "Describe",
                  body: "Type the work the way you’d text a crew lead — amounts included.",
                },
                {
                  n: "02",
                  title: "Review",
                  body: "AI builds the invoice. Tweak lines, branding, and due date.",
                },
                {
                  n: "03",
                  title: "Collect",
                  body: "Share a link, take card pay, remind, and track what’s owed.",
                },
              ].map((step, i) => (
                <Reveal key={step.n} delay={i * 90}>
                  <li className="relative">
                    <span className="font-mono text-xs text-[var(--lv2-muted)]">{step.n}</span>
                    <h3 className="mt-3 font-heading text-xl font-semibold tracking-tight">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--lv2-muted)]">
                      {step.body}
                    </p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Pricing — sparse */}
        <section id="pricing" className="scroll-mt-20 border-t border-white/5">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <Reveal className="mx-auto max-w-xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--lv2-accent)]">
                Pricing
              </p>
              <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                Start free. Upgrade when it pays off.
              </h2>
            </Reveal>
            <div className="mx-auto mt-14 grid max-w-3xl gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/5 md:grid-cols-2">
              {LANDING_PLANS.map((plan, index) => (
                <Reveal
                  key={plan.name}
                  delay={index * 80}
                  className={cn(
                    "flex flex-col bg-[var(--lv2-bg)] p-8",
                    plan.highlighted && "bg-[var(--lv2-panel)]",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-heading text-lg font-semibold">{plan.name}</h3>
                    {plan.highlighted ? (
                      <span className="text-xs font-medium text-[var(--lv2-accent)]">
                        Popular
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-4 flex items-baseline gap-1.5">
                    <span className="font-heading text-4xl font-semibold tracking-tight">
                      {plan.price}
                    </span>
                    <span className="text-sm text-[var(--lv2-muted)]">/ {plan.cadence}</span>
                  </p>
                  <p className="mt-2 text-sm text-[var(--lv2-muted)]">{plan.description}</p>
                  <ul className="mt-6 flex-1 space-y-2.5">
                    {plan.features.slice(0, 6).map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2.5 text-sm text-[var(--lv2-fg)]/90"
                      >
                        <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-[var(--lv2-accent)]" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <SignedOut>
                    <Button
                      className={cn(
                        "mt-8 w-full rounded-full",
                        plan.highlighted
                          ? "bg-[var(--lv2-accent)] text-[var(--lv2-accent-fg)] hover:bg-[var(--lv2-accent)]/90"
                          : "border border-white/15 bg-transparent text-[var(--lv2-fg)] hover:bg-white/5",
                      )}
                      size="lg"
                      render={<Link href="/sign-up" />}
                    >
                      {plan.cta}
                    </Button>
                  </SignedOut>
                  <SignedIn>
                    <Button
                      className={cn(
                        "mt-8 w-full rounded-full",
                        plan.highlighted
                          ? "bg-[var(--lv2-accent)] text-[var(--lv2-accent-fg)] hover:bg-[var(--lv2-accent)]/90"
                          : "border border-white/15 bg-transparent text-[var(--lv2-fg)] hover:bg-white/5",
                      )}
                      size="lg"
                      render={
                        <Link
                          href={plan.highlighted ? "/settings/billing" : "/dashboard"}
                        />
                      }
                    >
                      {plan.highlighted ? "Upgrade to Pro" : "Go to dashboard"}
                    </Button>
                  </SignedIn>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t border-white/5 bg-black/20">
          <div className="mx-auto max-w-2xl px-6 py-24">
            <Reveal className="text-center">
              <h2 className="font-heading text-3xl font-semibold tracking-tight">FAQ</h2>
              <p className="mt-3 text-[var(--lv2-muted)]">
                Quick answers before you start.
              </p>
            </Reveal>
            <Reveal className="mt-10 [&_button]:text-[var(--lv2-fg)] [&_.text-muted-foreground]:text-[var(--lv2-muted)]">
              <FaqAccordion />
            </Reveal>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="border-t border-white/5">
          <div className="mx-auto max-w-3xl px-6 py-28 text-center">
            <Reveal>
              <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-5xl">
                Your next invoice is a sentence away
              </h2>
              <p className="mx-auto mt-4 max-w-md text-[var(--lv2-muted)]">
                Free to start. Upgrade when unlimited volume and branding pay for themselves.
              </p>
              <Button
                size="lg"
                className="mt-9 rounded-full bg-[var(--lv2-accent)] text-[var(--lv2-accent-fg)] hover:bg-[var(--lv2-accent)]/90"
                render={<Link href="/sign-up" />}
              >
                Create your first invoice
                <ArrowRightIcon className="size-4" />
              </Button>
            </Reveal>
          </div>
        </section>
      </main>

      <div className="border-t border-white/5 [&_footer]:border-0 [&_a]:text-[var(--lv2-muted)] [&_p]:text-[var(--lv2-muted)]">
        <SiteFooter />
      </div>
    </div>
  );
}

function ProductCanvas() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-8 -bottom-8 top-1/3 rounded-[40%] bg-[var(--lv2-accent)]/15 blur-3xl"
      />
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[var(--lv2-panel)] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.65)]">
        <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="ml-3 text-xs text-[var(--lv2-muted)]">Invoice Desk</span>
        </div>
        <div className="grid md:grid-cols-[11rem_minmax(0,1fr)]">
          <aside className="hidden border-r border-white/8 p-4 md:block">
            <p className="px-2 text-[10px] font-medium uppercase tracking-wider text-[var(--lv2-muted)]">
              Workspace
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              {["Invoices", "Estimates", "Clients", "Follow-ups", "Time"].map((item, i) => (
                <li
                  key={item}
                  className={cn(
                    "rounded-md px-2 py-1.5",
                    i === 0
                      ? "bg-white/8 text-[var(--lv2-fg)]"
                      : "text-[var(--lv2-muted)]",
                  )}
                >
                  {item}
                </li>
              ))}
            </ul>
          </aside>
          <div className="p-4 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs text-[var(--lv2-muted)]">Invoice</p>
                <p className="font-heading text-xl font-semibold tracking-tight">INV-0042</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--lv2-accent)]/15 px-2.5 py-1 text-xs font-medium text-[var(--lv2-accent)]">
                <span className="size-1.5 rounded-full bg-[var(--lv2-accent)]" />
                Ready to send
              </span>
            </div>
            <div className="mt-6 space-y-0 divide-y divide-white/8 rounded-lg border border-white/8">
              {[
                { label: "Tile removal — 2 bathrooms", amount: "$600.00" },
                { label: "Drywall installation", amount: "$600.00" },
                { label: "Paint & finishing", amount: "$420.00" },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-4 px-3 py-2.5 text-sm"
                >
                  <span className="text-[var(--lv2-muted)]">{row.label}</span>
                  <span className="tabular-nums text-[var(--lv2-fg)]">{row.amount}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-[var(--lv2-muted)]">Total</span>
              <span className="font-heading text-2xl font-semibold tabular-nums">$1,620.00</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-[var(--lv2-muted)]">
                <SparklesIcon className="size-3 text-[var(--lv2-accent)]" />
                Drafted from notes
              </span>
              <span className="inline-flex rounded-full border border-white/10 px-3 py-1.5 text-xs text-[var(--lv2-muted)]">
                Public pay link
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AiStrip() {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[var(--lv2-panel)]">
      <div className="border-b border-white/8 px-4 py-3 text-xs text-[var(--lv2-muted)]">
        Your notes
      </div>
      <p className="px-4 py-4 text-sm leading-relaxed text-[var(--lv2-fg)]/85">
        “enlevé le carrelage 2 salles de bain 300$ chacune, posé du placo 600, peinture 420.
        remise 10% si payé cette semaine.”
      </p>
      <div className="flex items-center justify-center border-y border-white/8 bg-black/20 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--lv2-accent)]">
          <SparklesIcon className="size-3.5" />
          Translates &amp; structures
        </span>
      </div>
      <div className="space-y-2 px-4 py-4 text-sm">
        {[
          ["Tile removal — 2 bathrooms", "$600.00"],
          ["Drywall installation", "$600.00"],
          ["Painting", "$420.00"],
          ["Discount (10%)", "−$162.00"],
        ].map(([label, amount]) => (
          <div key={label} className="flex justify-between gap-4">
            <span className="text-[var(--lv2-muted)]">{label}</span>
            <span className="tabular-nums">{amount}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-white/8 pt-2 font-medium">
          <span>Total</span>
          <span className="tabular-nums">$1,458.00</span>
        </div>
      </div>
    </div>
  );
}
