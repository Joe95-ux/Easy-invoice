import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PortalEstimatesSection } from "@/features/portal/components/portal-estimates-section";
import { PortalInvoicesSection } from "@/features/portal/components/portal-invoices-section";
import { getPortalDashboard } from "@/lib/portal/queries";
import { getPortalSession } from "@/lib/portal/session";
import { formatMoney } from "@/lib/invoices";

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

      <PortalInvoicesSection invoices={dashboard.invoices} />
      <PortalEstimatesSection estimates={dashboard.estimates} />
    </div>
  );
}
