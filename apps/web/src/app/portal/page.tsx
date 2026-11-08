import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PortalCreditNotesSection } from "@/features/portal/components/portal-credit-notes-section";
import { PortalEstimatesSection } from "@/features/portal/components/portal-estimates-section";
import { PortalFlashToasts } from "@/features/portal/components/portal-flash-toasts";
import { PortalInvoicesSection } from "@/features/portal/components/portal-invoices-section";
import { PortalStatementsSection } from "@/features/portal/components/portal-statements-section";
import { PortalUpcomingSection } from "@/features/portal/components/portal-upcoming-section";
import { getPortalDashboard } from "@/lib/portal/queries";
import { getPortalSession } from "@/lib/portal/session";
import { formatMoney } from "@/lib/invoices";

export const metadata = {
  title: "Client portal",
  description: "Your invoices, estimates, and credits",
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
      <Suspense fallback={null}>
        <PortalFlashToasts />
      </Suspense>

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{session.companyName}</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Hello{session.clientName ? `, ${session.clientName.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          Review invoices, estimates, and credits, then open a document to pay or respond.
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
              {dashboard.invoices.length +
                dashboard.estimates.length +
                dashboard.creditNotes.length +
                dashboard.statements.length}
            </p>
          </CardHeader>
        </Card>
      </div>

      <PortalUpcomingSection upcoming={dashboard.upcoming} />
      <PortalInvoicesSection invoices={dashboard.invoices} />
      <PortalEstimatesSection estimates={dashboard.estimates} />
      <PortalCreditNotesSection creditNotes={dashboard.creditNotes} />
      {dashboard.isPro || dashboard.statements.length > 0 ? (
        <PortalStatementsSection statements={dashboard.statements} />
      ) : null}
    </div>
  );
}
