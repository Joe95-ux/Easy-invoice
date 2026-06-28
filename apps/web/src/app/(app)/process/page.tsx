import { ProcessPageContent } from "@/features/process/components/process-page-content";
import { requireMember } from "@/lib/auth";

export default async function ProcessPage() {
  await requireMember();
  return <ProcessPageContent />;
}
