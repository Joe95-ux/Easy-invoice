import { newFormFieldId } from "@/lib/project-form-ids";
import type { FormFieldDef, FormFieldSectionGroup, FormFieldType } from "@/lib/schemas/project-form";

export const FIELD_LIBRARY: Array<{
  type: FormFieldType;
  label: string;
  icon: string;
  hint: string;
}> = [
  { type: "text", label: "Short answer", icon: "T", hint: "Single-line text" },
  { type: "textarea", label: "Long answer", icon: "¶", hint: "Multi-line text" },
  { type: "email", label: "Email", icon: "@", hint: "Email address" },
  { type: "url", label: "URL", icon: "↗", hint: "Website link" },
  { type: "date", label: "Date", icon: "◷", hint: "Pick a date" },
  { type: "select", label: "Dropdown", icon: "⌄", hint: "Choose one from a list" },
  { type: "radio", label: "Multiple choice", icon: "◉", hint: "Choice cards" },
  { type: "images", label: "File upload", icon: "↥", hint: "Image uploads" },
  { type: "section", label: "Section", icon: "§", hint: "Group related questions" },
];

export function fieldTypeLabel(type: FormFieldType): string {
  return FIELD_LIBRARY.find((item) => item.type === type)?.label ?? type;
}

function defaultOptions() {
  return [
    { value: "option_a", label: "Option A", description: "Optional detail" },
    { value: "option_b", label: "Option B", description: "Optional detail" },
    { value: "option_c", label: "Option C", description: "Optional detail" },
  ];
}

export function buildFormField(type: FormFieldType): FormFieldDef {
  const base: FormFieldDef = {
    id: newFormFieldId(),
    type,
    label: type === "section" ? "New section" : "New question",
    required: false,
  };
  if (type === "select" || type === "radio") {
    base.options = defaultOptions();
  }
  if (type === "images") {
    base.maxFiles = 8;
  }
  if (type === "section") {
    base.description = "Short description for this section";
  }
  if (type === "text") {
    base.description = null;
  }
  return base;
}

/** Half-width in the public fill UI (and canvas preview). */
export function isHalfWidthField(type: FormFieldType) {
  return type === "text" || type === "email" || type === "url" || type === "date" || type === "select";
}

export function placeholderForField(field: FormFieldDef): string {
  switch (field.type) {
    case "email":
      return "name@example.com";
    case "url":
      return "https://";
    case "date":
      return "Select a date";
    case "select":
      return "Select an option";
    case "textarea":
      return field.description?.trim() || "Write your answer…";
    case "images":
      return `Upload up to ${field.maxFiles ?? 8} images`;
    default:
      return field.description?.trim() || "Your answer";
  }
}

/**
 * Group fields for the builder canvas. Keeps empty sections visible
 * (unlike the public fill helper, which drops empty groups).
 */
export function groupFieldsForBuilder(fields: FormFieldDef[]): FormFieldSectionGroup[] {
  const groups: FormFieldSectionGroup[] = [];
  let current: FormFieldSectionGroup | null = null;

  function ensureIntro() {
    if (!current) {
      current = {
        id: "__intro__",
        title: "Questions",
        description: "Add a section to organize this form.",
        fields: [],
      };
    }
  }

  for (const field of fields) {
    if (field.type === "section") {
      if (current) groups.push(current);
      current = {
        id: field.id,
        title: field.label,
        description: field.description ?? null,
        fields: [],
      };
      continue;
    }
    ensureIntro();
    current!.fields.push(field);
  }

  if (current) groups.push(current);
  return groups;
}

export function countAnswerable(fields: FormFieldDef[]) {
  return fields.filter((field) => field.type !== "section").length;
}

/** Fresh ids so applying a template never collides with prior field ids. */
export function cloneFieldsWithNewIds(fields: FormFieldDef[]): FormFieldDef[] {
  return fields.map((field) => ({
    ...field,
    id: newFormFieldId(),
    options: field.options?.map((option) => ({
      ...option,
      value: newFormFieldId(),
    })),
  }));
}

/** Ensure the canvas has at least one section marker for layout. */
export function ensureBuilderSections(fields: FormFieldDef[]): {
  fields: FormFieldDef[];
  changed: boolean;
} {
  if (fields.some((field) => field.type === "section")) {
    return { fields, changed: false };
  }
  if (fields.length === 0) {
    return {
      fields: [
        {
          id: newFormFieldId(),
          type: "section",
          label: "Project basics",
          required: false,
          description: "Core details for this request.",
        },
      ],
      changed: true,
    };
  }
  return {
    fields: [
      {
        id: newFormFieldId(),
        type: "section",
        label: "Questions",
        required: false,
        description: "Details to collect from the client.",
      },
      ...fields,
    ],
    changed: true,
  };
}

export function moveFieldInList(
  fields: FormFieldDef[],
  fromId: string,
  targetId: string,
  position: "before" | "after",
): FormFieldDef[] {
  const fromIndex = fields.findIndex((field) => field.id === fromId);
  if (fromIndex < 0) return fields;
  const without = fields.filter((field) => field.id !== fromId);
  let targetIndex = without.findIndex((field) => field.id === targetId);
  if (targetIndex < 0) return fields;
  if (position === "after") targetIndex += 1;
  const next = [...without];
  next.splice(targetIndex, 0, fields[fromIndex]!);
  return next;
}

export function insertFieldAfter(
  fields: FormFieldDef[],
  afterId: string | null,
  field: FormFieldDef,
): FormFieldDef[] {
  if (!afterId) return [...fields, field];
  const index = fields.findIndex((item) => item.id === afterId);
  if (index < 0) return [...fields, field];
  const next = [...fields];
  next.splice(index + 1, 0, field);
  return next;
}

export function insertFieldAtSectionEnd(
  fields: FormFieldDef[],
  sectionId: string,
  field: FormFieldDef,
): FormFieldDef[] {
  if (sectionId === "__intro__") {
    const firstSection = fields.findIndex((item) => item.type === "section");
    if (firstSection < 0) return [...fields, field];
    const next = [...fields];
    next.splice(firstSection, 0, field);
    return next;
  }

  const sectionIndex = fields.findIndex((item) => item.id === sectionId);
  if (sectionIndex < 0) return [...fields, field];

  let insertAt = sectionIndex + 1;
  while (insertAt < fields.length && fields[insertAt]!.type !== "section") {
    insertAt += 1;
  }
  const next = [...fields];
  next.splice(insertAt, 0, field);
  return next;
}
