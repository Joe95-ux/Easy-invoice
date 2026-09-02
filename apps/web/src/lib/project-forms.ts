import { prisma } from "@/lib/db";
import { generatePublicToken } from "@/lib/document-tokens";
import type { CreateProjectFormInput, SubmitProjectFormInput } from "@/lib/schemas/project-form";

const DEFAULT_FIELDS = [
  { id: "business_name", type: "text", label: "Business name", required: true },
  { id: "contact_email", type: "email", label: "Contact email", required: true },
  { id: "goals", type: "textarea", label: "Goals / requirements", required: true },
  { id: "notes", type: "textarea", label: "Anything else?", required: false },
] as const;

export function defaultIntakeFields() {
  return DEFAULT_FIELDS.map((field) => ({ ...field }));
}

export async function listProjectForms(companyId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
    select: { id: true },
  });
  if (!project) return [];

  return prisma.projectForm.findMany({
    where: { projectId },
    include: {
      _count: { select: { submissions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createProjectForm(
  companyId: string,
  projectId: string,
  input: CreateProjectFormInput,
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
    select: { id: true },
  });
  if (!project) throw new Error("Project not found");

  let fields: CreateProjectFormInput["fields"] = input.fields?.length
    ? input.fields
    : defaultIntakeFields();
  let templateId: string | null = input.templateId ?? null;

  if (templateId) {
    const template = await prisma.formTemplate.findFirst({
      where: { id: templateId, companyId },
      select: { id: true, name: true, fields: true },
    });
    if (!template) throw new Error("Template not found");
    if (Array.isArray(template.fields) && template.fields.length > 0) {
      fields = template.fields as NonNullable<CreateProjectFormInput["fields"]>;
    }
  }

  return prisma.projectForm.create({
    data: {
      projectId,
      templateId,
      name: input.name.trim(),
      fields: fields ?? defaultIntakeFields(),
      status: "DRAFT",
    },
    include: { _count: { select: { submissions: true } } },
  });
}

export async function ensureProjectFormShareLink(companyId: string, formId: string) {
  const form = await prisma.projectForm.findFirst({
    where: { id: formId, project: { companyId } },
    select: { id: true, publicToken: true, status: true },
  });
  if (!form) return null;

  if (form.publicToken) {
    if (form.status === "DRAFT") {
      return prisma.projectForm.update({
        where: { id: form.id },
        data: { status: "SENT", sentAt: new Date() },
        include: { _count: { select: { submissions: true } } },
      });
    }
    return prisma.projectForm.findFirst({
      where: { id: form.id },
      include: { _count: { select: { submissions: true } } },
    });
  }

  return prisma.projectForm.update({
    where: { id: form.id },
    data: {
      publicToken: generatePublicToken(),
      status: form.status === "DRAFT" ? "SENT" : form.status,
      sentAt: form.status === "DRAFT" ? new Date() : undefined,
    },
    include: { _count: { select: { submissions: true } } },
  });
}

export async function getProjectFormByPublicToken(token: string) {
  return prisma.projectForm.findFirst({
    where: { publicToken: token },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          company: { select: { id: true, name: true } },
          client: { select: { id: true, name: true } },
        },
      },
      submissions: {
        orderBy: { submittedAt: "desc" },
        take: 1,
      },
    },
  });
}

export async function submitProjectFormByToken(token: string, input: SubmitProjectFormInput) {
  const form = await prisma.projectForm.findFirst({
    where: { publicToken: token },
    select: { id: true, status: true, fields: true },
  });
  if (!form) throw new Error("Form not found");
  if (form.status === "CANCELLED") throw new Error("This form is no longer accepting responses");

  const submission = await prisma.formSubmission.create({
    data: {
      projectFormId: form.id,
      answers: input.answers,
      submitterName: input.submitterName?.trim() || null,
      submitterEmail: input.submitterEmail?.trim() || null,
    },
  });

  await prisma.projectForm.update({
    where: { id: form.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });

  return submission;
}

export function serializeProjectForm(
  form: Awaited<ReturnType<typeof listProjectForms>>[number],
) {
  return {
    id: form.id,
    name: form.name,
    status: form.status,
    publicToken: form.publicToken,
    submissionCount: form._count.submissions,
    sentAt: form.sentAt?.toISOString() ?? null,
    completedAt: form.completedAt?.toISOString() ?? null,
    createdAt: form.createdAt.toISOString(),
  };
}
