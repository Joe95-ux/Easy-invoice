import { prisma } from "@/lib/db";
import { generatePublicToken } from "@/lib/document-tokens";
import { validateFormAnswers } from "@/lib/form-runtime";
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
} from "@/lib/schemas/project-form";

const DEFAULT_FIELDS: FormFieldDef[] = [
  {
    id: "sec_basics",
    type: "section",
    label: "Project basics",
    required: false,
    description: "Core details that identify the job and define the requested outcome.",
  },
  {
    id: "business_name",
    type: "text",
    label: "Business / project name",
    required: true,
    width: "half",
  },
  { id: "contact_email", type: "email", label: "Contact email", required: true, width: "half" },
  {
    id: "contact_phone",
    type: "phone",
    label: "Phone",
    required: false,
    width: "half",
  },
  {
    id: "goals",
    type: "textarea",
    label: "What do you need completed?",
    required: true,
    width: "full",
    description: "Describe the expected result and any important constraints.",
  },
  {
    id: "urgent",
    type: "yesno",
    label: "Is this time-sensitive?",
    required: false,
    width: "half",
  },
  {
    id: "budget",
    type: "number",
    label: "Approximate budget (optional)",
    required: false,
    width: "half",
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
    width: "full",
    description: "Upload multiple images at once (JPEG, PNG, WebP, or GIF).",
  },
  {
    id: "sec_notes",
    type: "section",
    label: "Final notes",
    required: false,
    description: "Anything else that could affect scope, schedule, or pricing.",
  },
  {
    id: "notes",
    type: "textarea",
    label: "Anything else we should know?",
    required: false,
    width: "full",
  },
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
      { id: "business_name", type: "text", label: "Business name", required: true, width: "half" },
      {
        id: "contact_email",
        type: "email",
        label: "Primary contact email",
        required: true,
        width: "half",
      },
      {
        id: "project_type",
        type: "radio",
        label: "Project type",
        required: true,
        width: "full",
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
        width: "full",
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
        type: "yesno",
        label: "Do you already have a logo?",
        required: false,
        width: "half",
      },
      {
        id: "brand_files",
        type: "images",
        label: "Brand / reference images",
        required: false,
        maxFiles: 10,
        width: "full",
        description: "Logo, moodboards, screenshots, or other visual references.",
        visibleWhen: { fieldId: "logo_status", op: "eq", value: "yes" },
      },
      {
        id: "page_tech",
        type: "page",
        label: "Technical details",
        required: false,
        description: "Access and systems that affect delivery.",
      },
      {
        id: "sec_tech",
        type: "section",
        label: "Technical details",
        required: false,
        description: "Access and systems that affect delivery.",
      },
      { id: "website_url", type: "url", label: "Current website (if any)", required: false, width: "half" },
      { id: "launch", type: "text", label: "Preferred launch timing", required: false, width: "half" },
      {
        id: "features",
        type: "checkbox",
        label: "Features needed",
        required: false,
        width: "full",
        options: [
          { value: "blog", label: "Blog / news" },
          { value: "forms", label: "Contact / lead forms" },
          { value: "booking", label: "Booking / scheduling" },
          { value: "cms", label: "Easy content edits (CMS)" },
          { value: "seo", label: "SEO setup" },
        ],
      },
      {
        id: "hosting",
        type: "textarea",
        label: "Domain & hosting details",
        required: false,
        width: "full",
      },
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
      { id: "project_goal", type: "textarea", label: "Project goal", required: true, width: "full" },
      { id: "audience", type: "textarea", label: "Target audience", required: true, width: "full" },
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
        width: "full",
      },
      {
        id: "moodboard",
        type: "images",
        label: "Moodboard images",
        required: false,
        maxFiles: 12,
        width: "full",
      },
      {
        id: "deliverables",
        type: "checkbox",
        label: "Deliverables needed",
        required: true,
        width: "full",
        options: [
          { value: "logo", label: "Logo" },
          { value: "brand", label: "Brand guidelines" },
          { value: "social", label: "Social templates" },
          { value: "print", label: "Print collateral" },
          { value: "other", label: "Other (describe below)" },
        ],
      },
      { id: "deadline", type: "date", label: "Deadline", required: false, width: "half" },
      {
        id: "notes",
        type: "textarea",
        label: "Anything else?",
        required: false,
        width: "full",
      },
    ],
  },
  {
    name: "General Requirements",
    description: "A simple intake form for any job.",
    fields: DEFAULT_FIELDS,
  },
  {
    name: "Corporate Vendor Onboarding",
    description: "Company details, contacts, and compliance info for new vendors.",
    fields: [
      {
        id: "sec_company",
        type: "section",
        label: "Company details",
        required: false,
        description: "Legal and billing identity for your organization.",
      },
      {
        id: "legal_name",
        type: "text",
        label: "Legal company name",
        required: true,
        width: "half",
      },
      {
        id: "trading_name",
        type: "text",
        label: "Trading / DBA name",
        required: false,
        width: "half",
      },
      {
        id: "registration_no",
        type: "text",
        label: "Company / tax registration number",
        required: true,
        width: "half",
      },
      { id: "vat_no", type: "text", label: "VAT / tax ID", required: false, width: "half" },
      {
        id: "company_website",
        type: "url",
        label: "Company website",
        required: false,
        width: "half",
      },
      {
        id: "hq_address",
        type: "textarea",
        label: "Registered business address",
        required: true,
        width: "full",
      },
      {
        id: "sec_contacts",
        type: "section",
        label: "Key contacts",
        required: false,
        description: "Who we should reach for accounts and operations.",
      },
      {
        id: "primary_contact",
        type: "text",
        label: "Primary contact name",
        required: true,
        width: "half",
      },
      {
        id: "primary_email",
        type: "email",
        label: "Primary contact email",
        required: true,
        width: "half",
      },
      {
        id: "accounts_contact",
        type: "text",
        label: "Accounts payable contact",
        required: false,
        width: "half",
      },
      {
        id: "accounts_email",
        type: "email",
        label: "Accounts payable email",
        required: false,
        width: "half",
      },
      {
        id: "sec_compliance",
        type: "section",
        label: "Compliance & banking",
        required: false,
        description: "Documents and payment details needed to activate the vendor.",
      },
      {
        id: "insurance",
        type: "select",
        label: "Do you hold valid liability insurance?",
        required: true,
        width: "half",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
          { value: "pending", label: "In progress" },
        ],
      },
      {
        id: "payment_terms",
        type: "select",
        label: "Preferred payment terms",
        required: false,
        width: "half",
        options: [
          { value: "net15", label: "Net 15" },
          { value: "net30", label: "Net 30" },
          { value: "net45", label: "Net 45" },
          { value: "other", label: "Other" },
        ],
      },
      {
        id: "docs",
        type: "images",
        label: "Certificates / W-9 / insurance docs",
        required: false,
        maxFiles: 10,
        width: "full",
        description: "Upload clear photos or scans of required documents.",
      },
      {
        id: "notes",
        type: "textarea",
        label: "Anything else we should know?",
        required: false,
        width: "full",
      },
    ],
  },
  {
    name: "Corporate Service Request",
    description: "Internal or client service requests with budget, urgency, and scope.",
    fields: [
      {
        id: "sec_request",
        type: "section",
        label: "Request overview",
        required: false,
        description: "Summarize what you need and why.",
      },
      {
        id: "request_title",
        type: "text",
        label: "Request title",
        required: true,
        width: "full",
      },
      {
        id: "department",
        type: "text",
        label: "Department / business unit",
        required: true,
        width: "half",
      },
      {
        id: "requester_email",
        type: "email",
        label: "Requester email",
        required: true,
        width: "half",
      },
      {
        id: "priority",
        type: "radio",
        label: "Priority",
        required: true,
        width: "full",
        options: [
          { value: "low", label: "Low", description: "Can wait for the next planning cycle" },
          { value: "normal", label: "Normal", description: "Needed within the usual lead time" },
          { value: "urgent", label: "Urgent", description: "Blocking work or a hard deadline" },
        ],
      },
      {
        id: "needed_by",
        type: "date",
        label: "Needed by",
        required: false,
        width: "half",
      },
      {
        id: "budget",
        type: "text",
        label: "Budget range (optional)",
        required: false,
        width: "half",
      },
      {
        id: "sec_scope",
        type: "section",
        label: "Scope & success",
        required: false,
        description: "What good looks like when this request is done.",
      },
      {
        id: "scope",
        type: "textarea",
        label: "Describe the work needed",
        required: true,
        width: "full",
      },
      {
        id: "success",
        type: "textarea",
        label: "Success criteria",
        required: false,
        width: "full",
      },
      {
        id: "attachments",
        type: "images",
        label: "Supporting files / screenshots",
        required: false,
        maxFiles: 8,
        width: "full",
      },
    ],
  },
  {
    name: "Handyman Job Request",
    description: "Service type, property access, and photos for small repair jobs.",
    fields: [
      {
        id: "sec_job",
        type: "section",
        label: "Job details",
        required: false,
        description: "What needs fixing and where.",
      },
      {
        id: "service_type",
        type: "select",
        label: "Type of work",
        required: true,
        width: "half",
        options: [
          { value: "plumbing", label: "Plumbing" },
          { value: "electrical", label: "Electrical" },
          { value: "carpentry", label: "Carpentry / doors" },
          { value: "painting", label: "Painting" },
          { value: "appliance", label: "Appliance" },
          { value: "general", label: "General repairs" },
          { value: "other", label: "Other" },
        ],
      },
      {
        id: "urgency",
        type: "select",
        label: "How urgent is this?",
        required: true,
        width: "half",
        options: [
          { value: "asap", label: "ASAP / emergency" },
          { value: "this_week", label: "This week" },
          { value: "flexible", label: "Flexible" },
        ],
      },
      {
        id: "job_summary",
        type: "textarea",
        label: "Describe the problem",
        required: true,
        width: "full",
        description: "Include what you have already tried, if anything.",
      },
      {
        id: "sec_property",
        type: "section",
        label: "Property & access",
        required: false,
        description: "Help us arrive prepared and get in safely.",
      },
      {
        id: "property_address",
        type: "textarea",
        label: "Job address",
        required: true,
        width: "full",
      },
      {
        id: "property_type",
        type: "select",
        label: "Property type",
        required: false,
        width: "half",
        options: [
          { value: "house", label: "House" },
          { value: "apartment", label: "Apartment / condo" },
          { value: "office", label: "Office / commercial" },
          { value: "other", label: "Other" },
        ],
      },
      {
        id: "preferred_date",
        type: "date",
        label: "Preferred visit date",
        required: false,
        width: "half",
      },
      {
        id: "access_notes",
        type: "textarea",
        label: "Access notes (gate codes, parking, pets)",
        required: false,
        width: "full",
      },
      {
        id: "contact_phone",
        type: "phone",
        label: "Best phone number",
        required: true,
        width: "half",
      },
      {
        id: "contact_email",
        type: "email",
        label: "Email",
        required: false,
        width: "half",
      },
      {
        id: "emergency",
        type: "yesno",
        label: "Is this an emergency / same-day need?",
        required: true,
        width: "half",
      },
      {
        id: "sec_photos",
        type: "section",
        label: "Photos",
        required: false,
        description: "Clear photos of the issue speed up quoting.",
      },
      {
        id: "photos",
        type: "images",
        label: "Photos of the issue",
        required: false,
        maxFiles: 10,
        width: "full",
      },
    ],
  },
  {
    name: "Contractor Site Assessment",
    description: "Site details, drawings, timeline, and budget for contractor bids.",
    fields: [
      {
        id: "sec_project",
        type: "section",
        label: "Project overview",
        required: false,
        description: "High-level scope before a site visit or quote.",
      },
      {
        id: "project_name",
        type: "text",
        label: "Project / site name",
        required: true,
        width: "half",
      },
      {
        id: "work_type",
        type: "select",
        label: "Type of work",
        required: true,
        width: "half",
        options: [
          { value: "renovation", label: "Renovation / remodel" },
          { value: "new_build", label: "New build" },
          { value: "fitout", label: "Commercial fit-out" },
          { value: "repair", label: "Repair / remediation" },
          { value: "other", label: "Other" },
        ],
      },
      {
        id: "scope",
        type: "textarea",
        label: "Scope of work",
        required: true,
        width: "full",
      },
      {
        id: "sec_site",
        type: "section",
        label: "Site information",
        required: false,
        description: "Location, access, and constraints that affect pricing.",
      },
      {
        id: "site_address",
        type: "textarea",
        label: "Site address",
        required: true,
        width: "full",
      },
      {
        id: "site_access",
        type: "textarea",
        label: "Access / parking / working hours",
        required: false,
        width: "full",
      },
      {
        id: "occupied",
        type: "select",
        label: "Is the site occupied during works?",
        required: false,
        width: "half",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
          { value: "partial", label: "Partially" },
        ],
      },
      {
        id: "start_target",
        type: "date",
        label: "Target start date",
        required: false,
        width: "half",
      },
      {
        id: "sec_docs",
        type: "section",
        label: "Plans & budget",
        required: false,
        description: "Share drawings and commercial expectations if available.",
      },
      {
        id: "drawings",
        type: "images",
        label: "Plans / drawings / photos",
        required: false,
        maxFiles: 12,
        width: "full",
      },
      {
        id: "budget",
        type: "text",
        label: "Budget range",
        required: false,
        width: "half",
      },
      {
        id: "decision_date",
        type: "date",
        label: "Decision / award date",
        required: false,
        width: "half",
      },
      {
        id: "contact_name",
        type: "text",
        label: "Site contact name",
        required: true,
        width: "half",
      },
      {
        id: "contact_email",
        type: "email",
        label: "Site contact email",
        required: true,
        width: "half",
      },
    ],
  },
  {
    name: "Small Business Quote Request",
    description: "Fast quote intake for shops, studios, and local service businesses.",
    fields: [
      {
        id: "sec_about",
        type: "section",
        label: "About your business",
        required: false,
        description: "So we can tailor the quote to how you operate.",
      },
      {
        id: "business_name",
        type: "text",
        label: "Business name",
        required: true,
        width: "half",
      },
      {
        id: "contact_name",
        type: "text",
        label: "Your name",
        required: true,
        width: "half",
      },
      {
        id: "email",
        type: "email",
        label: "Email",
        required: true,
        width: "half",
      },
      {
        id: "phone",
        type: "phone",
        label: "Phone",
        required: false,
        width: "half",
      },
      {
        id: "website",
        type: "url",
        label: "Website or social link",
        required: false,
        width: "full",
      },
      {
        id: "sec_need",
        type: "section",
        label: "What you need",
        required: false,
        description: "Describe the product or service you want priced.",
      },
      {
        id: "service_needed",
        type: "textarea",
        label: "What do you need quoted?",
        required: true,
        width: "full",
      },
      {
        id: "quantity",
        type: "number",
        label: "Quantity / units",
        required: false,
        width: "half",
        validation: { min: 1 },
      },
      {
        id: "needed_by",
        type: "date",
        label: "Needed by",
        required: false,
        width: "half",
      },
      {
        id: "references",
        type: "images",
        label: "Reference photos / examples",
        required: false,
        maxFiles: 8,
        width: "full",
      },
      {
        id: "notes",
        type: "textarea",
        label: "Extra notes",
        required: false,
        width: "full",
      },
    ],
  },
  {
    name: "Service Call / Maintenance",
    description: "Equipment details, symptoms, and preferred visit window for maintenance.",
    fields: [
      {
        id: "sec_equipment",
        type: "section",
        label: "Equipment / asset",
        required: false,
        description: "Identify what needs service.",
      },
      {
        id: "asset_name",
        type: "text",
        label: "Equipment / system name",
        required: true,
        width: "half",
      },
      {
        id: "asset_location",
        type: "text",
        label: "Location on site",
        required: true,
        width: "half",
      },
      {
        id: "make_model",
        type: "text",
        label: "Make / model",
        required: false,
        width: "half",
      },
      {
        id: "serial",
        type: "text",
        label: "Serial / asset tag",
        required: false,
        width: "half",
      },
      {
        id: "sec_issue",
        type: "section",
        label: "Issue & schedule",
        required: false,
        description: "Symptoms and when we can attend.",
      },
      {
        id: "symptoms",
        type: "textarea",
        label: "What is happening?",
        required: true,
        width: "full",
      },
      {
        id: "started",
        type: "date",
        label: "When did it start?",
        required: false,
        width: "half",
      },
      {
        id: "preferred_window",
        type: "select",
        label: "Preferred visit window",
        required: false,
        width: "half",
        options: [
          { value: "morning", label: "Morning" },
          { value: "afternoon", label: "Afternoon" },
          { value: "evening", label: "Evening" },
          { value: "any", label: "Any time" },
        ],
      },
      {
        id: "photos",
        type: "images",
        label: "Photos of the issue / nameplate",
        required: false,
        maxFiles: 8,
        width: "full",
      },
      {
        id: "contact_name",
        type: "text",
        label: "On-site contact",
        required: true,
        width: "half",
      },
      {
        id: "contact_phone",
        type: "phone",
        label: "Contact phone",
        required: true,
        width: "half",
      },
    ],
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
  let description = input.description?.trim() || null;

  if (templateId) {
    const template = await prisma.formTemplate.findFirst({
      where: { id: templateId, companyId },
      select: { id: true, name: true, fields: true, description: true },
    });
    if (!template) throw new Error("Template not found");
    const templateFields = parseFormFields(template.fields);
    if (templateFields.length > 0) {
      fields = templateFields;
    }
    if (!description && template.description) {
      description = template.description;
    }
  }

  return prisma.projectForm.create({
    data: {
      projectId,
      templateId,
      name: input.name.trim(),
      description,
      thankYouMessage: input.thankYouMessage?.trim() || null,
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
      ...(input.description !== undefined && {
        description: input.description?.trim() || null,
      }),
      ...(input.thankYouMessage !== undefined && {
        thankYouMessage: input.thankYouMessage?.trim() || null,
      }),
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
          company: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              logoBg: true,
              brandColor: true,
            },
          },
          client: { select: { id: true, name: true, email: true } },
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
  const validationError = validateFormAnswers(fields, input.answers);
  if (validationError) {
    throw new Error(validationError);
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
  const existing = await prisma.formTemplate.findMany({
    where: { companyId },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((template) => template.name));
  const missing = STARTER_TEMPLATES.filter((template) => !existingNames.has(template.name));
  if (missing.length === 0) return;

  await prisma.formTemplate.createMany({
    data: missing.map((template) => ({
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
    description: form.description ?? null,
    thankYouMessage: form.thankYouMessage ?? null,
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
