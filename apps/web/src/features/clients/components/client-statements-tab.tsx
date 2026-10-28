"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DownloadIcon, ExternalLinkIcon, Loader2Icon, SendIcon } from "lucide-react";
import { toast } from "sonner";
import { ProFeatureGate } from "@/components/billing/pro-feature-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { throwIfApiError, toastApiError } from "@/lib/billing/plan-api-error";
import { formatDate, formatMoney } from "@/lib/invoices";

type StatementPreviewInvoice = {
  number: string;
  dueDate: string | null;
  balanceDue: number;
  daysPastDue: number | null;
};

type StatementPreview = {
  currency: string;
  totalDue: number;
  current: number;
  days1to30: number;
  days31to60: number;
  days61plus: number;
  invoices: StatementPreviewInvoice[];
};

type StatementRow = {
  id: string;
  number: string;
  issuedAt: string;
  totalDue: number;
  currency: string;
  toEmail: string | null;
  publicToken: string | null;
};

type ClientStatementsTabProps = {
  clientId: string;
  clientEmail?: string | null;
  isPro: boolean;
  canWrite: boolean;
};

export function ClientStatementsTab({
  clientId,
  clientEmail,
  isPro,
  canWrite,
}: ClientStatementsTabProps) {
  const [loading, setLoading] = useState(isPro);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<StatementPreview | null>(null);
  const [statements, setStatements] = useState<StatementRow[]>([]);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!isPro) return;
    if (!opts?.silent) setLoading(true);
    try {
      const response = await fetch(`/api/clients/${clientId}/statements`);
      const data = await response.json().catch(() => ({}));
      throwIfApiError(response, data, "Could not load statements");
      setPreview(data.preview ?? null);
      setStatements(data.statements ?? []);
    } catch (error) {
      toastApiError(error, "Could not load statements");
    } finally {
      setLoading(false);
    }
  }, [clientId, isPro]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSend() {
    if (!clientEmail?.trim()) {
      toast.error("Add a client email before sending a statement");
      return;
    }
    setSending(true);
    try {
      const response = await fetch(`/api/clients/${clientId}/statements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json().catch(() => ({}));
      throwIfApiError(response, data, "Could not send statement");
      toast.success(`Statement sent to ${clientEmail}`);
      await load({ silent: true });
    } catch (error) {
      toastApiError(error, "Could not send statement");
    } finally {
      setSending(false);
    }
  }

  if (!isPro) {
    return (
      <ProFeatureGate
        title="Client statements are on Pro"
        description="Send an aging statement of everything this client still owes, then keep a history you can resend or download."
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-border px-6 py-12 text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Current balance</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Preview before you send. The PDF is generated at send time.
            </p>
          </div>
          {canWrite ? (
            <Button
              type="button"
              size="sm"
              disabled={sending || !preview || !clientEmail?.trim()}
              onClick={() => void handleSend()}
            >
              {sending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <SendIcon className="size-4" />
              )}
              Send statement
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {preview ? (
            <>
              <p className="font-heading text-2xl font-semibold tabular-nums">
                {formatMoney(preview.totalDue, preview.currency)}
              </p>
              <div className="grid gap-2 text-sm sm:grid-cols-4">
                <AgingCell label="Current" amount={preview.current} currency={preview.currency} />
                <AgingCell label="1–30 days" amount={preview.days1to30} currency={preview.currency} />
                <AgingCell label="31–60 days" amount={preview.days31to60} currency={preview.currency} />
                <AgingCell label="61+ days" amount={preview.days61plus} currency={preview.currency} />
              </div>
              <ul className="divide-y divide-border/70 text-sm">
                {preview.invoices.map((invoice) => (
                  <li key={invoice.number} className="flex items-center justify-between gap-3 py-2">
                    <span>
                      {invoice.number}
                      {invoice.daysPastDue != null && invoice.daysPastDue > 0 ? (
                        <span className="text-muted-foreground">
                          {" "}
                          · {invoice.daysPastDue}d overdue
                        </span>
                      ) : null}
                    </span>
                    <span className="tabular-nums">
                      {formatMoney(invoice.balanceDue, preview.currency)}
                    </span>
                  </li>
                ))}
              </ul>
              {!clientEmail?.trim() ? (
                <p className="text-sm text-muted-foreground">
                  Add a client email to send this statement.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No open invoices to include on a statement.
            </p>
          )}
        </CardContent>
      </Card>

      {statements.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm font-medium">No statements sent yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sent statements stay here so you can open or download them later.
          </p>
        </div>
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Statement</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>To</TableHead>
                <TableHead className="text-right">Amount due</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statements.map((statement) => (
                <TableRow key={statement.id}>
                  <TableCell className="font-medium">{statement.number}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(statement.issuedAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {statement.toEmail ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(statement.totalDue, statement.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {statement.publicToken ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`View statement ${statement.number}`}
                          render={<Link href={`/view/statements/${statement.publicToken}`} target="_blank" />}
                        >
                          <ExternalLinkIcon className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Download statement ${statement.number}`}
                          render={
                            <Link
                              href={`/api/public/statements/${statement.publicToken}/pdf`}
                              target="_blank"
                            />
                          }
                        >
                          <DownloadIcon className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function AgingCell({
  label,
  amount,
  currency,
}: {
  label: string;
  amount: number;
  currency: string;
}) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium tabular-nums">{formatMoney(amount, currency)}</p>
    </div>
  );
}
