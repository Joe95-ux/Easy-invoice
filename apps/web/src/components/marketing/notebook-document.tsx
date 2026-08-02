import type { ReactNode } from "react";
import { NotebookNav } from "@/components/marketing/notebook-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { cn } from "@/lib/utils";

type NotebookDocumentProps = {
  title: string;
  subtitle?: string;
  updated?: string;
  children: ReactNode;
  className?: string;
};

export function NotebookDocument({
  title,
  subtitle,
  updated,
  children,
  className,
}: NotebookDocumentProps) {
  return (
    <div className="notebook-page min-h-screen">
      <NotebookNav />

      <main className="relative z-10 mx-auto w-full max-w-3xl px-6 pb-12 pt-24 sm:px-8 sm:pb-16 sm:pt-28">
        <article
          className={cn(
            "notebook-sheet relative rounded-sm border border-border/60 bg-card/80 px-6 py-10 shadow-[0_1px_0_rgba(40,40,80,0.04),0_18px_40px_-28px_rgba(40,40,80,0.35)] sm:px-12 sm:py-14",
            className,
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-[2.75rem] hidden w-px bg-[color-mix(in_oklch,var(--primary)_28%,transparent)] sm:block"
          />

          <header className="relative sm:pl-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Invoice Desk
            </p>
            <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-3 max-w-prose text-base leading-relaxed text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
            {updated ? (
              <p className="mt-5 font-mono text-xs text-muted-foreground">
                Last updated {updated}
              </p>
            ) : null}
            <div className="mt-8 h-px w-full bg-border/80" />
          </header>

          <div className="notebook-prose relative mt-8 space-y-8 text-[15px] leading-7 text-foreground/90 sm:pl-8">
            {children}
          </div>
        </article>
      </main>

      <div className="relative z-10">
        <SiteFooter />
      </div>
    </div>
  );
}

export function NotebookSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="space-y-3 text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:transition-colors hover:[&_a]:text-primary [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
