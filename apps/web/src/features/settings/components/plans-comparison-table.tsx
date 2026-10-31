"use client";

import type { ReactNode } from "react";
import { CheckIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  formatPlanPriceLabel,
  PLAN_COMPARISON_SECTIONS,
  type BillingInterval,
} from "@/features/settings/lib/plans-catalog";
import { cn } from "@/lib/utils";

type PlansComparisonTableProps = {
  interval: BillingInterval;
  onIntervalChange: (interval: BillingInterval) => void;
  hasYearlyPrice: boolean;
  freeAction: ReactNode;
  proAction: ReactNode;
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

export function PlansComparisonTable({
  interval,
  onIntervalChange,
  hasYearlyPrice,
  freeAction,
  proAction,
}: PlansComparisonTableProps) {
  const billedYearly = interval === "yearly";
  const freePrice = formatPlanPriceLabel("FREE");
  const proPrice = formatPlanPriceLabel("PRO", hasYearlyPrice ? interval : "monthly");

  return (
    <div className="overflow-x-auto">
      <div className="min-w-xl">
        <div className="grid grid-cols-[minmax(10rem,1.2fr)_repeat(2,minmax(9rem,1fr))] gap-0">
          <div className="p-4" />
          <PlanHeader
            name="Free"
            amount={freePrice.amount}
            hint={freePrice.hint}
            highlighted={false}
            billingNote={<p className="text-xs text-muted-foreground">Free forever</p>}
            action={freeAction}
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
                      onIntervalChange(checked ? "yearly" : "monthly")
                    }
                    aria-label="Billed yearly"
                  />
                  Billed yearly
                </label>
              ) : (
                <p className="text-xs text-muted-foreground">Billed monthly</p>
              )
            }
            action={proAction}
          />
        </div>

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
  billingNote: ReactNode;
  action: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col p-4", highlighted && "rounded-xl bg-muted/30")}>
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
