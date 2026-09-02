import { notFound } from "next/navigation";
import { PublicProjectForm } from "@/features/projects/components/public-project-form";
import { getProjectFormByPublicToken } from "@/lib/project-forms";
import type { FormFieldDef } from "@/lib/schemas/project-form";

type PageProps = { params: Promise<{ token: string }> };

export default async function PublicFormPage({ params }: PageProps) {
  const { token } = await params;
  const form = await getProjectFormByPublicToken(token);
  if (!form) notFound();

  const fields = Array.isArray(form.fields) ? (form.fields as FormFieldDef[]) : [];
  const alreadySubmitted = form.status === "COMPLETED" || form.submissions.length > 0;

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="mx-auto w-full max-w-xl">
        <p className="mb-2 text-sm text-muted-foreground">{form.project.company.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{form.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          For project {form.project.name}
          {form.project.client?.name ? ` · ${form.project.client.name}` : ""}
        </p>

        <div className="mt-8">
          <PublicProjectForm
            token={token}
            fields={fields}
            alreadySubmitted={alreadySubmitted}
          />
        </div>
      </div>
    </main>
  );
}
