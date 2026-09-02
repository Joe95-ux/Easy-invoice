import { requireMember } from "@/lib/auth";
import { getClientsForMember } from "@/lib/clients";
import { NewProjectForm } from "@/features/projects/components/new-project-form";

export default async function NewProjectPage() {
  const member = await requireMember();
  const clients = await getClientsForMember(member.companyId);

  return (
    <NewProjectForm clients={clients} defaultCurrency={member.company.currency} />
  );
}
