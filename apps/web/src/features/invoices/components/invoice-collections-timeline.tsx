import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CollectionsTimelineStep } from "@/lib/collections/timeline";
import { cn } from "@/lib/utils";

function formatStepDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

const STATUS_LABEL: Record<CollectionsTimelineStep["status"], string> = {
  upcoming: "Scheduled",
  due_today: "Due today",
  sent: "Sent",
  applied: "Applied",
  missed: "Missed",
  failed: "Failed",
  skipped: "Skipped",
};

function statusVariant(
  status: CollectionsTimelineStep["status"],
): "secondary" | "warning" | "success" | "destructive" | "outline" {
  if (status === "sent" || status === "applied") return "success";
  if (status === "due_today") return "warning";
  if (status === "failed" || status === "missed") return "destructive";
  if (status === "skipped") return "outline";
  return "secondary";
}

export function InvoiceCollectionsTimeline({
  steps,
  paused,
}: {
  steps: CollectionsTimelineStep[];
  paused?: boolean;
}) {
  if (steps.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader className="space-y-1 pb-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Collections sequence
        </p>
        <CardTitle className="text-base">How Pro will chase this invoice</CardTitle>
        <p className="text-sm text-muted-foreground">
          Notice, then a firmer chase, then a final notice
          {steps.some((step) => step.kind === "late_fee") ? ", plus a late fee after grace" : ""}.
          {paused ? " Automatic emails are paused on this invoice." : null}{" "}
          <Link href="/settings/general#settings-reminders" className="underline-offset-2 hover:underline">
            Edit schedule
          </Link>
        </p>
      </CardHeader>
      <CardContent>
        <ol className="space-y-0">
          {steps.map((step, index) => {
            const done = step.status === "sent" || step.status === "applied";
            const active = step.status === "due_today";
            return (
              <li key={step.id} className="flex gap-3">
                <div className="flex w-4 shrink-0 flex-col items-center">
                  <span
                    className={cn(
                      "mt-1 size-2.5 rounded-full ring-2 ring-background",
                      done && "bg-success",
                      active && "bg-warning",
                      !done && !active && "bg-muted-foreground/35",
                    )}
                  />
                  {index < steps.length - 1 ? (
                    <span className="min-h-8 w-px flex-1 bg-border" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{step.title}</p>
                    <Badge variant={statusVariant(step.status)}>
                      {STATUS_LABEL[step.status]}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatStepDate(step.date)}
                    {step.detail ? ` · ${step.detail}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
