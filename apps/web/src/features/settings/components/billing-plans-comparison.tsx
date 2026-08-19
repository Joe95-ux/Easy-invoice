"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRightIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { BillingCheckoutButton } from "@/features/settings/components/billing-checkout-button";
import { SupportContactDialog } from "@/components/app-shell/support-contact-dialog";
import { billingButtonClassName } from "@/features/settings/lib/billing-ui";
import {
  formatPlanPriceLabel,
  normalizePlanId,
  PLAN_COMPARISON_SECTIONS,
  type BillingInterval,
} from "@/features/settings/lib/plans-catalog";
import { cn } from "@/lib/utils";

type BillingPlansComparisonProps = {
  currentPlan: string;
  billingConfigured: boolean;
  hasYearlyPrice: boolean;
};

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return <CheckIcon className="mx-auto size-4 text-primary" aria-label="Included" />;
  }
  if (value === false) {
    return <span className="mx-auto block size-4" aria-hidden />;
  }
  return <span className="text-sm text-foreground">{value}</span>;
}

export function BillingPlansComparison({
  currentPlan,
  billingConfigured,
  hasYearlyPrice,
}: BillingPlansComparisonProps) {
  const current = normalizePlanId(currentPlan);
  const [interval, setInterval] = useState<BillingInterval>("yearly");
  const [supportOpen, setSupportOpen] = useState(false);
  const billedYearly = interval === "yearly";
  const freePrice = formatPlanPriceLabel("FREE");
  const proPrice = formatPlanPriceLabel("PRO", hasYearlyPrice ? interval : "monthly");

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        You are on the{" "}
        <span className="font-medium text-foreground">
          {current === "PRO" ? "Pro" : "Free"} plan
        </span>
        . If you have any questions or would like further support with your plan,{" "}
        <button
          type="button"
          onClick={() => setSupportOpen(true)}
          className="inline-flex cursor-pointer items-center gap-0.5 font-medium text-foreground underline-offset-4 hover:underline"
        >
          contact us
          <ArrowUpRightIcon className="size-3.5" />
        </button>
        .
      </p>

      <div className="overflow-x-auto">
        <div className="min-w-xl">
          {/* Plan headers — aligned rows: name/price → billing note → CTA */}
          <div className="grid grid-cols-[minmax(10rem,1.2fr)_repeat(2,minmax(9rem,1fr))] gap-0">
            <div className="p-4" />
            <PlanHeader
              name="Free"
              amount={freePrice.amount}
              hint={freePrice.hint}
              highlighted={false}
              billingNote={
                <p className="text-xs text-muted-foreground">Free forever</p>
              }
              action={
                current === "FREE" ? (
                  <Button
                    variant="ghost"
                    disabled
                    className={cn(
                      "w-full cursor-default text-muted-foreground",
                      billingButtonClassName,
                    )}
                  >
                    Current plan
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    className={cn("w-full cursor-pointer", billingButtonClassName)}
                    render={<Link href="/settings/billing" />}
                  >
                    Downgrade
                  </Button>
                )
              }
            />
            <PlanHeader
              name="Pro"
              amount={proPrice.amount}
              hint={proPrice.hint}
              highlighted
              billingNote={
                hasYearlyPrice ? (
                  <label className="flex h-5 cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                    <Switch
                      checked={billedYearly}
                      onCheckedChange={(checked) =>
                        setInterval(checked ? "yearly" : "monthly")
                      }
                      aria-label="Billed yearly"
                    />
                    Billed yearly
                  </label>
                ) : (
                  <p className="text-xs text-muted-foreground">Billed monthly</p>
                )
              }
              action={
                current === "PRO" ? (
                  <Button
                    variant="ghost"
                    disabled
                    className={cn(
                      "w-full cursor-default text-muted-foreground",
                      billingButtonClassName,
                    )}
                  >
                    Current plan
                  </Button>
                ) : (
                  <BillingCheckoutButton
                    className={cn("w-full cursor-pointer", billingButtonClassName)}
                    disabled={!billingConfigured}
                    label="Upgrade"
                    interval={hasYearlyPrice ? interval : "monthly"}
                  />
                )
              }
            />
          </div>

          {/* Feature matrix */}
          <div className="mt-2">
            {PLAN_COMPARISON_SECTIONS.map((section) => (
              <div key={section.title} className="pt-6">
                <div className="grid grid-cols-[minmax(10rem,1.2fr)_repeat(2,minmax(9rem,1fr))]">
                  <p className="px-2 pb-3 text-sm font-medium text-foreground">{section.title}</p>
                  <div />
                  <div className="rounded-t-lg bg-muted/30" />
                </div>
                {section.rows.map((row) => (
                  <div
                    key={row.label}
                    className="group grid grid-cols-[minmax(10rem,1.2fr)_repeat(2,minmax(9rem,1fr))] border-t border-border/60"
                  >
                    <div className="px-2 py-3 text-sm text-muted-foreground transition-colors group-hover:text-foreground">
                      {row.label}
                    </div>
                    <div className="flex items-center justify-center px-2 py-3 transition-colors group-hover:bg-muted/20">
                      <CellValue value={row.free} />
                    </div>
                    <div
                      className={cn(
                        "flex items-center justify-center bg-muted/30 px-2 py-3 transition-colors",
                        "group-hover:bg-muted/50",
                      )}
                    >
                      <CellValue value={row.pro} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <SupportContactDialog open={supportOpen} onOpenChange={setSupportOpen} />
    </div>
  );
}

function PlanHeader({
  name,
  amount,
  hint,
  highlighted,
  billingNote,
  action,
}: {
  name: string;
  amount: string;
  hint: string;
  highlighted?: boolean;
  billingNote: React.ReactNode;
  action: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col p-4",
        highlighted && "rounded-xl bg-muted/30",
      )}
    >
      <p className="text-sm font-medium text-foreground">{name}</p>
      <p className="mt-2 text-sm text-foreground">
        <span className="font-heading text-xl font-semibold tracking-tight">{amount}</span>
        <span className="text-muted-foreground"> {hint}</span>
      </p>
      <div className="mt-3 flex min-h-5 items-center">{billingNote}</div>
      <div className="mt-4">{action}</div>
    </div>
  );
}
