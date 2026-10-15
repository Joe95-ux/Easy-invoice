import { notFound, redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { canWriteDocuments } from "@/lib/team";
import { getCreditNoteForMember } from "@/lib/credit-notes";
import { PageScroll } from "@/components/app-shell/app-shell";
import { PageBackLink, PageHeader } from "@/components/app-shell/page-header";
import { CreditNoteEditor } from "@/features/credit-notes/components/credit-note-editor";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditCreditNotePage({ params }: PageProps) {
  const member = await requireMember();
  if (!canWriteDocuments(member.role)) redirect("/credit-notes");

  const { id } = await params;
  const creditNote = await getCreditNoteForMember(id, member.companyId);
  if (!creditNote) notFound();
  if (creditNote.status !== "DRAFT") redirect(`/credit-notes/${id}`);

  return (
    <PageScroll>
      <PageBackLink href={`/credit-notes/${id}`}>Back to credit note</PageBackLink>
      <PageHeader title={`Edit ${creditNote.number}`} description="Drafts can be changed until you issue them." />
      <CreditNoteEditor
        creditNoteId={creditNote.id}
        invoiceId={creditNote.invoiceId}
        initial={{
          reason: creditNote.reason ?? "",
          notes: creditNote.notes ?? "",
          issueDate: creditNote.issueDate.toISOString().slice(0, 10),
          lineItems: creditNote.items.map((item) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
          })),
        }}
      />
    </PageScroll>
  );
}
