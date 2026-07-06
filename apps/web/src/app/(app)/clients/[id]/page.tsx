import { notFound } from "next/navigation";
import { ClientDetail } from "@/features/clients/components/client-detail";
import { requireMember } from "@/lib/auth";
import { getClientFinancialProfile } from "@/lib/clients/financial-profile";

type PageProps = { params: Promise<{ id: string }> };

export default async function ClientPage({ params }: PageProps) {
  const member = await requireMember();

  const { id } = await params;
  const client = await getClientFinancialProfile(id, member.companyId);
  if (!client) notFound();

  return <ClientDetail client={client} companyName={member.company.name} />;
}
