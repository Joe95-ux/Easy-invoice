import { notFound, redirect } from "next/navigation";
import { AdvancedFormBuilder } from "@/features/projects/components/advanced-form-builder/advanced-form-builder";
import { requireMember } from "@/lib/auth";
import {
  getProjectFormForCompany,
  serializeProjectFormDetail,
} from "@/lib/project-forms";
import { getProjectForCompany } from "@/lib/projects";

type PageProps = {
  params: Promise<{ id: string; formId: string }>;
};

export default async function AdvancedFormBuilderPage({ params }: PageProps) {
  const member = await requireMember();
  const { id: projectId, formId } = await params;

  const [project, form] = await Promise.all([
    getProjectForCompany(projectId, member.companyId),
    getProjectFormForCompany(member.companyId, projectId, formId),
  ]);

  if (!project) notFound();
  if (!form) notFound();

  // Only drafts belong in the advanced builder for field edits; still allow view/rename.
  if (form.status === "CANCELLED") {
    redirect(`/projects/${projectId}`);
  }

  const detail = serializeProjectFormDetail(form);

  return (
    <AdvancedFormBuilder
      projectId={projectId}
      projectName={project.name}
      formId={detail.id}
      initialName={detail.name}
      initialStatus={detail.status}
      initialFields={detail.fields}
      initialPublicToken={detail.publicToken}
      templateName={form.template?.name ?? null}
    />
  );
}
