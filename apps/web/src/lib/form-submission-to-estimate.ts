import { format, parseISO } from "date-fns";
import {
  formatFormAnswerPlain,
  groupFormFieldsIntoSections,
  isAnswerableFormField,
  type FormFieldDef,
} from "@/lib/schemas/project-form";

const MAX_SCOPE_CHARS = 8000;

type FormatSubmissionAsScopeInput = {
  formName: string;
  fields: FormFieldDef[];
  answers: Record<string, string>;
  submitterName?: string | null;
  submitterEmail?: string | null;
};

/** Turn intake Q&A into estimate project-scope text. */
export function formatSubmissionAsScope(input: FormatSubmissionAsScopeInput): string {
  const lines: string[] = [`Intake: ${input.formName}`];

  const submitter = [input.submitterName?.trim(), input.submitterEmail?.trim()]
    .filter(Boolean)
    .join(" · ");
  if (submitter) {
    lines.push(`Submitted by: ${submitter}`);
  }

  lines.push("");

  const sections = groupFormFieldsIntoSections(input.fields);
  const groups =
    sections.length > 0
      ? sections
      : [
          {
            id: "details",
            title: "Details",
            description: null,
            fields: input.fields.filter(isAnswerableFormField),
          },
        ];

  for (const section of groups) {
    lines.push(section.title);
    for (const field of section.fields) {
      const rendered = formatAnswerLine(field, input.answers[field.id]);
      if (!rendered) continue;
      lines.push(`• ${field.label}: ${rendered}`);
    }
    lines.push("");
  }

  const text = lines.join("\n").trim();
  if (text.length <= MAX_SCOPE_CHARS) return text;
  return `${text.slice(0, MAX_SCOPE_CHARS - 1).trimEnd()}…`;
}

function formatAnswerLine(field: FormFieldDef, raw: string | undefined): string | null {
  if (field.type === "date") {
    const value = raw?.trim();
    if (!value) return null;
    try {
      return format(parseISO(value), "PPP");
    } catch {
      return value;
    }
  }

  return formatFormAnswerPlain(field, raw);
}

/** Build a new-estimate URL prefilled from a project form submission. */
export function estimateFromSubmissionUrl(options: {
  projectId: string;
  submissionId: string;
  clientId?: string | null;
}) {
  const params = new URLSearchParams({
    projectId: options.projectId,
    submissionId: options.submissionId,
  });
  if (options.clientId) {
    params.set("clientId", options.clientId);
  }
  return `/estimates/new?${params.toString()}`;
}
