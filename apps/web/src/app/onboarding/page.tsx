"use client";

import { SparklesIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyCreateForm } from "@/features/companies/components/company-create-form";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto grid max-w-6xl items-start gap-8 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <SparklesIcon className="size-3.5 text-primary" />
            Welcome to Easy Invoice
          </div>
          <div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight">Set up your business</h1>
            <p className="mt-3 text-muted-foreground">
              A polished profile means professional invoices from day one — logo, address,
              and regional settings all in one place.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Smart defaults</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Address search auto-fills city, state, and postal code</li>
              <li>Country selection updates currency automatically</li>
              <li>Your sign-up photo can become your company logo</li>
            </ul>
          </div>
        </div>

        <Card className="flex max-h-[calc(100svh-5rem)] flex-col overflow-hidden border-border/70 shadow-lg lg:col-span-3">
          <CardHeader className="shrink-0 border-b border-border/60 bg-muted/20">
            <CardTitle>Company profile</CardTitle>
            <CardDescription>
              This information appears on invoices you send to clients.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-6">
            <CompanyCreateForm
              submitLabel="Continue to dashboard"
              submittingLabel="Creating your workspace..."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
