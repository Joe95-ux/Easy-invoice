import { requireWriter } from "@/lib/auth";
import { NewClientPageContent } from "./new-client-page-content";

export default async function NewClientPage() {
  await requireWriter();
  return <NewClientPageContent />;
}
