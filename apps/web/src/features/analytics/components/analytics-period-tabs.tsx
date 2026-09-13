"use client";

import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnalyticsPeriod } from "@/features/analytics/types";
import { ANALYTICS_PERIODS } from "@/lib/analytics/period";

type AnalyticsPeriodTabsProps = {
  period: AnalyticsPeriod;
};

export function AnalyticsPeriodTabs({ period }: AnalyticsPeriodTabsProps) {
  const router = useRouter();

  return (
    <Tabs
      value={period}
      onValueChange={(value) => {
        const next = value as AnalyticsPeriod;
        if (next === "6m") {
          router.push("/analytics");
          return;
        }
        router.push(`/analytics?period=${next}`);
      }}
    >
      <TabsList variant="segment" className="w-full max-w-full overflow-x-auto sm:w-auto">
        {ANALYTICS_PERIODS.map((option) => (
          <TabsTrigger key={option.value} value={option.value} className="px-3">
            <span className="sm:hidden">{option.shortLabel}</span>
            <span className="hidden sm:inline">{option.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
