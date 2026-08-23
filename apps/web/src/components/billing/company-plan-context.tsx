"use client";

import { createContext, useContext, useMemo } from "react";
import { normalizePlanId, type PlanId } from "@/features/settings/lib/plans-catalog";

type CompanyPlanContextValue = {
  plan: PlanId;
  isPro: boolean;
};

const CompanyPlanContext = createContext<CompanyPlanContextValue>({
  plan: "FREE",
  isPro: false,
});

export function CompanyPlanProvider({
  plan,
  children,
}: {
  plan: string;
  children: React.ReactNode;
}) {
  const value = useMemo(() => {
    const normalized = normalizePlanId(plan);
    return {
      plan: normalized,
      isPro: normalized === "PRO",
    };
  }, [plan]);

  return (
    <CompanyPlanContext.Provider value={value}>{children}</CompanyPlanContext.Provider>
  );
}

export function useCompanyPlan() {
  return useContext(CompanyPlanContext);
}
