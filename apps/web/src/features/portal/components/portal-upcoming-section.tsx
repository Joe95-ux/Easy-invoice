"use client";

import Link from "next/link";
import { CalendarClockIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/invoices";
import type { PortalUpcomingItem } from "@/lib/portal/types";
import { withPortalReturn } from "@/lib/portal/urls";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

type PortalUpcomingSectionProps = {
  upcoming: PortalUpcomingItem[];
};

export function PortalUpcomingSection({ upcoming }: PortalUpcomingSectionProps) {
  if (upcoming.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="font-heading text-lg font-semibold tracking-tight">Upcoming</h2>
      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {upcoming.map((item) => {
              const content = (
                <>
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <CalendarClockIcon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.subtitle} · {formatDate(item.date)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-medium tabular-nums">
                    {formatMoney(item.amount, item.currency)}
                  </p>
                </>
              );

              return (
                <li key={item.id}>
                  {item.href ? (
                    <Link
                      href={withPortalReturn(item.href)}
                      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 sm:px-5"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
