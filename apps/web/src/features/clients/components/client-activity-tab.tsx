"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BellRingIcon,
  CheckCircle2Icon,
  CircleDollarSignIcon,
  FileTextIcon,
  MailCheckIcon,
  SendIcon,
} from "lucide-react";
import { TablePagination } from "@/components/data-table/table-pagination";
import { Card } from "@/components/ui/card";
import type { ClientActivityKind, ClientActivityRow } from "@/lib/clients/financial-profile";
import { formatDateTime, formatMoney } from "@/lib/invoices";
import { cn } from "@/lib/utils";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 10;

const ACTIVITY_ICONS: Record<ClientActivityKind, typeof FileTextIcon> = {
  payment: CircleDollarSignIcon,
  invoice_sent: SendIcon,
  estimate_sent: SendIcon,
  reminder_sent: BellRingIcon,
  payment_confirmation_sent: MailCheckIcon,
  estimate_accepted: CheckCircle2Icon,
};

type ClientActivityTabProps = {
  activity: ClientActivityRow[];
  currency: string;
};

export function ClientActivityTab({ activity, currency }: ClientActivityTabProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const totalCount = activity.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  const pageActivity = useMemo(() => {
    const start = (page - 1) * pageSize;
    return activity.slice(start, start + pageSize);
  }, [activity, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  if (activity.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
        <p className="text-sm font-medium">No activity yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Payments, sends, and reminders for this client will show up here.
        </p>
      </div>
    );
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <ul className="divide-y divide-border">
        {pageActivity.map((event) => {
          const Icon = ACTIVITY_ICONS[event.kind];
          const content = (
            <>
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground",
                  event.kind === "payment" && "text-success",
                  event.kind === "payment_confirmation_sent" && "text-success",
                  event.kind === "estimate_accepted" && "text-success",
                )}
              >
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">{event.title}</p>
                  {event.amount !== undefined && (
                    <p className="text-sm font-semibold tabular-nums">
                      {formatMoney(event.amount, event.currency ?? currency)}
                    </p>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{event.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(event.occurredAt)}
                </p>
              </div>
            </>
          );

          return (
            <li key={event.id}>
              {event.href ? (
                <Link
                  href={event.href}
                  className="flex items-start gap-3 px-4 py-4 transition-colors hover:bg-muted/40"
                >
                  {content}
                </Link>
              ) : (
                <div className="flex items-start gap-3 px-4 py-4">{content}</div>
              )}
            </li>
          );
        })}
      </ul>

      <TablePagination
        page={page}
        pageCount={pageCount}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        totalCount={totalCount}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </Card>
  );
}
