"use client";

import { useState } from "react";
import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing/reveal";
import { PlansComparisonTable } from "@/features/settings/components/plans-comparison-table";
import { billingButtonClassName } from "@/features/settings/lib/billing-ui";
import {
  formatPlanPriceLabel,
  getProPriceDisplay,
  getProYearlySavings,
  LANDING_PLANS,
  PRO_PRICING,
  type BillingInterval,
} from "@/features/settings/lib/plans-catalog";
import { cn } from "@/lib/utils";

const landingBtn =
  "rounded-full px-6 transition-[transform,box-shadow,background-color,border-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-colors motion-reduce:hover:translate-y-0";

const landingBtnPrimary = cn(
  landingBtn,
  "hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-[0_10px_28px_-10px_color-mix(in_oklch,var(--primary)_60%,transparent)] active:translate-y-0 active:shadow-none",
);

const landingBtnOutline = cn(
  landingBtn,
  "hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/5 hover:text-foreground hover:shadow-sm active:translate-y-0 active:shadow-none",
);

const landingH = "landing-display text-4xl sm:text-6xl";

type LandingPricingProps = {
  proCta: string;
};

export function LandingPricing({ proCta }: LandingPricingProps) {
  const [interval, setInterval] = useState<BillingInterval>("yearly");
  const [compareOpen, setCompareOpen] = useState(false);
  const savings = getProYearlySavings();
  const proDisplay = getProPriceDisplay(interval);

  return (
    <section id="pricing" className="landing-section landing-section-rule scroll-mt-20">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <Reveal className="mx-auto max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Pricing
          </p>
          <h2 className={cn(landingH, "mt-3")}>Start free. Upgrade when it pays off.</h2>
          <p className="mt-4 text-muted-foreground">
            No credit card to begin. Cancel anytime.
          </p>
        </Reveal>

        <Reveal delay={60} className="mt-10 flex justify-center">
          <PeriodToggle
            interval={interval}
            onChange={setInterval}
            savePercent={savings.percent}
          />
        </Reveal>

        <div className="mx-auto mt-14 grid max-w-4xl items-stretch gap-6 md:grid-cols-2 md:gap-5">
          {LANDING_PLANS.map((plan, index) => {
            const featured = plan.highlighted;
            const price = formatPlanPriceLabel(featured ? "PRO" : "FREE", interval);
            const showYearlyDeal = featured && interval === "yearly";

            return (
              <Reveal
                key={plan.name}
                delay={80 + index * 70}
                className={cn("relative flex", featured && "md:-mt-3 md:mb-3")}
              >
                <article
                  className={cn(
                    "relative flex w-full flex-col overflow-hidden rounded-[1.75rem] border p-7 md:p-8",
                    featured
                      ? "border-primary/35 bg-gradient-to-b from-primary/10 via-background to-background shadow-[0_28px_64px_-28px_color-mix(in_oklch,var(--primary)_50%,transparent)] ring-1 ring-primary/20"
                      : "border-border bg-background",
                  )}
                >
                  {featured ? (
                    <>
                      <div className="absolute inset-x-0 top-0 h-1 bg-primary" aria-hidden />
                      <span className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold tracking-wide text-primary-foreground">
                        Most popular
                      </span>
                    </>
                  ) : null}

                  <div className={cn(featured && "pt-2")}>
                    <h3 className="font-heading text-lg font-semibold">{plan.name}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">{plan.description}</p>
                  </div>

                  <div className="mt-7">
                    <p className="flex flex-wrap items-end gap-x-2 gap-y-1">
                      {showYearlyDeal ? (
                        <span className="mb-1 font-heading text-2xl font-semibold text-muted-foreground/70 line-through">
                          {PRO_PRICING.monthly.perMonthLabel}
                        </span>
                      ) : null}
                      <span className="font-heading text-5xl font-semibold tracking-tight">
                        {price.amount}
                      </span>
                      <span className="mb-1.5 text-sm text-muted-foreground">/mo</span>
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {featured
                        ? showYearlyDeal
                          ? `Billed ${PRO_PRICING.yearly.yearlyTotalLabel} yearly · save ${savings.amountLabel}`
                          : proDisplay.detail
                        : "Free forever"}
                    </p>
                  </div>

                  <PlanCta featured={featured} freeLabel={plan.cta} proLabel={proCta} />

                  <ul className="mt-8 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm">
                        <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={160} className="mt-10 text-center">
          <button
            type="button"
            aria-expanded={compareOpen}
            aria-controls="plan-compare"
            onClick={() => setCompareOpen((open) => !open)}
            className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Compare plans
            <ChevronDownIcon
              className={cn(
                "size-4 transition-transform duration-200",
                compareOpen && "rotate-180",
              )}
            />
          </button>
        </Reveal>

        {compareOpen ? (
          <div
            id="plan-compare"
            className="mx-auto mt-8 max-w-4xl rounded-2xl border border-border bg-background p-4 md:p-6"
          >
            <PlansComparisonTable
              interval={interval}
              onIntervalChange={setInterval}
              hasYearlyPrice
              freeAction={
                <>
                  <SignedOut>
                    <Button
                      variant="ghost"
                      className={cn("w-full cursor-pointer", billingButtonClassName)}
                      render={<Link href="/sign-up" />}
                    >
                      Start for free
                    </Button>
                  </SignedOut>
                  <SignedIn>
                    <Button
                      variant="ghost"
                      className={cn("w-full cursor-pointer", billingButtonClassName)}
                      render={<Link href="/dashboard" />}
                    >
                      Open dashboard
                    </Button>
                  </SignedIn>
                </>
              }
              proAction={
                <>
                  <SignedOut>
                    <Button
                      className={cn("w-full cursor-pointer", billingButtonClassName)}
                      render={<Link href="/sign-up" />}
                    >
                      {proCta}
                    </Button>
                  </SignedOut>
                  <SignedIn>
                    <Button
                      className={cn("w-full cursor-pointer", billingButtonClassName)}
                      render={<Link href="/settings/billing/plans" />}
                    >
                      View plans
                    </Button>
                  </SignedIn>
                </>
              }
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PeriodToggle({
  interval,
  onChange,
  savePercent,
}: {
  interval: BillingInterval;
  onChange: (interval: BillingInterval) => void;
  savePercent: number;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Billing period"
      className="inline-flex rounded-full border border-border bg-muted/50 p-1"
    >
      {(
        [
          { id: "monthly", label: "Monthly" },
          { id: "yearly", label: "Yearly" },
        ] as const
      ).map((option) => {
        const selected = interval === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.id)}
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors",
              selected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
            {option.id === "yearly" ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/10 text-primary",
                )}
              >
                −{savePercent}%
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function PlanCta({
  featured,
  freeLabel,
  proLabel,
}: {
  featured: boolean;
  freeLabel: string;
  proLabel: string;
}) {
  const className = cn(
    "mt-7 w-full",
    featured ? landingBtnPrimary : landingBtnOutline,
  );

  return (
    <>
      <SignedOut>
        <Button
          className={className}
          size="lg"
          variant={featured ? "default" : "outline"}
          render={<Link href="/sign-up" />}
        >
          {featured ? proLabel : freeLabel}
        </Button>
      </SignedOut>
      <SignedIn>
        <Button
          className={className}
          size="lg"
          variant={featured ? "default" : "outline"}
          render={
            <Link href={featured ? "/settings/billing/plans" : "/dashboard"} />
          }
        >
          {featured ? "View plans" : "Open dashboard"}
        </Button>
      </SignedIn>
    </>
  );
}
