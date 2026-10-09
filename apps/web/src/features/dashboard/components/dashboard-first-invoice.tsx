import Link from "next/link";
import { ArrowRightIcon, FileTextIcon, SparklesIcon, UsersRoundIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function DashboardFirstInvoice() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Your first invoice
        </p>
        <CardTitle className="font-heading text-xl tracking-tight sm:text-2xl">
          Get paid for the work you already did.
        </CardTitle>
        <CardDescription className="max-w-xl text-sm">
          Describe the job, send the invoice, get paid. You can save a client as you go — no
          setup required first.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6">
        <Link
          href="/invoices/new?tab=ai"
          className="group flex flex-col rounded-xl border border-border bg-muted/30 p-5 transition-colors hover:bg-muted/60"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <SparklesIcon className="size-4" />
          </span>
          <span className="mt-4 font-medium text-foreground">Describe the job</span>
          <span className="mt-1 text-sm text-muted-foreground">
            Write what you did. We&apos;ll draft the invoice from your words.
          </span>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
            Start with AI
            <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
        <Link
          href="/clients/new"
          className="group flex flex-col rounded-xl border border-border p-5 transition-colors hover:bg-muted/40"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <UsersRoundIcon className="size-4" />
          </span>
          <span className="mt-4 font-medium text-foreground">Add a client first</span>
          <span className="mt-1 text-sm text-muted-foreground">
            Save their details, then bill them without retyping.
          </span>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground">
            Add client
            <ArrowRightIcon className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
        <p className="text-center text-sm text-muted-foreground sm:col-span-2">
          Prefer the form?{" "}
          <Link
            href="/invoices/new?tab=form"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            <FileTextIcon className="mr-1 inline size-3.5 align-[-2px]" />
            Fill it in yourself
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
