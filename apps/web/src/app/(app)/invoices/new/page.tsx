import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireMember } from "@/lib/auth";
import { getClientsForMember } from "@/lib/clients";
import { getDefaultTemplateId, getTemplatesForCompany } from "@/lib/templates";
import { InvoiceCreator } from "@/features/invoices/components/invoice-creator";

type PageProps = { searchParams: Promise<{ clientId?: string }> };

export default async function NewInvoicePage({ searchParams }: PageProps) {
  const member = await requireMember();

  const { clientId } = await searchParams;
  const [clients, templates, defaultTemplateId] = await Promise.all([
    getClientsForMember(member.companyId),
    getTemplatesForCompany(member.companyId),
    getDefaultTemplateId(member.companyId),
  ]);

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
        currency={member.company.currency}
        clients={clients}
        templates={templates}
        initialClientId={clientId}
        defaultTemplateId={defaultTemplateId}
      />
    </div>
  );
}
