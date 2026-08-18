import { ProcessPageContent } from "@/features/process/components/process-page-content";
import { requireMember } from "@/lib/auth";
import { getProcessSetupSnapshot } from "@/lib/process/setup";

export default async function ProcessPage() {
  const member = await requireMember();
  const setup = await getProcessSetupSnapshot(member.companyId);
  return <ProcessPageContent setup={setup} />;
}
