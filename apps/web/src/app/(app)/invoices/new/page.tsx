import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { InvoiceCreator } from "@/features/invoices/components/invoice-creator";

export default async function NewInvoicePage() {
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");

  return (
    <div>
      <div className="mb-8">
        <Link href="/invoices" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to invoices
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">New invoice</h1>
        <p className="mt-1 text-muted-foreground">
          Use the form or describe the job in your own words.
        </p>
      </div>
      <InvoiceCreator companyId={member.companyId} currency={member.company.currency} />
    </div>
  );
}
