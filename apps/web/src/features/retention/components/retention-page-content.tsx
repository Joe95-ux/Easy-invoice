"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, MegaphoneIcon, SendIcon } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { throwIfApiError, toastApiError } from "@/lib/billing/plan-api-error";
import type { RetentionSegment } from "@easy-invoice/db";
import type { SerializedRetentionCampaign } from "@/lib/retention/service";
import { formatDateTime } from "@/lib/invoices";
import { cn } from "@/lib/utils";

type SegmentOption = {
  id: RetentionSegment;
  label: string;
  description: string;
  count: number;
};

type RetentionPageContentProps = {
  canWrite: boolean;
  isPro: boolean;
  maxRecipients: number;
  companyName: string;
  segments: SegmentOption[];
  initialCampaigns: SerializedRetentionCampaign[];
};

export function RetentionPageContent({
  canWrite,
  isPro,
  maxRecipients,
  companyName,
  segments,
  initialCampaigns,
}: RetentionPageContentProps) {
  const router = useRouter();
  const [segment, setSegment] = useState<RetentionSegment>(
    segments.find((s) => s.count > 0)?.id ?? "PAID_CLIENTS",
  );
  const [subject, setSubject] = useState(`A note from ${companyName}`);
  const [message, setMessage] = useState(
    "Hi {{name}},\n\nThanks for working with {{company}}. We have a small thank-you offer on your next visit — reply if you'd like details.",
  );
  const [sending, setSending] = useState(false);
  const [campaigns, setCampaigns] = useState(initialCampaigns);

  const selected = useMemo(
    () => segments.find((s) => s.id === segment) ?? segments[0],
    [segment, segments],
  );
  const overCap = (selected?.count ?? 0) > maxRecipients;
  const canSend =
    canWrite &&
    isPro &&
    !overCap &&
    (selected?.count ?? 0) > 0 &&
    subject.trim().length > 0 &&
    message.trim().length > 0;

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    try {
      const response = await fetch("/api/retention/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segment,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });
      const data = await response.json();
      throwIfApiError(response, data, "Could not send outreach");

      toast.success("Outreach sent", {
        description: `${data.campaign.sentCount} delivered${data.campaign.failedCount ? `, ${data.campaign.failedCount} failed` : ""}.`,
      });
      setCampaigns((prev) => [data.campaign, ...prev]);
      router.refresh();
    } catch (error) {
      toastApiError(error, "Could not send outreach");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Retention"
        description="Win-back notes for clients you already serve — not cold marketing blasts."
        actions={
          <div className={cn("flex gap-2", pageHeaderActionClass)}>
            {!isPro && (
              <Button variant="outline" render={<a href="/settings/billing/plans" />}>
                Upgrade to send
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MegaphoneIcon className="size-4 text-muted-foreground" />
              Compose outreach
            </CardTitle>
            <CardDescription>
              Only clients with email and marketing opt-in are included. Use{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">{"{{name}}"}</code> and{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">{"{{company}}"}</code> for
              personalization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select
                value={segment}
                onValueChange={(value) => value && setSegment(value as RetentionSegment)}
                items={segments.map((s) => ({
                  value: s.id,
                  label: `${s.label} (${s.count})`,
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {segments.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label} ({s.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selected?.description}
                {selected ? ` · ${selected.count} reachable` : null}
                {overCap ? ` · over the ${maxRecipients} per-send cap` : null}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="retention-subject">Subject</Label>
              <Input
                id="retention-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                disabled={!canWrite}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="retention-message">Message</Label>
              <Textarea
                id="retention-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={8}
                maxLength={4000}
                disabled={!canWrite}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => void handleSend()} disabled={!canSend || sending}>
                {sending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <SendIcon className="size-4" />
                )}
                {sending ? "Sending…" : "Send outreach"}
              </Button>
              {!isPro && (
                <p className="text-xs text-muted-foreground">
                  Sending retention email is available on Pro.
                </p>
              )}
              {isPro && !canWrite && (
                <p className="text-xs text-muted-foreground">Viewers cannot send outreach.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Segments</CardTitle>
            <CardDescription>Built from clients already in your workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {segments.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSegment(s.id)}
                className={cn(
                  "flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
                  segment === s.id ? "border-primary bg-primary/5" : "hover:bg-muted/40",
                )}
              >
                <div>
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                </div>
                <Badge variant="secondary">{s.count}</Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Send history</CardTitle>
          <CardDescription>Recent retention emails and delivery status.</CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <EmptyState
              title="No outreach yet"
              description="Pick a segment, write a short note, and send your first win-back message."
            />
          ) : (
            <Table stickyColumns={0}>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      {campaign.sentAt ? formatDateTime(campaign.sentAt) : "—"}
                    </TableCell>
                    <TableCell>
                      {segments.find((s) => s.id === campaign.segment)?.label ?? campaign.segment}
                    </TableCell>
                    <TableCell className="max-w-[16rem] truncate font-medium">
                      {campaign.subject}
                    </TableCell>
                    <TableCell className="text-right">{campaign.sentCount}</TableCell>
                    <TableCell className="text-right">{campaign.failedCount}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          campaign.status === "SENT"
                            ? "success"
                            : campaign.status === "FAILED"
                              ? "destructive"
                              : "outline"
                        }
                      >
                        {campaign.status.toLowerCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
