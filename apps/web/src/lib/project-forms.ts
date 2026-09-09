import { prisma } from "@/lib/db";
import { generatePublicToken } from "@/lib/document-tokens";
import type {
  CreateFormTemplateInput,
  CreateProjectFormInput,
  FormFieldDef,
  SubmitProjectFormInput,
  UpdateFormTemplateInput,
  UpdateProjectFormInput,
} from "@/lib/schemas/project-form";
import {
  formFieldSchema,
  isAnswerableFormField,
  parseImageAnswer,
} from "@/lib/schemas/project-form";

const DEFAULT_FIELDS: FormFieldDef[] = [
  {
    id: "sec_basics",
    type: "section",
    label: "Project basics",
    required: false,
    description: "Core details that identify the job and define the requested outcome.",
  },
  { id: "business_name", type: "text", label: "Business / project name", required: true },
  { id: "contact_email", type: "email", label: "Contact email", required: true },
  {
    id: "goals",
    type: "textarea",
    label: "What do you need completed?",
    required: true,
    description: "Describe the expected result and any important constraints.",
  },
  {
    id: "sec_files",
    type: "section",
    label: "Files",
    required: false,
    description: "Share logos, brand assets, or supporting images.",
  },
  {
    id: "attachments",
    type: "images",
    label: "Reference images",
    required: false,
    maxFiles: 8,
    description: "Upload multiple images at once (JPEG, PNG, WebP, or GIF).",
  },
  {
    id: "sec_notes",
    type: "section",
    label: "Final notes",
    required: false,
    description: "Anything else that could affect scope, schedule, or pricing.",
  },
  { id: "notes", type: "textarea", label: "Anything else we should know?", required: false },
];

const STARTER_TEMPLATES: Array<{
  name: string;
  description: string;
  fields: FormFieldDef[];
}> = [
  {
    name: "Website Requirements",
    description: "Pages, brand assets, hosting, and launch goals for a website build.",
    fields: [
      {
        id: "sec_basics",
        type: "section",
        label: "Project basics",
        required: false,
        description: "Identify the business and what the website should achieve.",
      },
      { id: "business_name", type: "text", label: "Business name", required: true },
      { id: "contact_email", type: "email", label: "Primary contact email", required: true },
      {
        id: "project_type",
        type: "radio",
        label: "Project type",
        required: true,
        options: [
          { value: "website", label: "Website", description: "New site, redesign, or landing page" },
          { value: "store", label: "Online store", description: "Products, payments, and shipping" },
          { value: "custom", label: "Custom work", description: "App, integration, or other build" },
        ],
      },
      {
        id: "pages",
        type: "textarea",
        label: "Pages / sections needed",
        required: true,
      },
      {
        id: "sec_brand",
        type: "section",
        label: "Brand & content",
        required: false,
        description: "What already exists and what still needs to be produced.",
      },
      {
        id: "logo_status",
        type: "select",
        label: "Do you have a logo?",
        required: false,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
          { value: "update", label: "Needs updating" },
        ],
      },
      {
        id: "brand_files",
        type: "images",
        label: "Brand / reference images",
        required: false,
        maxFiles: 10,
        description: "Logo, moodboards, screenshots, or other visual references.",
      },
      {
        id: "sec_tech",
        type: "section",
        label: "Technical details",
        required: false,
        description: "Access and systems that affect delivery.",
      },
      { id: "website_url", type: "url", label: "Current website (if any)", required: false },
      {
        id: "hosting",
        type: "textarea",
        label: "Domain & hosting details",
        required: false,
      },
      { id: "launch", type: "text", label: "Preferred launch timing", required: false },
    ],
  },
  {
    name: "Design Brief",
    description: "Audience, style references, and deliverables for design work.",
    fields: [
      {
        id: "sec_goal",
        type: "section",
        label: "Project goal",
        required: false,
        description: "Clarify the outcome before exploring style.",
      },
      { id: "project_goal", type: "textarea", label: "Project goal", required: true },
      { id: "audience", type: "textarea", label: "Target audience", required: true },
      {
        id: "sec_style",
        type: "section",
        label: "Style & deliverables",
        required: false,
        description: "References and what you need delivered.",
      },
      {
        id: "references",
        type: "textarea",
        label: "Style references / links",
        required: false,
      },
      {
        id: "moodboard",
        type: "images",
        label: "Moodboard images",
        required: false,
        maxFiles: 12,
      },
      { id: "deliverables", type: "textarea", label: "Deliverables needed", required: true },
      { id: "deadline", type: "text", label: "Deadline", required: false },
    ],
  },
  {
    name: "General Requirements",
    description: "A simple intake form for any job.",
    fields: DEFAULT_FIELDS,
  },
];

export function defaultIntakeFields(): FormFieldDef[] {
  return DEFAULT_FIELDS.map((field) => ({
    ...field,
    options: field.options?.map((option) => ({ ...option })),
  }));
}

export function parseFormFields(fields: unknown): FormFieldDef[] {
  if (!Array.isArray(fields)) return [];
  const parsed: FormFieldDef[] = [];
  for (const field of fields) {
    const result = formFieldSchema.safeParse(field);
    if (result.success) parsed.push(result.data);
  }
  return parsed;
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
      template: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProjectFormForCompany(
  companyId: string,
  projectId: string,
  formId: string,
) {
  return prisma.projectForm.findFirst({
    where: { id: formId, projectId, project: { companyId } },
    include: {
      submissions: { orderBy: { submittedAt: "desc" } },
      _count: { select: { submissions: true } },
      template: { select: { id: true, name: true } },
    },
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

  let fields: FormFieldDef[] = input.fields?.length
    ? input.fields
    : defaultIntakeFields();
  const templateId: string | null = input.templateId ?? null;

  if (templateId) {
    const template = await prisma.formTemplate.findFirst({
      where: { id: templateId, companyId },
      select: { id: true, name: true, fields: true },
    });
    if (!template) throw new Error("Template not found");
    const templateFields = parseFormFields(template.fields);
    if (templateFields.length > 0) {
      fields = templateFields;
    }
  }

  return prisma.projectForm.create({
    data: {
      projectId,
      templateId,
      name: input.name.trim(),
      fields,
      status: "DRAFT",
    },
    include: {
      submissions: { orderBy: { submittedAt: "desc" } },
      _count: { select: { submissions: true } },
      template: { select: { id: true, name: true } },
    },
  });
}

export async function updateProjectForm(
  companyId: string,
  projectId: string,
  formId: string,
  input: UpdateProjectFormInput,
) {
  const existing = await prisma.projectForm.findFirst({
    where: { id: formId, projectId, project: { companyId } },
    select: { id: true, status: true, _count: { select: { submissions: true } } },
  });
  if (!existing) return null;

  if (input.fields && existing.status !== "DRAFT") {
    throw new Error("Fields can only be edited while the form is a draft");
  }
  if (input.status === "CANCELLED") {
    if (existing.status === "COMPLETED") {
      throw new Error("Completed forms cannot be cancelled");
    }
    if (existing.status === "CANCELLED") {
      return prisma.projectForm.findFirst({
        where: { id: formId },
        include: {
          _count: { select: { submissions: true } },
          template: { select: { id: true, name: true } },
        },
      });
    }
  } else if (input.status !== undefined && input.status !== existing.status) {
    throw new Error("Invalid status change");
  }

  return prisma.projectForm.update({
    where: { id: formId },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.fields !== undefined && { fields: input.fields }),
      ...(input.status === "CANCELLED" && {
        status: "CANCELLED" as const,
        publicToken: null,
      }),
    },
    include: {
      _count: { select: { submissions: true } },
      template: { select: { id: true, name: true } },
    },
  });
}

export async function deleteProjectForm(
  companyId: string,
  projectId: string,
  formId: string,
) {
  const existing = await prisma.projectForm.findFirst({
    where: { id: formId, projectId, project: { companyId } },
    select: { id: true },
  });
  if (!existing) return false;

  await prisma.projectForm.delete({ where: { id: formId } });
  return true;
}

export async function ensureProjectFormShareLink(companyId: string, formId: string) {
  const form = await prisma.projectForm.findFirst({
    where: { id: formId, project: { companyId } },
    select: { id: true, publicToken: true, status: true, fields: true },
  });
  if (!form) return null;
  if (form.status === "CANCELLED") throw new Error("Cancelled forms cannot be shared");
  if (form.status === "COMPLETED") throw new Error("Completed forms cannot be re-shared");

  const fields = parseFormFields(form.fields);
  if (fields.length === 0) throw new Error("Add at least one field before sharing");

  if (form.publicToken) {
    if (form.status === "DRAFT") {
      return prisma.projectForm.update({
        where: { id: form.id },
        data: { status: "SENT", sentAt: new Date() },
        include: {
          _count: { select: { submissions: true } },
          template: { select: { id: true, name: true } },
        },
      });
    }
    return prisma.projectForm.findFirst({
      where: { id: form.id },
      include: {
        _count: { select: { submissions: true } },
        template: { select: { id: true, name: true } },
      },
    });
  }

  return prisma.projectForm.update({
    where: { id: form.id },
    data: {
      publicToken: generatePublicToken(),
      status: "SENT",
      sentAt: new Date(),
    },
    include: {
      _count: { select: { submissions: true } },
      template: { select: { id: true, name: true } },
    },
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
    select: {
      id: true,
      name: true,
      status: true,
      fields: true,
      project: {
        select: {
          id: true,
          name: true,
          companyId: true,
          client: { select: { name: true } },
        },
      },
    },
  });
  if (!form) throw new Error("Form not found");
  if (form.status === "CANCELLED") {
    throw new Error("This form is no longer accepting responses");
  }
  if (form.status === "COMPLETED") {
    throw new Error("This form has already been submitted");
  }
  if (form.status === "DRAFT") {
    throw new Error("This form is not open for responses yet");
  }

  const fields = parseFormFields(form.fields);
  for (const field of fields) {
    if (!isAnswerableFormField(field) || !field.required) continue;
    const value = input.answers[field.id];
    if (field.type === "images") {
      if (parseImageAnswer(value).length === 0) {
        throw new Error(`${field.label} is required`);
      }
      continue;
    }
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`${field.label} is required`);
    }
  }

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

  const submitter =
    input.submitterName?.trim() ||
    input.submitterEmail?.trim() ||
    form.project.client?.name ||
    "Someone";

  return {
    submission,
    notify: {
      companyId: form.project.companyId,
      projectId: form.project.id,
      projectName: form.project.name,
      formId: form.id,
      formName: form.name,
      submitter,
      submissionId: submission.id,
    },
  };
}

export async function ensureStarterFormTemplates(companyId: string) {
  const count = await prisma.formTemplate.count({ where: { companyId } });
  if (count > 0) return;

  await prisma.formTemplate.createMany({
    data: STARTER_TEMPLATES.map((template) => ({
      companyId,
      name: template.name,
      description: template.description,
      fields: template.fields,
    })),
  });
}

export async function listFormTemplates(companyId: string) {
  await ensureStarterFormTemplates(companyId);
  return prisma.formTemplate.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
}

export async function createFormTemplate(companyId: string, input: CreateFormTemplateInput) {
  return prisma.formTemplate.create({
    data: {
      companyId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      fields: input.fields,
    },
  });
}

export async function updateFormTemplate(
  companyId: string,
  templateId: string,
  input: UpdateFormTemplateInput,
) {
  const existing = await prisma.formTemplate.findFirst({
    where: { id: templateId, companyId },
    select: { id: true },
  });
  if (!existing) return null;

  return prisma.formTemplate.update({
    where: { id: templateId },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.description !== undefined && {
        description: input.description?.trim() || null,
      }),
      ...(input.fields !== undefined && { fields: input.fields }),
    },
  });
}

export async function deleteFormTemplate(companyId: string, templateId: string) {
  const existing = await prisma.formTemplate.findFirst({
    where: { id: templateId, companyId },
    select: { id: true },
  });
  if (!existing) return false;
  await prisma.formTemplate.delete({ where: { id: templateId } });
  return true;
}

export function serializeFormTemplate(
  template: Awaited<ReturnType<typeof listFormTemplates>>[number],
) {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    fields: parseFormFields(template.fields),
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
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
    templateId: form.templateId,
    templateName: form.template?.name ?? null,
    fieldCount: parseFormFields(form.fields).filter(isAnswerableFormField).length,
    sentAt: form.sentAt?.toISOString() ?? null,
    completedAt: form.completedAt?.toISOString() ?? null,
    createdAt: form.createdAt.toISOString(),
  };
}

export function serializeProjectFormDetail(
  form: NonNullable<Awaited<ReturnType<typeof getProjectFormForCompany>>>,
) {
  const fields = parseFormFields(form.fields);
  return {
    ...serializeProjectForm(form),
    fields,
    submissions: form.submissions.map((submission) => ({
      id: submission.id,
      answers:
        submission.answers && typeof submission.answers === "object"
          ? (submission.answers as Record<string, string>)
          : {},
      submitterName: submission.submitterName,
      submitterEmail: submission.submitterEmail,
      submittedAt: submission.submittedAt.toISOString(),
    })),
  };
}

/** Load a form submission for estimate scope prefill (company-scoped). */
export async function getFormSubmissionForEstimatePrefill(
  companyId: string,
  submissionId: string,
) {
  const submission = await prisma.formSubmission.findFirst({
    where: {
      id: submissionId,
      projectForm: { project: { companyId } },
    },
    select: {
      id: true,
      answers: true,
      submitterName: true,
      submitterEmail: true,
      projectForm: {
        select: {
          id: true,
          name: true,
          fields: true,
          project: {
            select: {
              id: true,
              clientId: true,
            },
          },
        },
      },
    },
  });
  if (!submission) return null;

  const answers =
    submission.answers && typeof submission.answers === "object"
      ? (submission.answers as Record<string, string>)
      : {};

  return {
    submissionId: submission.id,
    formId: submission.projectForm.id,
    formName: submission.projectForm.name,
    fields: parseFormFields(submission.projectForm.fields),
    answers,
    submitterName: submission.submitterName,
    submitterEmail: submission.submitterEmail,
    projectId: submission.projectForm.project.id,
    clientId: submission.projectForm.project.clientId,
  };
}
