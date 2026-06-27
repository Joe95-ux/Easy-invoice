import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageScroll } from "@/components/app-shell/app-shell";
import { EstimateCreator } from "@/features/estimates/components/estimate-creator";
import { requireMember } from "@/lib/auth";
import { getClientsForMember } from "@/lib/clients";
import { getEstimateForMember } from "@/lib/estimates";
import { getDefaultTemplateId, getTemplatesForCompany } from "@/lib/templates";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditEstimatePage({ params }: PageProps) {
  const member = await requireMember();

  const { id } = await params;
  const [estimate, clients, templates, defaultTemplateId] = await Promise.all([
    getEstimateForMember(id, member.companyId),
    getClientsForMember(member.companyId),
    getTemplatesForCompany(member.companyId),
    getDefaultTemplateId(member.companyId),
  ]);
  if (!estimate) notFound();

  return (
    <PageScroll>
      <div className="mb-8">
        <Button variant="ghost" size="sm" className="-ml-2.5" render={<Link href={`/estimates/${estimate.id}`} />}>
          <ArrowLeftIcon className="size-4" />
          Back to estimate
        </Button>
        <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight">Edit {estimate.number}</h1>
        <p className="mt-1 text-muted-foreground">
          Update the estimate details below.
        </p>
      </div>
      <EstimateCreator
        currency={member.company.currency}
        company={{
          name: member.company.name,
          logoUrl: member.company.logoUrl,
          email: member.company.email,
          phone: member.company.phone,
          address: member.company.address,
          city: member.company.city,
          state: member.company.state,
          zip: member.company.zip,
          country: member.company.country,
        }}
        clients={clients}
        templates={templates}
        defaultTemplateId={defaultTemplateId}
        estimateId={estimate.id}
        estimateNumber={estimate.number}
        initialValues={{
          clientId: estimate.clientId,
          templateId: estimate.templateId,
          clientName: estimate.client?.name ?? "",
          clientEmail: estimate.client?.email ?? "",
          clientPhone: estimate.client?.phone ?? "",
          clientAddress: estimate.client?.address ?? "",
          notes: estimate.notes,
          currency: estimate.currency,
          issueDate: estimate.issueDate.toISOString(),
          validUntil: estimate.validUntil?.toISOString() ?? null,
          taxRate: Number(estimate.taxRate),
          discount: Number(estimate.discount),
          lineItems: estimate.items.map((item) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
          })),
        }}
      />
    </PageScroll>
  );
}
