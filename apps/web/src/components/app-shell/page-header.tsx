import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Apply to primary header actions so they span full width on mobile. */
export const pageHeaderActionClass = "w-full sm:w-auto";

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: string;
  titleAddon?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  eyebrow,
  titleAddon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            {eyebrow}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-[1.75rem]">
            {title}
          </h1>
          {titleAddon}
        </div>
        {description && (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}

type PageBackLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

export function PageBackLink({ href, children, className }: PageBackLinkProps) {
  return (
    <div className={cn("mb-6", className)}>
      <Button variant="ghost" size="sm" className="-ml-2.5" render={<Link href={href} />}>
        <ArrowLeftIcon className="size-4" />
        {children}
      </Button>
    </div>
  );
}

type EmptyStateProps = {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Icon className="size-5" />
        </div>
      )}
      <p className="font-heading text-base font-medium">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
