import { notFound } from "next/navigation";
import { PublicProjectForm } from "@/features/projects/components/public-project-form";
import { getProjectFormByPublicToken, parseFormFields } from "@/lib/project-forms";

type PageProps = { params: Promise<{ token: string }> };

export default async function PublicFormPage({ params }: PageProps) {
  const { token } = await params;
  const form = await getProjectFormByPublicToken(token);
  if (!form) notFound();

  const fields = parseFormFields(form.fields);
  const alreadySubmitted = form.status === "COMPLETED" || form.submissions.length > 0;

  return (
    <PublicProjectForm
      token={token}
      fields={fields}
      alreadySubmitted={alreadySubmitted}
      formName={form.name}
      companyName={form.project.company.name}
      projectName={form.project.name}
      clientName={form.project.client?.name}
    />
  );
}
