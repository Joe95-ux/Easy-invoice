"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDownIcon, Loader2Icon, MegaphoneIcon, SendIcon } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";
import { ProFeatureGate } from "@/components/billing/pro-feature-gate";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const SEND_STATUS_LABEL: Record<SerializedRetentionCampaign["sends"][number]["status"], string> = {
  QUEUED: "Queued",
  SENT: "Sent",
  FAILED: "Failed",
  SKIPPED: "Skipped",
};

function sendStatusVariant(
  status: SerializedRetentionCampaign["sends"][number]["status"],
): "success" | "destructive" | "outline" {
  if (status === "SENT") return "success";
  if (status === "FAILED") return "destructive";
  return "outline";
}

function campaignStatusLabel(campaign: SerializedRetentionCampaign): string {
  if (campaign.status === "SENDING") return "Sending";
  if (campaign.sentCount > 0 && campaign.failedCount > 0) return "Partial";
  if (campaign.status === "SENT") return "Sent";
  if (campaign.status === "FAILED") return "Failed";
  return "Draft";
}

function campaignStatusVariant(
  campaign: SerializedRetentionCampaign,
): "success" | "destructive" | "warning" | "outline" {
  if (campaign.status === "SENDING") return "outline";
  if (campaign.sentCount > 0 && campaign.failedCount > 0) return "warning";
  if (campaign.status === "SENT") return "success";
  if (campaign.status === "FAILED") return "destructive";
  return "outline";
}

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
  const [segment, setSegment] = useState<RetentionSegment>(
    segments.find((s) => s.count > 0)?.id ?? "PAID_CLIENTS",
  );
  const [subject, setSubject] = useState(`A note from ${companyName}`);
  const [message, setMessage] = useState(
    "Hi {{name}},\n\nIt's been a while since we worked together. Reply if you need anything from {{company}}.",
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [openCampaignId, setOpenCampaignId] = useState<string | null>(null);
  const [loadingCampaignId, setLoadingCampaignId] = useState<string | null>(null);
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const finishedToast = useRef(new Set<string>());
  const sendingKey = campaigns
    .filter((campaign) => campaign.status === "SENDING")
    .map((campaign) => campaign.id)
    .join(",");

  useEffect(() => {
    if (!sendingKey) return;
    let cancelled = false;

    async function refresh() {
      const ids = sendingKey.split(",");
      const updates = await Promise.all(
        ids.map(async (id) => {
          try {
            const response = await fetch(`/api/retention/campaigns/${id}`);
            if (!response.ok) return null;
            const data = await response.json();
            return data.campaign as SerializedRetentionCampaign;
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;

      setCampaigns((prev) =>
        prev.map((row) => updates.find((item) => item?.id === row.id) ?? row),
      );

      for (const updated of updates) {
        if (!updated || updated.status === "SENDING") continue;
        if (finishedToast.current.has(updated.id)) continue;
        finishedToast.current.add(updated.id);
        const delivered =
          updated.sentCount > 0
            ? `${updated.sentCount} delivered${updated.failedCount ? `, ${updated.failedCount} failed` : ""}.`
            : "No messages were delivered.";
        if (updated.status === "FAILED") {
          toast.error("Outreach failed", { description: delivered });
        } else {
          toast.success("Outreach sent", { description: delivered });
        }
      }
    }

    void refresh();
    const timer = setInterval(() => void refresh(), 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [sendingKey]);

  const selected = useMemo(
    () => segments.find((s) => s.id === segment) ?? segments[0],
    [segment, segments],
  );
  const overCap = (selected?.count ?? 0) > maxRecipients;
  const audienceCount = selected?.count ?? 0;
  const sendBlockReason =
    !isPro || !canWrite
      ? null
      : audienceCount === 0
        ? "No one in this segment has an email and marketing opt-in."
        : overCap
          ? `This segment has ${audienceCount} people. Each send is limited to ${maxRecipients}.`
          : null;
  const canSend =
    canWrite &&
    isPro &&
    !overCap &&
    audienceCount > 0 &&
    subject.trim().length > 0 &&
    message.trim().length > 0;

  async function toggleRecipients(campaign: SerializedRetentionCampaign) {
    if (openCampaignId === campaign.id) {
      setOpenCampaignId(null);
      return;
    }

    setOpenCampaignId(campaign.id);
    setRecipientError(null);
    if (campaign.recipientsLoaded || loadingCampaignId === campaign.id) return;

    setLoadingCampaignId(campaign.id);
    try {
      const response = await fetch(`/api/retention/campaigns/${campaign.id}`);
      const data = await response.json();
      throwIfApiError(response, data, "Could not load recipients");
      const loaded = data.campaign as SerializedRetentionCampaign;
      setCampaigns((prev) => prev.map((row) => (row.id === loaded.id ? loaded : row)));
    } catch (error) {
      setRecipientError(error instanceof Error ? error.message : "Could not load recipients");
    } finally {
      setLoadingCampaignId(null);
    }
  }

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

      const count = data.campaign.recipientCount as number;
      toast.success("Sending outreach", {
        description: `Sending to ${count} ${count === 1 ? "client" : "clients"}.`,
      });
      setConfirmOpen(false);
      setCampaigns((prev) => [data.campaign, ...prev]);
    } catch (error) {
      toastApiError(error, "Could not send outreach");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        title="Retention"
        description="Win-back notes for clients you already serve — not cold marketing blasts."
        actions={
          !canWrite || isPro ? undefined : (
            <Button className={pageHeaderActionClass} render={<Link href="/settings/billing/plans" />}>
              Upgrade to Pro
            </Button>
          )
        }
      />

      {!isPro && canWrite ? (
        <ProFeatureGate
          variant="banner"
          title="Retention email is on Pro"
          description="Send a short note to clients you already work with. Free plans can still email invoices and estimates one at a time."
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="order-2 lg:order-1">
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
              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={!canSend || sending}
              >
                {sending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <SendIcon className="size-4" />
                )}
                {sending ? "Sending…" : "Send outreach"}
              </Button>
              {sendBlockReason ? (
                <p className="text-xs text-muted-foreground">{sendBlockReason}</p>
              ) : null}
              {isPro && !canWrite ? (
                <p className="text-xs text-muted-foreground">
                  You have view-only access, so you can&apos;t send outreach.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="order-1 lg:order-2">
          <CardHeader>
            <CardTitle className="text-base">Segments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {segments.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSegment(s.id)}
                aria-pressed={segment === s.id}
                className={cn(
                  "flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
          <CardDescription>Recent notes. Select a row to see who received it.</CardDescription>
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
                  <TableHead className="w-10">
                    <span className="sr-only">Recipients</span>
                  </TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => {
                  const open = openCampaignId === campaign.id;
                  const loading = loadingCampaignId === campaign.id;
                  return (
                    <Fragment key={campaign.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => void toggleRecipients(campaign)}
                      >
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-expanded={open}
                            aria-label={open ? "Hide recipients" : "Show recipients"}
                            onClick={(event) => {
                              event.stopPropagation();
                              void toggleRecipients(campaign);
                            }}
                          >
                            {loading ? (
                              <Loader2Icon className="size-4 animate-spin" />
                            ) : (
                              <ChevronDownIcon
                                className={cn("size-4 transition-transform", open && "rotate-180")}
                              />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          {campaign.sentAt ? formatDateTime(campaign.sentAt) : "—"}
                        </TableCell>
                        <TableCell>
                          {segments.find((s) => s.id === campaign.segment)?.label ?? campaign.segment}
                        </TableCell>
                        <TableCell className="max-w-[16rem] truncate font-medium" title={campaign.subject}>
                          {campaign.subject}
                        </TableCell>
                        <TableCell className="text-right">{campaign.sentCount}</TableCell>
                        <TableCell className="text-right">{campaign.failedCount}</TableCell>
                        <TableCell>
                          <Badge variant={campaignStatusVariant(campaign)}>
                            {campaignStatusLabel(campaign)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      {open ? (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/30">
                            <RecipientLog
                              loading={loading && !campaign.recipientsLoaded}
                              error={campaign.recipientsLoaded ? null : recipientError}
                              sends={campaign.sends}
                            />
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !sending && setConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this note?</AlertDialogTitle>
            <AlertDialogDescription>
              This emails {audienceCount}{" "}
              {audienceCount === 1 ? "client" : "clients"} in {selected?.label ?? "this segment"}.
              Each person can unsubscribe. Invoice and payment emails are separate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={sending || !canSend} onClick={() => void handleSend()}>
              {sending ? "Sending…" : `Send to ${audienceCount}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RecipientLog({
  loading,
  error,
  sends,
}: {
  loading: boolean;
  error: string | null;
  sends: SerializedRetentionCampaign["sends"];
}) {
  if (loading) {
    return (
      <p className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        Loading recipients…
      </p>
    );
  }

  if (error) {
    return <p className="px-2 py-3 text-sm text-destructive">{error}</p>;
  }

  if (sends.length === 0) {
    return (
      <p className="px-2 py-3 text-sm text-muted-foreground">No recipients recorded for this send.</p>
    );
  }

  return (
    <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border bg-card">
      {sends.map((send) => (
        <li key={send.id} className="flex items-start justify-between gap-3 px-3 py-2">
          <div className="min-w-0">
            <Link href={`/clients/${send.client.id}`} className="text-sm font-medium hover:underline">
              {send.client.name}
            </Link>
            <p className="truncate text-xs text-muted-foreground">{send.email}</p>
            {send.error ? <p className="mt-1 text-xs text-destructive">{send.error}</p> : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge variant={sendStatusVariant(send.status)}>{SEND_STATUS_LABEL[send.status]}</Badge>
            {send.status === "QUEUED" ? null : (
              <span className="text-xs text-muted-foreground">{formatDateTime(send.sentAt)}</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
