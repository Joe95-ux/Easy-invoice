import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentMember } from "@/lib/auth";
import { getClientsForMember } from "@/lib/clients";
import { InvoiceCreator } from "@/features/invoices/components/invoice-creator";

type PageProps = { searchParams: Promise<{ clientId?: string }> };

export default async function NewInvoicePage({ searchParams }: PageProps) {
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");

  const { clientId } = await searchParams;
  const clients = await getClientsForMember(member.companyId);

  return (
    <div>
      <div className="mb-8">
        <Link href="/invoices">
          <Button variant="ghost" size="sm">← Back to invoices</Button>
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">New invoice</h1>
        <p className="mt-1 text-muted-foreground">
          Use the form or describe the job in your own words.
        </p>
      </div>
      <InvoiceCreator
        companyId={member.companyId}
        currency={member.company.currency}
        clients={clients}
        initialClientId={clientId}
      />
    </div>
  );
}
