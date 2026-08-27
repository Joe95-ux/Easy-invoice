import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPortalDashboard } from "@/lib/portal/queries";
import { getPortalSession } from "@/lib/portal/session";
import { formatMoney } from "@/lib/invoices";
import { cn } from "@/lib/utils";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

function invoiceStatusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}

export const metadata = {
  title: "Client portal",
  description: "Your invoices and estimates",
};

export default async function PortalHomePage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const dashboard = await getPortalDashboard({
    clientId: session.clientId,
    companyId: session.companyId,
  });

  const openInvoices = dashboard.invoices.filter((row) => row.balanceDue > 0.001);
  const paidInvoices = dashboard.invoices.filter((row) => row.balanceDue <= 0.001);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{session.companyName}</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Hello{session.clientName ? `, ${session.clientName.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          Review invoices and estimates, then open a document to pay or respond.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="py-0">
          <CardHeader className="px-5 py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open balance
            </CardTitle>
            <p className="font-heading text-2xl font-semibold tracking-tight tabular-nums">
              {formatMoney(dashboard.openBalance, dashboard.currency)}
            </p>
          </CardHeader>
        </Card>
        <Card className="py-0">
          <CardHeader className="px-5 py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Documents
            </CardTitle>
            <p className="font-heading text-2xl font-semibold tracking-tight tabular-nums">
              {dashboard.invoices.length + dashboard.estimates.length}
            </p>
          </CardHeader>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold tracking-tight">Invoices</h2>
          <p className="text-xs text-muted-foreground">
            {openInvoices.length} open · {paidInvoices.length} paid
          </p>
        </div>
        {dashboard.invoices.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No invoices yet.
          </p>
        ) : (
          <Card className="overflow-hidden py-0">
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {dashboard.invoices.map((invoice) => (
                  <li key={invoice.id}>
                    <Link
                      href={invoice.href}
                      className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 sm:px-5"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-medium">{invoice.number}</p>
                          <Badge
                            variant="outline"
                            className={cn(
                              "capitalize",
                              invoice.balanceDue > 0.001
                                ? "text-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            {invoiceStatusLabel(invoice.status)}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Due {formatDate(invoice.dueDate)}
                          {invoice.balanceDue > 0.001
                            ? ` · ${formatMoney(invoice.balanceDue, invoice.currency)} left`
                            : " · Paid"}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-medium tabular-nums">
                        {formatMoney(invoice.total, invoice.currency)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold tracking-tight">Estimates</h2>
        {dashboard.estimates.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No estimates yet.
          </p>
        ) : (
          <Card className="overflow-hidden py-0">
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {dashboard.estimates.map((estimate) => (
                  <li key={estimate.id}>
                    <Link
                      href={estimate.href}
                      className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 sm:px-5"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-medium">{estimate.number}</p>
                          <Badge variant="outline" className="capitalize">
                            {invoiceStatusLabel(estimate.status)}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Valid until {formatDate(estimate.validUntil)}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-medium tabular-nums">
                        {formatMoney(estimate.total, estimate.currency)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
