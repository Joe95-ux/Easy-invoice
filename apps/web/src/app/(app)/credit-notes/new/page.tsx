import { requireMember } from "@/lib/auth";
import { canWriteDocuments } from "@/lib/team";
import { redirect } from "next/navigation";
import { PageScroll } from "@/components/app-shell/app-shell";
import { PageBackLink, PageHeader } from "@/components/app-shell/page-header";
import { CreditNoteEditor } from "@/features/credit-notes/components/credit-note-editor";

type PageProps = { searchParams: Promise<{ invoiceId?: string }> };

export default async function NewCreditNotePage({ searchParams }: PageProps) {
  const member = await requireMember();
  if (!canWriteDocuments(member.role)) redirect("/credit-notes");

  const { invoiceId } = await searchParams;

  return (
    <PageScroll>
      <PageBackLink href={invoiceId ? `/invoices/${invoiceId}` : "/credit-notes"}>
        Back
      </PageBackLink>
      <PageHeader
        title="New credit note"
        description="Reduce the original invoice. Issued credits stay attached to what the client already received."
      />
      <CreditNoteEditor invoiceId={invoiceId} />
    </PageScroll>
  );
}
