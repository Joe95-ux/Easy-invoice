"use client";

import { useState, type ComponentType } from "react";
import {
  BellRingIcon,
  CreditCardIcon,
  LanguagesIcon,
  PercentIcon,
  SparklesIcon,
  SplitIcon,
} from "lucide-react";
import { AiDraftLive } from "@/components/landing/ai-draft-live";
import { cn } from "@/lib/utils";

export type ShowcasePanel = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  headline: string;
  body: string;
  stats: { value: string; unit?: string; caption: string }[];
};

type LandingShowcaseProps = {
  label: string;
  panels: readonly ShowcasePanel[];
};

/** Tabbed showcase — same structure as Get paid, theme-aware. */
export function LandingShowcase({ label, panels }: LandingShowcaseProps) {
  const [active, setActive] = useState(panels[0]?.id ?? "");
  const panel = panels.find((p) => p.id === active) ?? panels[0];
  if (!panel) return null;

  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        className="flex flex-wrap border-b border-border"
      >
        {panels.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={p.id === active}
            onClick={() => setActive(p.id)}
            className={cn(
              "relative px-4 py-4 text-left text-sm font-medium tracking-tight transition-colors sm:px-6",
              p.id === active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-2">
              <p.icon className="size-3.5" />
              {p.label}
            </span>
            {p.id === active ? (
              <span
                aria-hidden
                className="absolute inset-x-4 -bottom-px h-px bg-foreground sm:inset-x-6"
              />
            ) : null}
          </button>
        ))}
      </div>

      <div
        key={panel.id}
        role="tabpanel"
        className="landing-pop-in grid gap-10 py-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-16 lg:py-14"
      >
        <div>
          <h3 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            {panel.headline}
          </h3>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
            {panel.body}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-8 self-start border-t border-border pt-8 lg:border-t-0 lg:pt-0">
          {panel.stats.map((stat) => (
            <div key={stat.caption}>
              <dt className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
                {stat.value}
                {stat.unit ? (
                  <span className="ml-1 text-lg font-medium text-muted-foreground">
                    {stat.unit}
                  </span>
                ) : null}
              </dt>
              <dd className="mt-2 text-sm leading-snug text-muted-foreground">
                {stat.caption}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

const AI_PANELS: ShowcasePanel[] = [
  {
    id: "notes",
    label: "Notes",
    icon: SparklesIcon,
    headline: "Paste the job the way you’d text a crew lead.",
    body: "Invoice Desk reads quantities, rates, and the work itself. You review one draft — not a spreadsheet you rebuilt from memory.",
    stats: [
      { value: "1", unit: "sentence", caption: "is enough to start a draft" },
      { value: "1", unit: "pass", caption: "to check the line items and send" },
    ],
  },
  {
    id: "language",
    label: "Language",
    icon: LanguagesIcon,
    headline: "Write it in the language you used on site.",
    body: "French job notes, Spanish extras, mixed slang — it comes back structured in your invoice language. No retyping. No guesswork.",
    stats: [
      { value: "Any", caption: "language you used on the job" },
      { value: "FR → EN", caption: "structured in the invoice you send" },
    ],
  },
  {
    id: "pricing",
    label: "Pricing",
    icon: PercentIcon,
    headline: "Rates, quantities, and the discount you already promised.",
    body: "Hours, per-unit work, and early-pay discounts land as line items with a total you can send.",
    stats: [
      { value: "10%", caption: "early-pay discount parsed from the notes" },
      { value: "3", unit: "lines", caption: "from one messy sentence" },
    ],
  },
];

export function AiDraftShowcase() {
  const [active, setActive] = useState(AI_PANELS[0]?.id ?? "");
  const panel = AI_PANELS.find((p) => p.id === active) ?? AI_PANELS[0];
  if (!panel) return null;

  return (
    <div>
      <div
        role="tablist"
        aria-label="AI draft capabilities"
        className="flex flex-wrap border-b border-border"
      >
        {AI_PANELS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={p.id === active}
            onClick={() => setActive(p.id)}
            className={cn(
              "relative px-4 py-4 text-left text-sm font-medium tracking-tight transition-colors sm:px-6",
              p.id === active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-2">
              <p.icon className="size-3.5" />
              {p.label}
            </span>
            {p.id === active ? (
              <span
                aria-hidden
                className="absolute inset-x-4 -bottom-px h-px bg-foreground sm:inset-x-6"
              />
            ) : null}
          </button>
        ))}
      </div>

      <div
        key={panel.id}
        role="tabpanel"
        className="grid items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12 lg:py-14"
      >
        <div className="landing-pop-in">
          <h3 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            {panel.headline}
          </h3>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
            {panel.body}
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-8 border-t border-border pt-8">
            {panel.stats.map((stat) => (
              <div key={stat.caption}>
                <dt className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
                  {stat.value}
                  {stat.unit ? (
                    <span className="ml-1 text-lg font-medium text-muted-foreground">
                      {stat.unit}
                    </span>
                  ) : null}
                </dt>
                <dd className="mt-2 text-sm leading-snug text-muted-foreground">{stat.caption}</dd>
              </div>
            ))}
          </dl>
        </div>
        <AiDraftLive />
      </div>
    </div>
  );
}

const COLLECT_PANELS: ShowcasePanel[] = [
  {
    id: "checkout",
    label: "Checkout",
    icon: CreditCardIcon,
    headline: "Clients pay from the invoice. You never chase a card number.",
    body: "Stripe Connect puts card, Apple Pay, and Google Pay on a public link. No client account. Funds land in your business.",
    stats: [
      { value: "1", unit: "link", caption: "to review, approve, and pay" },
      { value: "0", unit: "logins", caption: "required on the client side" },
    ],
  },
  {
    id: "reminders",
    label: "Reminders",
    icon: BellRingIcon,
    headline: "The invoice keeps moving after you hit send.",
    body: "Schedule reminders once. They go out on due dates and after — viewed, late, or ignored. Failed sends retry in place.",
    stats: [
      { value: "Auto", unit: "", caption: "before and after the due date" },
      { value: "Retry", unit: "", caption: "when a reminder fails to send" },
    ],
  },
  {
    id: "chase",
    label: "Follow-ups",
    icon: SplitIcon,
    headline: "When “just reminding them” stops working.",
    body: "Draft a chase, offer a two-part plan, or log the awkward middle. Collections stay on the invoice — not in your inbox.",
    stats: [
      { value: "2-part", unit: "", caption: "plans when the balance is stuck" },
      { value: "1", unit: "thread", caption: "for send, view, remind, collect" },
    ],
  },
];

export function CollectShowcase() {
  return <LandingShowcase label="Get paid capabilities" panels={COLLECT_PANELS} />;
}
