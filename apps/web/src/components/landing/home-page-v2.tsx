import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import {
  ArrowRightIcon,
  CheckIcon,
  CreditCardIcon,
  Link2Icon,
  QrCodeIcon,
  SparklesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PublicNavbarLoader } from "@/components/public-navbar-loader";
import { Reveal } from "@/components/landing/reveal";
import { HeroDepth, LandingParallax } from "@/components/landing/hero-depth";
import { AiDraftShowcase, CollectShowcase } from "@/components/landing/landing-showcase";
import { ProductCanvas } from "@/components/landing/product-canvas";
import { QrTypeGrid } from "@/components/landing/qr-type-grid";
import { FaqAccordion } from "@/components/landing/faq-accordion";
import { MoneyFlowIllustration } from "@/components/landing/money-flow-illustration";
import { LANDING_PLANS, getLandingProCta } from "@/features/settings/lib/plans-catalog";
import { getProTrialDays } from "@/lib/stripe-billing";
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

const landingH = "landing-display text-4xl sm:text-6xl";
const landingProCta = getLandingProCta(getProTrialDays());

/**
 * Product-forward landing (v2). Uses app theme tokens so light/dark works.
 * Switch: NEXT_PUBLIC_LANDING_VERSION=v1|v2
 */
export function HomePageV2() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbarLoader />

      <LandingParallax>
        {/* Hero */}
        <section className="landing-section relative">
          <div className="relative mx-auto max-w-5xl px-6 pb-20 pt-16 text-center md:pb-24 md:pt-24 lg:pb-14">
            <h1 className="landing-hero-in landing-display text-4xl sm:text-6xl lg:text-7xl">
              Describe the job in a sentence.
              <br />
              Send the invoice. <span className="text-primary">Get paid.</span>
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

          <div className="relative mx-auto hidden max-w-6xl px-4 pb-20 md:px-6 md:pb-28 lg:block">
            <div className="landing-hero-in" style={{ animationDelay: "280ms" }}>
              <HeroDepth>
                <ProductCanvas />
              </HeroDepth>
            </div>
          </div>
        </section>

        {/* Capability row */}
        <section className="landing-section landing-section-rule">
          <div className="mx-auto grid max-w-6xl gap-4 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5 lg:py-16">
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
              <Reveal
                key={item.title}
                delay={i * 60}
                className="rounded-2xl border border-border bg-background px-5 py-6"
              >
                <item.icon className="size-5 text-primary" />
                <h2 className="mt-4 font-heading text-base font-semibold tracking-tight">
                  {item.title}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* AI draft */}
        <section id="features" className="landing-section landing-section-rule scroll-mt-20">
          <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                AI draft
              </p>
              <h2 className={cn(landingH, "mt-5")}>
                Type it like a text.
                <br />
                Send it like a firm.
              </h2>
              <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
                Paste the job the way you&apos;d text a crew lead. Invoice Desk structures
                quantities, rates, and discounts — you review once and send.
              </p>
            </Reveal>
            <Reveal delay={80} className="mt-12">
              <AiDraftShowcase />
            </Reveal>
          </div>
        </section>

        {/* How */}
        <section id="how" className="landing-section landing-section-rule scroll-mt-20">
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
            <Reveal className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                How it works
              </p>
              <h2 className={cn(landingH, "mt-3")}>
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
                  <li className="relative border-t border-border/70 pt-6">
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

        {/* Path map */}
        <section className="landing-section landing-section-rule">
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                Paths to paid
              </p>
              <h2 className={cn(landingH, "mt-3")}>
                Many ways to bill. One place you get paid.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Start from a client, estimate, project hours, expenses, or a recurring
                schedule — then collect with checkout, reminders, and follow-ups.
              </p>
            </Reveal>
            <Reveal delay={120} className="mt-12 md:mt-14">
              <MoneyFlowIllustration />
            </Reveal>
          </div>
        </section>

        {/* Get paid */}
        <section className="landing-section landing-section-rule landing-band">
          <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Get paid
              </p>
              <h2 className={cn(landingH, "mt-5")}>
                Checkout. Remind. Close.
              </h2>
              <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
                Connect Stripe so clients pay online. Automatic reminders keep invoices
                moving. Follow-ups and payment plans handle the awkward middle.
              </p>
            </Reveal>
            <Reveal delay={80} className="mt-14">
              <CollectShowcase />
            </Reveal>
          </div>
        </section>

        {/* QR codes — destination grid */}
        <section id="qr" className="landing-section landing-section-rule scroll-mt-20">
          <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
            <Reveal className="grid items-end gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  QR codes
                </p>
                <h2 className={cn(landingH, "mt-5")}>
                  Print once.
                  <br />
                  Change anything.
                </h2>
                <p className="mt-5 max-w-md text-muted-foreground">
                  One short link behind the van door, the counter, the table tent. Update
                  the destination without reprinting. Count every scan.
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-8 border-t border-border pt-8 lg:border-t-0 lg:pt-0">
                <div>
                  <dt className="landing-display text-5xl text-primary sm:text-6xl">0</dt>
                  <dd className="mt-2 text-sm text-muted-foreground">reprints when the password changes</dd>
                </div>
                <div>
                  <dt className="landing-display text-5xl sm:text-6xl">1</dt>
                  <dd className="mt-2 text-sm text-muted-foreground">printout. Any destination.</dd>
                </div>
              </dl>
            </Reveal>

            <Reveal delay={80}>
              <QrTypeGrid />
            </Reveal>

            <Reveal delay={120} className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4">
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
              <p className="text-sm text-muted-foreground">
                5 codes on Free · unlimited on Pro
              </p>
            </Reveal>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="landing-section landing-section-rule scroll-mt-20">
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
            <Reveal className="mx-auto max-w-xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                Pricing
              </p>
              <h2 className={cn(landingH, "mt-3")}>
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
                      ? "border-primary/40 bg-background ring-1 ring-primary/15"
                      : "border-border bg-background",
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
                      {plan.highlighted ? landingProCta : plan.cta}
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
                          href={plan.highlighted ? "/settings/billing/plans" : "/dashboard"}
                        />
                      }
                    >
                      {plan.highlighted ? "View plans" : "Open dashboard"}
                    </Button>
                  </SignedIn>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="landing-section landing-section-rule scroll-mt-20">
          <div className="mx-auto max-w-2xl px-6 py-20 md:py-28">
            <Reveal className="text-center">
              <h2 className={landingH}>FAQ</h2>
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
        <section className="landing-section landing-section-rule landing-cta">
          <div className="mx-auto max-w-3xl px-6 py-24 text-center md:py-32">
            <Reveal>
              <h2 className={landingH}>
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
      </LandingParallax>

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
