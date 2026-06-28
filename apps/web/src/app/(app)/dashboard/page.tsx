import Link from "next/link";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CheckCircle2Icon,
  FileTextIcon,
  PlusIcon,
  UsersRoundIcon,
  WalletIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageScroll } from "@/components/app-shell/app-shell";
import { EmptyState, PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";
import { requireMember } from "@/lib/auth";
import { getDashboardStats } from "@/lib/dashboard";
import {
  formatDate,
  formatMoney,
  invoiceStatusLabel,
  invoiceStatusVariant,
} from "@/lib/invoices";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const member = await requireMember();
  const stats = await getDashboardStats(member.companyId);
  const { company } = member;

  return (
    <PageScroll fullWidth className="space-y-8">
      <PageHeader
        eyebrow={getGreeting()}
        title={company.name}
        description="A clear view of your billing — create, send, and get paid faster."
        actions={
          <>
            <Button className={pageHeaderActionClass} render={<Link href="/invoices/new" />}>
              <PlusIcon className="size-4" />
              New invoice
            </Button>
            <Button
              variant="outline"
              className={pageHeaderActionClass}
              render={<Link href="/clients/new" />}
            >
              <UsersRoundIcon className="size-4" />
              Add client
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total invoices"
          value={String(stats.totalInvoices)}
          hint={`${stats.draftCount} drafts`}
          icon={FileTextIcon}
        />
        <MetricCard
          title="Outstanding"
          value={formatMoney(stats.outstandingTotal, company.currency)}
          hint={
            stats.outstandingCount > 0
              ? `${stats.outstandingCount} awaiting payment`
              : "All caught up"
          }
          icon={WalletIcon}
          accent="warning"
        />
        <MetricCard
          title="Paid"
          value={String(stats.paidCount)}
          hint="Completed invoices"
          icon={CheckCircle2Icon}
          accent="success"
        />
        <MetricCard
          title="Clients"
          value={String(stats.clientCount)}
          hint="Saved for quick billing"
          icon={UsersRoundIcon}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4 border-b">
            <div>
              <CardTitle>Recent invoices</CardTitle>
              <CardDescription>Your latest billing activity</CardDescription>
            </div>
            <Button variant="ghost" size="sm" render={<Link href="/invoices" />}>
              View all
              <ArrowRightIcon className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {stats.recentInvoices.length === 0 ? (
              <EmptyState
                icon={FileTextIcon}
                title="No invoices yet"
                description="Create your first invoice in under a minute — by form or with AI."
                action={
                  <Button render={<Link href="/invoices/new" />}>
                    <PlusIcon className="size-4" />
                    Create first invoice
                  </Button>
                }
              />
            ) : (
              <div className="-mx-2 divide-y divide-border/70">
                {stats.recentInvoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={`/invoices/${invoice.id}`}
                    className="group flex items-center justify-between gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <FileTextIcon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{invoice.number}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {invoice.client?.name ?? "No client"} · {formatDate(invoice.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Badge variant={invoiceStatusVariant(invoice.status)}>
                        {invoiceStatusLabel(invoice.status)}
                      </Badge>
                      <span className="w-24 text-right text-sm font-semibold tabular-nums">
                        {formatMoney(invoice.total, invoice.currency)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-base">Pipeline</CardTitle>
            <CardDescription>Invoice status breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            <PipelineRow label="Drafts" value={stats.draftCount} total={stats.totalInvoices} tone="muted" />
            <PipelineRow
              label="Outstanding"
              value={stats.outstandingCount}
              total={stats.totalInvoices}
              tone="warning"
            />
            <PipelineRow label="Paid" value={stats.paidCount} total={stats.totalInvoices} tone="success" />
            {stats.overdueCount > 0 ? (
              <Link
                href="/invoices"
                className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2.5 text-sm transition-colors hover:bg-destructive/12"
              >
                <span>
                  <span className="font-semibold text-destructive">{stats.overdueCount} overdue</span>
                  <span className="text-muted-foreground"> — follow up</span>
                </span>
                <ArrowUpRightIcon className="size-4 text-destructive" />
              </Link>
            ) : (
              <Link
                href="/settings"
                className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm transition-colors hover:bg-muted"
              >
                <span className="text-muted-foreground">Add your logo to brand every PDF</span>
                <ArrowUpRightIcon className="size-4 text-muted-foreground" />
              </Link>
            )}
          </CardContent>
        </Card>
      </section>
    </PageScroll>
  );
}

function MetricCard({
  title,
  value,
  hint,
  icon: Icon,
  accent = "neutral",
}: {
  title: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "neutral" | "success" | "warning";
}) {
  const iconStyles = {
    neutral: "bg-accent text-accent-foreground",
    success: "bg-success/12 text-success",
    warning: "bg-warning/15 text-warning-foreground dark:text-warning",
  }[accent];

  return (
    <Card size="sm">
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <p className="mt-2 font-heading text-2xl font-semibold tracking-tight tabular-nums">
            {value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconStyles}`}>
          <Icon className="size-4.5" />
        </div>
      </CardContent>
    </Card>
  );
}

function PipelineRow({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "muted" | "warning" | "success";
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const barTone = {
    muted: "bg-muted-foreground/40",
    warning: "bg-warning",
    success: "bg-success",
  }[tone];

  return (
    <div className="py-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{value}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${barTone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
